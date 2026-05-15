import React, { useEffect, useRef } from 'react';
import { Text, View, Animated } from 'react-native';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';

export function PremiumAnalyticsSlide() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [progress]);

  const distance = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [35, 92],
  });

  return (
    <View className="flex-1 justify-start">
      <View className="bg-card  ">

        {/* Distance / streak mini dashboard */}
        <View className="mt-24 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-black/80 border border-white/15 px-3 py-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-x-2">
                <Ionicons name="planet-outline" size={16} color="#A855F7" />
                <Text className="text-gray-400 text-[11px] font-primary-medium uppercase tracking-[0.14em]">
                  Distance
                </Text>
              </View>
            </View>
            <View className="mt-1">
              <Text className="text-white font-primary-bold text-lg">

                 4023 km
              </Text>
              <Text className="text-gray-300 text-xs font-primary-medium mt-2">
                Track how far your focus flights travel over time.
              </Text>
            </View>
          </View>

          <View className="flex-1 rounded-2xl bg-black/80 border border-white/15 px-3 py-3">
            <View className="flex-row items-center gap-x-2 mb-1">
              <SimpleLineIcons name="fire" size={16} color="#F97316" />
              <Text className="text-gray-400 text-[11px] font-primary-medium uppercase tracking-[0.14em]">
                Streak & Health
              </Text>
            </View>
            <Text className="text-white font-primary-bold text-lg mt-1">
              7‑day streak
            </Text>
            <Text className="text-gray-300 text-xs font-primary-medium mt-1">
              See success rate, deep‑focus days and Focus Health in one place.
            </Text>
          </View>

        </View>
        <View className="mt-2 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-black/80 border border-white/15 px-3 py-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-x-2">

                <Ionicons name="speedometer-outline" size={16} color="#10B981" />
                <Text className="text-gray-400 text-[11px] font-primary-medium uppercase tracking-[0.14em]">
                  Average Session
                </Text>
              </View>
            </View>
            <View className="mt-1">
              <Text className="text-white font-primary-bold text-lg">
                45 min
              </Text>
              <Text className="text-gray-300 text-xs font-primary-medium mt-2">
                Monitor your average focus session length and improve over time.
              </Text>
            </View>
          </View>

          <View className="flex-1 rounded-2xl bg-black/80 border border-white/15 px-3 py-3">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
              <Text className="text-gray-400 text-[11px] font-primary-medium uppercase tracking-[0.14em]">
                Deep Focus Days
              </Text>
            </View>
            <Text className="text-white font-primary-bold text-lg mt-1">
              5 days
            </Text>
            <Text className="text-gray-300 text-xs font-primary-medium mt-1">
              See how many days you hit your deep focus goals each week.
            </Text>
          </View>

        </View>

        <Text className="text-gray-400 font-primary-medium text-base mt-4 text-center">
          Premium stats make it easy to see if you're actually improving week after week.
        </Text>
      </View>
    </View>
  );
}
