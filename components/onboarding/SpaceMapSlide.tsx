import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function SpaceMapSlide() {
  const shipProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shipProgress.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shipProgress, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(shipProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [shipProgress]);

  const translateX = shipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 230],
  });
  const translateY = shipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [170, 70],
  });

  return (
    <View className="flex-1 justify-center mt-2">
      {/* Space map container */}
      <View className="w-full h-96 rounded-[32px] bg-[#05070F] overflow-hidden mb-10 border border-white/10">
        {/* Starfield */}
        <View className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <View
              key={idx}
              className="absolute w-[2px] h-[2px] rounded-full bg-white/50"
              style={{
                opacity: 0.3 + (idx % 4) * 0.15,
                top: `${(idx * 17) % 95}%`,
                left: `${(idx * 23) % 95}%`,
              }}
            />
          ))}
        </View>

        {/* Origin system */}
        <View className="absolute left-6 bottom-16 items-start">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-full bg-indigo-500/40 border border-indigo-300 items-center justify-center">
              <Ionicons name="planet-outline" size={18} color="#E5E7FF" />
            </View>
            <View className="ml-2">
              <Text className="text-[11px] text-indigo-200 font-primary-medium">LAUNCH</Text>
              <Text className="text-base text-white font-primary-bold">Distraction Zone</Text>
            </View>
          </View>
        </View>

        {/* Destination system */}
        <View className="absolute right-6 top-12 items-end">
          <View className="flex-row items-center">
            <View className="mr-2">
              <Text className="text-[11px] text-emerald-200 font-primary-medium">TARGET</Text>
              <Text className="text-base text-white font-primary-bold">Deep Focus Orbit</Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-emerald-500/40 border border-emerald-200 items-center justify-center">
              <Ionicons name="sparkles-outline" size={18} color="#ECFDF5" />
            </View>
          </View>
        </View>

        {/* Route line */}
        <View
          className="absolute bg-white/70"
          style={{
            left: 88,
            bottom: 160,
            width: 230,
            height: 1.5,
            transform: [{ rotate: '-42deg' }],
          }}
        />

        {/* Animated rocket */}
        <Animated.View
          style={{
            position: 'absolute',
            transform: [{ translateX }, { translateY }, { rotate: '-32deg' }],
          }}
        >
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-lg shadow-emerald-400/50">
            <Ionicons name="rocket-outline" size={20} color="#020617" />
          </View>
        </Animated.View>

        {/* Bottom gradient to fade into text area */}
        <View className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </View>

      {/* Copy under map */}
      <View className="px-1">
        <Text className="text-white text-lg font-primary-medium leading-7 mb-2">
          Each mission moves your ship from the distraction zone into
        </Text>
        <Text
          className="text-white text-3xl font-primary-bold"
          style={{
            textShadowColor: 'rgba(255,255,255,0.7)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          }}
        >
          deep focus mode.
        </Text>
      </View>
    </View>
  );
}

