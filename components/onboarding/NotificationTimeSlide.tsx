import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Image, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type NotificationTimeSlideProps = {
  hour: number;
  minute: number;
  onChangeTime: (time: { hour: number; minute: number }) => void;
};

export function NotificationTimeSlide({ hour, minute, onChangeTime }: NotificationTimeSlideProps) {
  const phoneAnim = useRef(new Animated.Value(40)).current;
  const phoneOpacity = useRef(new Animated.Value(0)).current;

  const previewTranslateY = useRef(new Animated.Value(40)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;

  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const ITEM_HEIGHT = 40;

  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    setSelectedHour(hour);
    setSelectedMinute(minute);

    if (hourListRef.current) {
      hourListRef.current.scrollToOffset({
        offset: hour * ITEM_HEIGHT,
        animated: false,
      });
    }
    if (minuteListRef.current) {
      minuteListRef.current.scrollToOffset({
        offset: minute * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [hour, minute]);

  useEffect(() => {
    phoneAnim.setValue(40);
    phoneOpacity.setValue(0);
    previewTranslateY.setValue(40);
    previewOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(phoneAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(phoneOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(previewTranslateY, {
        toValue: 0,
        duration: 320,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(previewOpacity, {
        toValue: 1,
        duration: 320,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [phoneAnim, phoneOpacity, previewOpacity, previewTranslateY]);

  const handleHourScrollEnd = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = hours[index];
    if (value !== undefined) {
      setSelectedHour(value);
      onChangeTime({ hour: value, minute: selectedMinute });
    }
  };

  const handleMinuteScrollEnd = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = minutes[index];
    if (value !== undefined) {
      setSelectedMinute(value);
      onChangeTime({ hour: selectedHour, minute: value });
    }
  };

  const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute
    .toString()
    .padStart(2, '0')}`;

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View
        style={{
          opacity: phoneOpacity,
          transform: [{ translateY: phoneAnim }],
        }}
        className="w-full bg-black/80 border-primary border-2 rounded-[24px] px-4 pt-3 pb-6 "
      >
        {/* Fake status bar */}
        <View className="flex-row items-center justify-between mb-4 px-1">
          <Text className="text-white font-primary-medium text-base">{formattedTime}</Text>
          <View className="flex-row items-center gap-x-1">
            <View className="w-12 h-5 rounded-full bg-white/10" />
            <View className="w-5 h-5 rounded-full bg-white/40" />
          </View>
        </View>

        {/* Time picker wheels */}
        <View className="bg-white/8 rounded-3xl py-4 px-2 mb-5">
          <View className="flex-row items-center justify-center">
            <View className="w-20 h-40 overflow-hidden">
              <FlatList
                ref={hourListRef}
                data={hours}
                keyExtractor={(item) => `hour-${item}`}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleHourScrollEnd}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 1.3 }}
                renderItem={({ item }) => {
                  const isSelected = item === selectedHour;
                  return (
                    <View style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
                      <Text
                        className={`font-primary-bold ${
                          isSelected ? 'text-white text-4xl' : 'text-gray-600 text-2xl'
                        }`}
                      >
                        {item.toString().padStart(2, '0')}
                      </Text>
                    </View>
                  );
                }}
              />
            </View>

            <Text className="text-white text-4xl font-primary-bold mx-2">:</Text>

            <View className="w-20 h-40 overflow-hidden">
              <FlatList
                ref={minuteListRef}
                data={minutes}
                keyExtractor={(item) => `minute-${item}`}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinuteScrollEnd}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 1.3 }}
                renderItem={({ item }) => {
                  const isSelected = item === selectedMinute;
                  return (
                    <View style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
                      <Text
                        className={`font-primary-bold ${
                          isSelected ? 'text-white text-4xl' : 'text-gray-600 text-2xl'
                        }`}
                      >
                        {item.toString().padStart(2, '0')}
                      </Text>
                    </View>
                  );
                }}
              />
            </View>
          </View>
          <Text className="text-center text-xs text-gray-400 mt-3 font-primary-medium">
            We’ll remind you every day at {formattedTime}
          </Text>
        </View>

        {/* Notification Preview */}
        <Animated.View
          style={{
            opacity: previewOpacity,
            transform: [{ translateY: previewTranslateY }],
          }}
        >
          <View className="bg-[#05070A] rounded-2xl px-4 py-3 flex-row items-center justify-between border border-white/15">
            <View className="flex-row items-center flex-1">
              <View className="w-11 h-11 rounded-[14px] bg-white/8 items-center justify-center mr-3">
                <Image
                  source={require('../../assets/icons/ios-light.png')}
                  style={{ width: 34, height: 34, borderRadius: 10 }}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="text-white font-primary-bold text-sm">Time to focus!</Text>
                  <Text className="text-gray-400 text-xs">now</Text>
                </View>
                <Text className="text-gray-300 text-xs font-primary-medium">
                  Let’s get started on your journey.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
