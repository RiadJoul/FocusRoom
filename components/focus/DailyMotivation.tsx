// DailyMotivation.tsx
import { View, Text } from "react-native";

export default function DailyMotivation({ stats }: any) {
    const message = getMessage(stats);

    return (
        <View className="bg-card rounded-2xl p-5">
            <Text className="text-white font-primary-bold text-lg mb-1">
               Smart Feedback
            </Text>
            <Text className="text-gray-200 font-primary text-base leading-5">
                {message}
            </Text>
        </View>
    );
}

function getMessage(stats: any) {
    if (!stats || stats.totalSessions === 0) {
        return "Every focus session counts. Start your first one today and build momentum!";
    }

    // Light logic
    const { totalSessions, totalMinutes, averageSessionLength, lastSessionMinutes } = stats;

    // If user has 1–3 sessions
    if (totalSessions <= 3) {
        return "You're off to a great start. Stick with it today — consistency beats intensity.";
    }

    // If user focused yesterday (based on last session length)
    if (lastSessionMinutes >= averageSessionLength) {
        return `Nice work yesterday! You focused ${lastSessionMinutes} minutes — let’s keep that streak alive today.`;
    }

    // If user’s total focus time is growing
    if (totalMinutes >= 120) {
        return "You're building strong habits. Aim for one solid session today to keep progressing.";
    }

    // If user hasn't done a longer session in a while
    if (averageSessionLength < 15) {
        return "Try a 15-minute session today — small improvements lead to big results.";
    }

    // Default fallback
    return "A focused mind today makes a stronger you tomorrow.";
}
