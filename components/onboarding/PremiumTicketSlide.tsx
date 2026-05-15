import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { BoardingPassCard } from '@/components/shared/BoardingPassCard';

export function PremiumTicketSlide() {
  const ticketProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ticketProgress.setValue(0);
    Animated.timing(ticketProgress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: true,
    }).start();
  }, [ticketProgress]);

  const translateY = ticketProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [220, 0],
  });

  const opacity = ticketProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });

  const scale = ticketProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <View className="flex-1 justify-center">
      <View className="mt-1 items-center">
        <Animated.View
          style={{ transform: [{ translateY }, { scale }], opacity }}
          className="w-full rounded-3xl bg-gradient-to-r from-zinc-900 to-slate-900 border border-white/15 shadow-lg shadow-black/80"
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
    </View>
  );
}
