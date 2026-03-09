import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
  var body: some Widget {
    // Today tasks widget (premium, requires sign‑in)
    widget()
    // Habit orbit widget (premium, requires sign‑in)
    HabitWidget()
    // Control + live activity widgets
    widgetControl()
    WidgetLiveActivity()
  }
}
