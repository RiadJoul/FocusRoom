import WidgetKit
import SwiftUI

private let habitAppGroupId = "group.com.anonymous.focusRoom"
private let habitLevelsKey = "habit_levels"
// We show roughly the last 3 months of activity as a weekly heatmap.
// 12 weeks × 7 days = 84 days.
private let habitWeeks = 12
private let habitDays = habitWeeks * 7

/// Mode of the Habit widget, derived from sentinel values stored in UserDefaults.
enum HabitWidgetMode {
  case noSnapshot     // widget has never received any data
  case noUser         // user not signed in / onboarded
  case nonPremium     // signed in but not premium
  case data           // premium user with levels
}

struct HabitEntry: TimelineEntry {
  let date: Date
  let levels: [Int]        // habitDays values, oldest → newest
  let mode: HabitWidgetMode
}

struct HabitProvider: TimelineProvider {
  // Sample entry used for previews in the widget gallery.
  private func previewEntry() -> HabitEntry {
    // Simple repeating pattern of levels to look lively in the gallery.
    let sampleLevels = (0..<habitDays).map { index -> Int in
      if index % 7 == 0 { return 3 }
      if index % 5 == 0 { return 2 }
      if index % 3 == 0 { return 1 }
      return 0
    }

    return HabitEntry(
      date: Date(),
      levels: sampleLevels,
      mode: .data
    )
  }

  func placeholder(in context: Context) -> HabitEntry {
    previewEntry()
  }

  func getSnapshot(in context: Context, completion: @escaping (HabitEntry) -> Void) {
    if context.isPreview {
      completion(previewEntry())
    } else {
      completion(loadEntry())
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<HabitEntry>) -> Void) {
    let entry = loadEntry()
    let timeline = Timeline(entries: [entry], policy: .never)
    completion(timeline)
  }

  private func loadEntry() -> HabitEntry {
    let defaults = UserDefaults(suiteName: habitAppGroupId)
    let rawObject = defaults?.object(forKey: habitLevelsKey)
    // Stored as [NSNumber] by the React Native bridge; map safely to [Int].
    let stored = (defaults?.array(forKey: habitLevelsKey) as? [NSNumber])?.map { $0.intValue } ?? []

    let mode: HabitWidgetMode
    let levels: [Int]

    if rawObject == nil {
      mode = .noSnapshot
      levels = []
    } else if let first = stored.first, first == -2 {
      // Sentinel -2 => user not signed in.
      mode = .noUser
      levels = []
    } else if let first = stored.first, first == -1 {
      // Sentinel -1 => non‑premium user.
      mode = .nonPremium
      levels = []
    } else {
      mode = .data

      if stored.count >= habitDays {
        levels = Array(stored.suffix(habitDays))
      } else if stored.isEmpty {
        levels = Array(repeating: 0, count: habitDays)
      } else {
        let padding = Array(repeating: 0, count: max(0, habitDays - stored.count))
        levels = padding + stored
      }
    }

    return HabitEntry(date: Date(), levels: levels, mode: mode)
  }
}

struct HabitWidgetView: View {
  var entry: HabitProvider.Entry
  @Environment(\.widgetFamily) private var family

  

  private func color(for level: Int) -> Color {
      switch level {
      case 3:
          return Color(hex: "#a855f7")
      case 2:
          return Color(hex: "#a855f7").opacity(0.66)
      case 1:
          return Color(hex: "#a855f7").opacity(0.33)
      default:
          return Color.white.opacity(0.08)
      }
  }

  var body: some View {
    
    ZStack {
      VStack(alignment: .leading, spacing: 6) {
        switch entry.mode {
        case .noUser:
          VStack {
            Text("🌱").font(.custom("Poppins-Bold", size: 44))
              Text("Sign in to see your habit tracker ")
              .font(.custom("Poppins-SemiBold", size: 12))
                  .foregroundColor(.white.opacity(1))
                  .multilineTextAlignment(.center)
                  
          }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

        case .nonPremium:
          VStack(spacing: 12) {
            Text("FIRST CLASS")
                .font(.custom("Poppins-Bold", size: 10))
                .tracking(1.2)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(Color(hex: "#A78BFA"))
                        // Glow layer 1 (soft)
                        .shadow(color: Color(hex: "#A78BFA").opacity(0.7),
                                radius: 10, x: 0, y: 0)
                        // Glow layer 2 (stronger core)
                        .shadow(color: Color(hex: "#A78BFA").opacity(0.4),
                                radius: 4, x: 0, y: 0)
                )
            Text("Upgrade widgets \n with Premium!")
              .font(.custom("Poppins-SemiBold", size: 12))
              .foregroundColor(.white)
              .multilineTextAlignment(.center)
              
          }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

        case .noSnapshot:
          Text("🌱 Start your first focus mission to light up your Habit orbit.")
            .font(.custom("Poppins-Medium", size: 11))
            .foregroundColor(.white)
            .multilineTextAlignment(.leading)

        case .data:
            let cellSpacing: CGFloat = 3
            let rowsCount = 7
            let gridHeight: CGFloat = 120

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {

                                  Text("🪐 Habit orbit")
                      .font(.custom("Poppins-SemiBold", size: 13))
                                      .foregroundColor(.white.opacity(0.9))
                                  Text("Last 90 days")
                      .font(.custom("Poppins-Regular", size: 10))
                      .foregroundColor(.white.opacity(0.7))
                }

              GeometryReader { geo in
                // Size cells from height so 7 rows fit; size width
                // to fill the available width with 12 week-columns.
                let totalRowSpacing = cellSpacing * CGFloat(rowsCount - 1)
                let cellHeight = (geo.size.height - totalRowSpacing) / CGFloat(rowsCount)

                let totalCells = entry.levels.count
                let columns = max(Int(ceil(Double(totalCells) / Double(rowsCount))), 1)
                let totalColSpacing = cellSpacing * CGFloat(columns - 1)
                let cellWidth = (geo.size.width - totalColSpacing) / CGFloat(columns)

                let rows = Array(
                  repeating: GridItem(.fixed(cellHeight), spacing: cellSpacing),
                  count: rowsCount
                )

                LazyHGrid(rows: rows, spacing: cellSpacing) {
                  ForEach(0..<entry.levels.count, id: \.self) { idx in
                    RoundedRectangle(cornerRadius: 3 , style: .continuous)
                      .fill(color(for: entry.levels[idx]))
                      .frame(width: cellWidth, height: cellHeight)
                  }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
              }
              .frame(height: gridHeight)

              Spacer(minLength: 0)
            }.padding(.top, 4)
        }
      }
     
      .padding(.vertical, 0)
    }
  }
}

struct HabitWidget: Widget {
  let kind: String = "habit"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: HabitProvider()) { entry in
      HabitWidgetView(entry: entry)
        .containerBackground(for: .widget) {
            switch entry.mode {
            case .nonPremium:
                Image("earth")
                    .resizable()
                    .scaledToFill()
                    .overlay(
                        Color.black.opacity(0.35)
                    )
            default:
                Color(hex: "#0b0e0f")
            }
        }
    }
    .configurationDisplayName("Habit orbit")
    .description("See your last 90 days of focus habit.")
    .supportedFamilies([.systemMedium])
  }
}

#Preview(as: .systemMedium) {
  HabitWidget()
} timeline: {
  HabitEntry(
    date: .now,
    levels: (0..<habitDays).map { _ in Int.random(in: 0...3) },
    mode: .data
  )
}
