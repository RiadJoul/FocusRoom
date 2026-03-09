import Foundation
import WidgetKit
import ActivityKit

// MARK: - Shared Flight Live Activity attributes
//
// This type **must** have the same name and structure in both the main app target
// and the widget extension target so that ActivityKit can render the Live Activity.
@available(iOS 16.1, *)
struct FlightAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// When the current focus session is expected to end.
    var endTime: Date
    /// Coarse progress of the mission, 0.0–1.0
    var progress: Double
  }

  /// Route or trip name – e.g. "Earth → Mars".
  var name: String

  /// Total duration of the session in seconds.
  var durationSeconds: Int
}

@objc(MissionStateModule)
class MissionStateModule: NSObject {

  // MARK: - Shared storage

  private let appGroupId = "group.com.anonymous.focusRoom"

  private func sharedDefaults() -> UserDefaults? {
    UserDefaults(suiteName: appGroupId)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Today tasks snapshot for Home Screen widget

  @objc
  func setTodayTasks(_ titles: [String]) {
    sharedDefaults()?.set(titles, forKey: "today_tasks_titles")
    if #available(iOS 16.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "widget")
    }
  }

  // MARK: - Habit heatmap snapshot for Habit widget

  @objc
  func setHabitSnapshot(_ levels: [NSNumber]) {
    sharedDefaults()?.set(levels, forKey: "habit_levels")
    if #available(iOS 16.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "habit")
    }
  }

  // MARK: - Live Activity (Flight) control

  /// Start a flight Live Activity for the current focus session.
  /// - Parameters:
  ///   - title: Route or trip name (e.g. "Earth → Mars").
  ///   - endTimestampSeconds: UNIX timestamp (seconds) when the session is expected to end.
  @objc
  func startLiveActivity(_ title: String, endTimestampSeconds: NSNumber) {
    guard #available(iOS 16.1, *) else { return }

    let endDate = Date(timeIntervalSince1970: endTimestampSeconds.doubleValue)
    let remainingSeconds = max(endDate.timeIntervalSinceNow, 0)

    let attributes = FlightAttributes(
      name: title,
      durationSeconds: Int(remainingSeconds)
    )
    let initialState = FlightAttributes.ContentState(
      endTime: endDate,
      progress: 0.0
    )

    do {
      _ = try Activity<FlightAttributes>.request(
        attributes: attributes,
        contentState: initialState,
        pushType: nil
      )
    } catch {
      NSLog("Failed to start Live Activity: \(error.localizedDescription)")
    }
  }

  /// End any active flight Live Activities immediately.
  @objc
  func endLiveActivities() {
    guard #available(iOS 16.1, *) else { return }

    Task {
      for activity in Activity<FlightAttributes>.activities {
        await activity.end(dismissalPolicy: .immediate)
      }
    }
  }

  /// Update the coarse mission progress (0.0–1.0) for all active Live Activities.
  /// Intended to be called at a low frequency (e.g. every 10% of the session).
  @objc
  func updateLiveActivityProgress(_ progress: NSNumber) {
    guard #available(iOS 16.1, *) else { return }

    let clamped = max(0.0, min(progress.doubleValue, 1.0))

    Task {
      for activity in Activity<FlightAttributes>.activities {
        var state = activity.contentState
        state.progress = clamped
        await activity.update(using: state)
      }
    }
  }
}
