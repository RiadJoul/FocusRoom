import { getGreeting } from '@/lib/utils/dateUtils';
import React from 'react';
import { Text, View } from 'react-native';

interface HeaderProps {
  userName: string;
  selectedDay: Date;
  today: Date;
}

export function Header({ userName, selectedDay, today }: HeaderProps) {
  return (
    <View className="pt-2">
      <Text className="text-2xl font-primary-bold text-white leading-tight">
        {getGreeting()}
        <Text className="text-primary">{userName ? ", " + userName : ''}</Text>
      </Text>
    </View>
  );
}