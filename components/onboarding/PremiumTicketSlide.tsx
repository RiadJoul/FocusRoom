import React, { useEffect, useRef } from 'react';
import { Text, View, Animated } from 'react-native';


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
        {/* Ticket printing up from the bottom into center */}
        <Animated.View
          style={{
            transform: [{ translateY }, { scale }],
            opacity,
          }}
          className="w-full rounded-3xl bg-gradient-to-r from-zinc-900 to-slate-900 border border-white/15 shadow-lg shadow-black/80"
        >
          <View
            className="bg-white rounded-2xl px-6 pt-5 pb-6 shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[10px] text-gray-500 tracking-[2px] font-primary-medium">
                  FOCUSROOM AIRWAYS
                </Text>
                <Text className="text-base font-primary-bold text-black">BOARDING PASS</Text>
              </View>
              <View style={{
                backgroundColor: '#A78BFA',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                shadowColor: '#A78BFA',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 10,
                elevation: 10,
              }}>
                <Text className="text-white font-primary-bold text-sm tracking-wider">FIRST CLASS</Text>
              </View>
            </View>

            {/* Route row */}
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-xs text-gray-500 mb-1">FROM</Text>
                <Text className="text-3xl font-primary-bold text-black">FOC</Text>
                <Text className="text-xs text-gray-500">Your World</Text>
              </View>
              <View className="items-center">
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full bg-black mr-1.5" />
                  <View className="w-14 h-[1px] bg-gray-400" />
                  <View className="w-2 h-2 rounded-full bg-black ml-1.5" />
                </View>
                <Text className="text-xs text-gray-500">45m of deep focus</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500 mb-1">TO</Text>
                <Text className="text-3xl font-primary-bold text-black">FLW</Text>
                <Text className="text-xs text-gray-500">Flow State</Text>
              </View>
            </View>

            {/* Dotted divider */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="w-3 h-3 rounded-full bg-black/5" />
              <View className="flex-1 flex-row justify-between mx-2">
                {Array.from({ length: 24 }).map((_, idx) => (
                  <View key={idx} className="w-2 h-[1px] bg-gray-300" />
                ))}
              </View>
              <View className="w-3 h-3 rounded-full bg-black/5" />
            </View>

            {/* Fake barcode strip */}
            <View className="flex-row items-end">
              <View className="flex-row flex-1 h-10">
                {Array.from({ length: 36 }).map((_, idx) => (
                  <View
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    style={{
                      flex: 1,
                      backgroundColor: idx % 2 === 0 ? '#000' : '#fff',
                      marginHorizontal: idx % 3 === 0 ? 2 : 1,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
