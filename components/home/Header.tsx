import { getGreeting, isSameDay } from '@/lib/utils/dateUtils';
import React from 'react';
import { Text, View } from 'react-native';

interface HeaderProps {
  userName: string;
  completedCount: number;
  selectedDay: Date;
  today: Date;
}

export function Header({ userName, completedCount, selectedDay, today }: HeaderProps) {
  return (
    <View className="pt-2">
      <Text className="text-2xl font-primary-bold text-white leading-tight">
        {getGreeting()},{' '}
        <Text className="text-primary">{userName}</Text>
      </Text>
      
      {/* Stats Badge */}
      <View className="flex-row items-center mt-2 bg-gray-900/50 self-start px-4 py-2 rounded-full border border-gray-800">
        <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
        <Text className="text-sm font-primary-medium text-gray-300">
          {completedCount} completed {isSameDay(selectedDay, today) ? 'today' : 'on this day'}
        </Text>
      </View>
    </View>
  );
}
