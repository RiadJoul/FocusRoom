import { formatSelectedDate, isSameDay } from '@/lib/utils/dateUtils';
import React from 'react';
import { Text, View } from 'react-native';

interface ProgressCardProps {
  selectedDay: Date;
  today: Date;
  completedCount: number;
  totalCount: number;
}

export function ProgressCard({ selectedDay, today, completedCount, totalCount }: ProgressCardProps) {
  if (totalCount === 0) return null;

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View className="pt-6">
      <View className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
        <Text className="text-white font-primary-bold text-base mb-3">
          {isSameDay(selectedDay, today) ? "Today's" : formatSelectedDate(selectedDay, today)} Progress
        </Text>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-gray-400 text-sm font-primary-medium">Completed</Text>
          <Text className="text-primary font-primary-bold text-sm">
            {completedCount}/{totalCount} tasks
          </Text>
        </View>
        {/* Progress Bar */}
        <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <View 
            className="h-full bg-primary rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </View>
      </View>
    </View>
  );
}
