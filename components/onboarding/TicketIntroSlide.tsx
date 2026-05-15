import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BoardingPassCard } from '@/components/shared/BoardingPassCard';

export function TicketIntroSlide() {
  const frontAnim = useRef(new Animated.Value(40)).current;
  const frontOpacity = useRef(new Animated.Value(0)).current;
  const backAnim = useRef(new Animated.Value(-30)).current;
  const backOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    frontAnim.setValue(40);
    frontOpacity.setValue(0);
    backAnim.setValue(-30);
    backOpacity.setValue(0);

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(backAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(backOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(frontAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(frontOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [backAnim, backOpacity, frontAnim, frontOpacity]);

  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-full items-center mb-10">
        {/* Back ticket — completed past session, simplified */}
        <Animated.View
          style={{
            opacity: backOpacity,
            transform: [
              { translateY: backAnim },
              { rotate: '-8deg' },
            ],
          }}
          className="absolute -top-6 left-2 right-2 mx-auto"
        >
          <View className="bg-white rounded-3xl px-5 py-4 shadow-xl shadow-black/50">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-gray-500 font-primary-medium">5 January 2026</Text>
              <Text className="text-xs text-green-600 font-primary-bold">LANDED</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-primary-bold text-black">LHR</Text>
                <Text className="text-xs text-gray-500">London</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xs text-gray-500 mb-1">42m</Text>
                <View className="h-[1px] w-20 bg-gray-300" />
              </View>
              <View className="items-end">
                <Text className="text-lg font-primary-bold text-black">CDG</Text>
                <Text className="text-xs text-gray-500">Paris</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Front ticket */}
        <Animated.View
          style={{
            opacity: frontOpacity,
            transform: [{ translateY: frontAnim }],
          }}
          className="w-full"
        >
          <BoardingPassCard
            from="FOC"
            fromLabel="Your World"
            to="FLW"
            toLabel="Flow State"
            durationLabel="45m of deep focus"
            isPremium
          />
        </Animated.View>
      </View>

      {/* Copy blocks under ticket */}
      <View className="w-full px-4 mt-4">
        <View className="flex-row items-start mb-4">
          <View className="w-9 h-9 rounded-2xl bg-white/10 items-center justify-center mr-3">
            <Ionicons name="ticket-outline" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-primary-bold text-lg mb-1">
              Focus Boarding Pass
            </Text>
            <Text className="text-gray-300 font-primary-medium text-sm">
              Every session gets its own boarding pass, from takeoff to touchdown.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <View className="w-9 h-9 rounded-2xl bg-white/10 items-center justify-center mr-3">
            <Ionicons name="time-outline" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-primary-bold text-lg mb-1">
              Focus History
            </Text>
            <Text className="text-gray-300 font-primary-medium text-sm">
              Every landing becomes a milestone in your focus journey.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
