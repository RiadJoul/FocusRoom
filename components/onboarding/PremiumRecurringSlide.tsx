import React, { useEffect, useRef } from 'react';
import { Text, View, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const mockTasks = [
  { label: 'Morning workout', recurrence: 'Daily · 7:00 AM', icon: 'barbell-outline' },
  { label: 'Deep work block', recurrence: 'Weekdays · 9:00 AM', icon: 'rocket-outline' },
  { label: 'Weekly review', recurrence: 'Every Sunday', icon: 'calendar-outline' },
];

export function PremiumRecurringSlide() {
  const cardAnims = useRef(mockTasks.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    cardAnims.forEach(a => a.setValue(0));
    Animated.stagger(
      120,
      cardAnims.map(a =>
        Animated.spring(a, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [cardAnims]);

  return (
    <View className="flex-1 justify-center">
      {/* Mock recurring task cards */}
      <View className="mb-10 gap-3">
        {mockTasks.map((task, i) => {
          const anim = cardAnims[i];
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
          return (
            <Animated.View
              key={task.label}
              style={{ opacity: anim, transform: [{ translateY }] }}
              className="flex-row items-center bg-white/8 border border-white/10 rounded-2xl px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center mr-3">
                <Ionicons name={task.icon as any} size={20} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-primary-semibold text-base">{task.label}</Text>
                <View className="flex-row items-center mt-0.5 gap-1">
                  <MaterialCommunityIcons name="repeat" size={13} color="#a855f7" />
                  <Text className="text-purple-400 font-primary-medium text-xs">{task.recurrence}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View className="mx-1 gap-4">
        <View className="flex-row items-center">
          <Ionicons name="today-outline" size={26} color="#a855f7" />
          <Text className="text-gray-300 font-primary-medium text-base ml-4 flex-1">
            Turn any task into a daily, weekly or custom mission.
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={26} color="#a855f7" />
          <Text className="text-gray-300 font-primary-medium text-base ml-4 flex-1">
            FocusRoom auto‑spawns the next task at the right time.
          </Text>
        </View>
      </View>
    </View>
  );
}

