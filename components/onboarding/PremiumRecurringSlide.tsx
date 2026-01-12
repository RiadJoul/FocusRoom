import React, { useEffect, useRef } from 'react';
import { Text, View, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export function PremiumRecurringSlide() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <View className="flex-1 justify-center">
        <Animated.View
          className="mb-14 items-center justify-center"
          style={{ transform: [{ scale }] }}
        >
          <View className="w-24 h-24 rounded-2xl bg-primary/20 items-center justify-center mb-2">
            <MaterialCommunityIcons name="repeat" size={48} color="#a855f7" />
          </View>
          <Text className="text-white font-primary-semibold text-xl">
            Recurring missions {'\n'} stay on autopilot.
          </Text>
        </Animated.View>

        <View className="mt-2 mx-3">
          <View className="flex-row items-center mb-5">
            <Ionicons name="today-outline" size={28} color="#a855f7" />
            <Text className="text-gray-300 font-primary-medium text-lg ml-4">
              Turn any task into a daily, weekly or custom mission.
            </Text>
          </View>
          <View className="flex-row items-center mb-5">
            <Ionicons name="time-outline" size={28} color="#a855f7" />
            <Text className="text-gray-300 font-primary-medium text-lg ml-4">
              FocusRoom auto‑spawns the next task at the right time.
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="checkmark" size={28} color="#a855f7" />
            <Text className="text-gray-300 font-primary-medium text-lg ml-4">
              Perfect for workouts, study blocks and deep‑work rituals.
            </Text>
          </View>
      </View>
    </View>
  );
}

