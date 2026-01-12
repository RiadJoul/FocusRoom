import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
export function BlockingAppsSlide() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rotation.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View className="flex-1 items-center justify-center mt-4">
      {/* Static container with inner shield */}
      <View className="w-64 h-64 rounded-full bg-black items-center justify-center">
        {/* inner circle (shield) – does NOT rotate */}
        <View className="w-40 h-40 rounded-full bg-secondary/40 items-center justify-center">
          <Image
            source={require('../../assets/icons/ios-light.png')}
            className="w-10 h-10 rounded-xl"
            resizeMode="contain"
          />
        </View>

        {/* Rotating ring with app icons */}
        <Animated.View
          style={{
            transform: [{ rotate }],
          }}
          className="absolute inset-0 rounded-full"
        >
          {/* app icons on ring – positioned roughly around circle */}
          <View className="absolute inset-0">
            <Animated.View
              className="absolute top-4 left-32"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-instagram" size={26} color="#FFDC80" />
            </Animated.View>
            <Animated.View
              className="absolute top-12 right-6"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-youtube" size={28} color="#FF0000" />
            </Animated.View>
            <Animated.View
              className="absolute top-32 right-2"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-tiktok" size={28} color="#ffffff" />
            </Animated.View>
            <Animated.View
              className="absolute bottom-6 right-14"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-facebook" size={26} color="#4267B2" />
            </Animated.View>
            <Animated.View
              className="absolute bottom-4 left-24"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-whatsapp" size={26} color="#34d399" />
            </Animated.View>
            <Animated.View
              className="absolute bottom-14 left-6"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-discord" size={26} color="#7289da" />
            </Animated.View>
            <Animated.View
              className="absolute top-8 left-12"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              <Ionicons name="logo-twitch" size={26} color="#a855f7" />
            </Animated.View>
            <Animated.View
              className="absolute top-24 left-4"
              style={{ transform: [{ rotate: counterRotate }] }}
            >
              
              <Ionicons name="logo-snapchat" size={26} color="#FFFC00" />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* Copy */}
      <View className="mt-10 px-4">
        <Text className="text-white font-primary-bold text-xl text-center mb-2">
          Block your biggest distractions
        </Text>
        <Text className="text-gray-300 font-primary-medium text-sm text-center">
          Give FocusRoom Screen Time access once and we&apos;ll keep distracting apps locked
          while you&apos;re on a mission.
        </Text>
      </View>
    </View>
  );
}
