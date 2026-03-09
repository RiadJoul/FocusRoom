import ActivityKit
import WidgetKit
import SwiftUI

// Must mirror the struct defined in `MissionStateModule.swift`
@available(iOS 16.1, *)
struct FlightAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// When the session is expected to end.
    var endTime: Date
    /// Coarse mission progress (0.0–1.0)
    var progress: Double
  }

  /// Route or mission name – e.g. "Earth → Mars"
  var name: String

  /// Total duration of the mission in seconds.
  var durationSeconds: Int
}


@available(iOSApplicationExtension 16.1, *)
struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FlightAttributes.self) { context in
            let endTime = context.state.endTime
            let rawProgress = context.state.progress
            let progress = max(0.0, min(rawProgress, 1.0))

            let parts = context.attributes.name.components(separatedBy: "→")
            let originNameRaw = parts.first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let destinationNameRaw = (parts.count > 1 ? parts.last : nil)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            let originName = originNameRaw.isEmpty ? context.attributes.name : originNameRaw
            let destinationBase = destinationNameRaw.isEmpty ? originName : destinationNameRaw

            let originCode = airportCode(from: originName)
            let destinationCode = airportCode(from: destinationBase)

            ZStack {
                Color(hex: "#0b0e0f")

                VStack(spacing: 12) {
                    // Top row
                    HStack {
                        Spacer()
                        HStack(spacing: 6) {
                            Text("🛰️")
                                .font(.system(size: 18, weight: .semibold))
                        }
                        Spacer()
                    }

                    // Middle row
                    HStack(alignment: .center, spacing: 10) {
                        Text(originCode)
                            .font(.custom("Poppins-SemiBold", size: 20))
                            .foregroundColor(.white)

                        let segmentCount = 30
                        let filledCount = Int(round(progress * Double(segmentCount)))

                        HStack(spacing: 3) {
                            ForEach(0..<segmentCount, id: \.self) { index in
                                Capsule()
                                    .fill(index < filledCount ? Color(hex: "#a855f7") : Color.white.opacity(0.3))
                                    .frame(width: 5, height: 18)
                            }
                        }

                        Text(destinationCode)
                            .font(.custom("Poppins-SemiBold", size: 20))
                            .foregroundColor(.white)
                    }

                    // Bottom area - FIXED ALIGNMENT
                    HStack(alignment: .bottom) {
                        // Status on the far left
                        VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 6, height: 6)
                            Text("ON TIME")
                                .font(.custom("Poppins-SemiBold", size: 10))
                                .foregroundColor(Color.green.opacity(0.9))
                        }
                        Text("STATUS")
                                .font(.custom("Poppins-SemiBold", size: 10))
                                .foregroundColor(Color.white.opacity(0.7))
                        }
                        
                        Spacer() // This forces the items to opposite sides

                        // Timer on the far right
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("TIME LEFT")
                                .font(.custom("Poppins-SemiBold", size: 10))
                                .foregroundColor(Color.white.opacity(0.7))
                            Text(endTime, style: .timer)
                                .font(.custom("Poppins-Medium", size: 13))
                                .foregroundColor(Color.white.opacity(0.9))
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        } dynamicIsland: { context in
            let endTime = context.state.endTime
            return DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 6) {
                        Text("Focus mission")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.white)
                        HStack(spacing: 8) {
                            Image(systemName: "airplane")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Color.white)
                            Text(context.attributes.name)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color.white.opacity(0.9))
                            Spacer(minLength: 4)
                            Text(endTime, style: .timer)
                                .font(.system(size: 13, weight: .medium))
                                .monospacedDigit()
                                .foregroundColor(Color(red: 129/255, green: 140/255, blue: 248/255))
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "airplane").foregroundStyle(Color.white)
            } compactTrailing: {
                Text(endTime, style: .timer).monospacedDigit()
            } minimal: {
                Image(systemName: "airplane")
            }
        }
    }
}

@available(iOSApplicationExtension 16.1, *)
extension FlightAttributes {
  fileprivate static var preview: FlightAttributes {
    FlightAttributes(
      name: "Earth → Mars",
      durationSeconds: 45 * 60
    )
  }
}

@available(iOSApplicationExtension 16.1, *)
extension FlightAttributes.ContentState {
  fileprivate static var previewState: FlightAttributes.ContentState {
    FlightAttributes.ContentState(
      endTime: Date().addingTimeInterval(45 * 60),
      progress: 0.5
    )
  }
}

@available(iOSApplicationExtension 16.1, *)
#Preview("Focus flight", as: .content, using: FlightAttributes.preview) {
  WidgetLiveActivity()
} contentStates: {
  FlightAttributes.ContentState.previewState
}

// MARK: - Helpers

/// Creates a short "code" from a planet or location name, e.g. "Earth" → "EAR".
fileprivate func airportCode(from name: String) -> String {
  let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty { return "FOC" }

  let letters = trimmed.unicodeScalars.filter { CharacterSet.letters.contains($0) }
  var upper = String(String.UnicodeScalarView(letters)).uppercased()

  if upper.isEmpty { upper = "FOC" }
  if upper.count >= 3 {
    return String(upper.prefix(3))
  }

  // If we have fewer than 3 letters, pad with the last letter.
  let last = upper.last ?? "C"
  while upper.count < 3 {
    upper.append(last)
  }
  return upper
}
