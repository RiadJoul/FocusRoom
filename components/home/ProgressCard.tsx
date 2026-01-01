import React from 'react';
import { Text, View } from 'react-native';

interface ProgressCardProps {
  completedCount: number;
  totalCount: number;
}

export function ProgressCard({ completedCount, totalCount }: ProgressCardProps) {
  if (totalCount === 0) return null;

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View className="pt-4">
      <View className="bg-card rounded-xl px-5 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-sm font-primary-medium">Completed</Text>
          <Text className="text-white font-primary-bold text-sm">
            {completedCount}/{totalCount} tasks
          </Text>
        </View>
        {/* Progress Bar */}
        <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <View 
            className="h-full bg-primary rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </View>
      </View>
    </View>
  );
}
