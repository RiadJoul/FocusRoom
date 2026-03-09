import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export function PremiumWidgetsSlide() {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -8],
  });

  return (
    <View className="flex-1 justify-center">
      {/* Widget previews */}
      <Animated.View
        className="items-center mb-8"
        style={{ transform: [{ translateY }] }}
      >
        {/* StandBy preview */}
        <Image
          source={require('../../assets/images/standBy-widget.png')}
          style={{
            width: 280,
            height: 180,
            borderRadius: 28,
            marginBottom: 14,
          }}
          resizeMode="cover"
        />

        {/* Home / habit widgets row */}
        <View className="flex-row gap-3">
          <Image
            source={require('../../assets/images/task-widget.jpeg')}
            style={{
              width: 130,
              height: 120,
              borderRadius: 20,
            }}
            resizeMode="cover"
          />
          <Image
            source={require('../../assets/images/habit-widget.jpeg')}
            style={{
              width: 230,
              height: 110,
              borderRadius: 20,
            }}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* Copy */}
      <View className="mx-3 mt-1">
        <View className="flex-row items-center mb-4">
          <Ionicons name="home-outline" size={26} color="#a855f7" />
          <Text className="text-gray-200 font-primary-medium text-base ml-3">
            Pin widgets on the Home & Lock Screen to see today&apos;s missions at a glance.
          </Text>
        </View>

        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons name="dock-window" size={26} color="#a855f7" />
          <Text className="text-gray-200 font-primary-medium text-base ml-3">
            When your phone is charging on its side, StandBy shows your live flight timeline.
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="rocket-outline" size={26} color="#a855f7" />
          <Text className="text-gray-200 font-primary-medium text-base ml-3">
            Tap any widget or Live Activity to jump straight back into your current mission.
          </Text>
        </View>
      </View>
    </View>
  );
}

