import WidgetKit
import SwiftUI

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        _ = scanner.scanString("#")
        
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        
        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Timeline Provider

private let appGroupId = "group.com.anonymous.focusRoom"
private let tasksKey = "today_tasks_titles"

enum TodayWidgetMode {
    case noSnapshot      // widget has never received any data
    case noUser         // user not signed in / onboarded
    case nonPremium     // non premium user - upsell
    case tasks          // premium user - show tasks
}

struct Provider: AppIntentTimelineProvider {
    // Sample entry used for previews in the widget gallery.
    private func previewEntry(configuration: ConfigurationAppIntent) -> SimpleEntry {
        SimpleEntry(
            date: Date(),
            configuration: configuration,
            mode: .tasks,
            titles: [
                "Deep work – thesis chapter",
                "Reply to priority emails",
                "Plan tomorrow's sprint",
                "Design review notes",
                "Quick inbox cleanup"
            ]
        )
    }

    func placeholder(in context: Context) -> SimpleEntry {
        previewEntry(configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        if context.isPreview {
            return previewEntry(configuration: configuration)
        }
        return loadEntry(configuration: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        let entry = loadEntry(configuration: configuration)
        // We use .never and rely on WidgetCenter.reloadTimelines(ofKind:)
        // when the app updates the snapshot via the App Group.
        return Timeline(entries: [entry], policy: .never)
    }

    private func loadEntry(configuration: ConfigurationAppIntent) -> SimpleEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let rawObject = defaults?.object(forKey: tasksKey)
        let storedTitles = defaults?.stringArray(forKey: tasksKey) ?? []

        let mode: TodayWidgetMode
        let titles: [String]

        if rawObject == nil {
            mode = .noSnapshot
            titles = []
        } else if let first = storedTitles.first, first == "__NO_USER__" {
            mode = .noUser
            titles = []
        } else if let first = storedTitles.first, first == "__NON_PREMIUM__" {
            mode = .nonPremium
            titles = []
        } else {
            mode = .tasks
            titles = storedTitles
        }

        return SimpleEntry(
            date: Date(),
            configuration: configuration,
            mode: mode,
            titles: titles
        )
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let mode: TodayWidgetMode
    let titles: [String]    // today's task titles (for .tasks)
}

// MARK: - Widget View

struct widgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            

            // Foreground content
            VStack(alignment: .leading, spacing: 8) {
                switch entry.mode {
                case .noSnapshot, .noUser:
                  VStack {
                    Text("🔭").font(.custom("Poppins-Bold", size: 44))
                      Text("Sign in to see today's missions")
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
                    Text("Upgrade widgets with Premium!")
                      .font(.custom("Poppins-SemiBold", size: 12))
                      .foregroundColor(.white)
                      .multilineTextAlignment(.center)
                      
                  }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

                case .tasks:
                  HStack(spacing: 8) {
                                  Image(systemName: "list.bullet")
                                      .font(.system(size: 16, weight: .semibold))
                                      .foregroundColor(Color(hex:"#a855f7"))
                                  Text("Today's missions")
                      .font(.custom("Poppins-SemiBold", size: 13))
                                      .foregroundColor(.white.opacity(0.9))
                                  Spacer()
                              }
                    // Show up to five tasks
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach(Array(entry.titles.prefix(5).enumerated()), id: \.offset) { (_, title) in
                            HStack(alignment: .top, spacing: 6) {
                                Circle()
                                    .fill(Color(hex:"#a855f7"))
                                    .frame(width: 4, height: 4)
                                    .padding(.top, 6)
                                Text(title)
                                    .font(.custom("Poppins-Medium", size: 11))
                                    .foregroundColor(.white.opacity(0.9))
                                    .lineLimit(1)
                            }
                        }
                    }
                  Spacer(minLength: 0)
                }

                
            }
           
          
        }
    }
}

// MARK: - Widget Configuration

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: Provider()
        ) { entry in
            widgetEntryView(entry: entry)
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
        .configurationDisplayName("Today's missions")
        .description("See your missions for today.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
#Preview(as: .systemSmall) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: ConfigurationAppIntent(), mode: .noSnapshot, titles: [])
  SimpleEntry(date: .now, configuration: ConfigurationAppIntent(), mode: .nonPremium, titles: [])
    SimpleEntry(date: .now, configuration: ConfigurationAppIntent(), mode: .tasks, titles: ["Write thesis", "Deep work – design review", "Plan tomorrow"])
}
