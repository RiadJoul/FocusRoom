import { formatSelectedDate, isSameDay } from '@/lib/utils/dateUtils';
import React from 'react';
import { Text, View } from 'react-native';

interface TasksSectionHeaderProps {
  selectedDay: Date;
  today: Date;
  taskCount: number;
}

export function TasksSectionHeader({ selectedDay, today, taskCount }: TasksSectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-5">
      <Text className="text-2xl font-primary-bold text-white">
        {isSameDay(selectedDay, today) ? "Today's Focus" : formatSelectedDate(selectedDay, today)}
      </Text>
      <View className="rounded-md bg-white px-3 py-1">
        <Text className="text-black font-primary-bold text-base">{taskCount}</Text>
      </View>
    </View>
  );
}
