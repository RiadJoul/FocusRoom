import { useSessionStore } from '@/lib/stores/sessionStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getGreeting, isSameDay } from '@/lib/utils/dateUtils';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

interface HeaderProps {
  userName: string;
  selectedDay: Date;
  today: Date;
}

export function Header({ userName, selectedDay, today }: HeaderProps) {
  const user = useUserStore((state) => state.user);
  const { stats, fetchStats } = useSessionStore();

  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id);
    }
  }, [user?.id, fetchStats]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const focusHealthScore = stats?.focusHealthScore || 0;

  return (
    <View className="pt-2">
      <Text className="text-2xl font-primary-bold text-white leading-tight">
        {getGreeting()},{' '}
        <Text className="text-primary">{userName}</Text>
      </Text>
      
      {/* Stats Badges */}
      <View className="flex-row items-center mt-2 gap-2">
        {/* Focus Health Score Badge */}
        <View className="flex-row items-center bg-black px-4 py-2 rounded-lg">
          <View className={`w-2 h-2 rounded-full ${getHealthColor(focusHealthScore)} mr-2`} />
          <Text className="text-sm font-primary-medium text-white">
            Focus Health: {focusHealthScore}% | {getHealthLabel(focusHealthScore)}
          </Text>
        </View>
      </View>

    </View>
  );
}
