import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, TouchableOpacity, Image, Animated } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  isPremium: boolean;
  onPressUpgrade: () => Promise<boolean> | void;
};

export function WidgetBottomSheet({ bottomSheetRef, isPremium, onPressUpgrade }: Props) {
  const snapPoints = useMemo(() => ['80%'], []);

  const widgetPreviews = useMemo(
    () => [
      {
        key: 'habit',
        title: 'Habit orbit widget',
        subtitle: 'See your last 3 months of focused days at a glance.',
        image: require('../../assets/images/habit-widget.jpeg'),
        height: 140,
        width: 300,
      },
      {
        key: 'tasks',
        title: "Today’s missions widget",
        subtitle: 'Pin your top focus tasks to the Home, Lock, or StandBy screens.',
        image: require('../../assets/images/task-widget.jpeg'),
        height: 180,
        width: 180,
      },
    ],
    [],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    []
  );

  // Auto-advance between widget previews
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % widgetPreviews.length);
    }, 3000);
    return () => clearInterval(id);
  }, [widgetPreviews.length]);

  // Simple slide-in animation when the preview changes
  useEffect(() => {
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const opacity = slideAnim;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#0b0e0f' }}
      handleIndicatorStyle={{ backgroundColor: '#4B5563' }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}>
        {/* Header */}
        <View className="mb-3">
          <View>
            <Text className="text-2xl font-primary-bold text-white">
              Widgets
            </Text>
            <Text className="text-gray-400 font-primary-medium mt-1">
              Glance at your missions without opening the app.
            </Text>
          </View>

        </View>

        {/* Hero preview – auto-sliding between widget types */}
        <LinearGradient
          colors={['#111112', '#3D3C44', '#111112']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            marginBottom: 18,
            paddingHorizontal: 16,
            paddingVertical: 28,
          }}
        >
          <Animated.View
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              opacity,
              transform: [{ translateX }],
            }}
          >
            {/* Visual preview */}
            <View className="flex-col items-center">
              <Image
                source={widgetPreviews[currentIndex].image}
                style={{ width: widgetPreviews[currentIndex].width, height: widgetPreviews[currentIndex].height, borderRadius: 14 }}
              />
            </View>
          </Animated.View>
          {/* Copy */}
          <View className="flex-1 mr-4 mt-5">
            <Text className="text-gray-200 font-primary-semibold text-base mb-2">
              {widgetPreviews[currentIndex].title}
            </Text>
            <Text className="text-gray-400 font-primary-medium text-sm mb-4">
              {widgetPreviews[currentIndex].subtitle}
            </Text>

            <View className="flex-row items-center gap-x-2 mt-1">
              {widgetPreviews.map((w, idx) => (
                <View
                  key={w.key}
                  className="h-1.5 rounded-full"
                  style={{
                    width: idx === currentIndex ? 18 : 8,
                    backgroundColor:
                      idx === currentIndex ? '#a855f7' : 'rgba(148, 163, 184, 0.6)',
                  }}
                />
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Premium CTA / status */}
        {isPremium ? (
          <View className="mt-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <Text className="text-emerald-300 font-primary-semibold text-sm mb-1">
              Widgets unlocked
            </Text>
            <Text className="text-emerald-100 font-primary-medium text-xs">
              Add FocusRoom from the widget gallery to start using your mission and habit widgets.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPressUpgrade}
            className="bg-white mt-3"
            style={{
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: 'center',
              shadowColor: '#a855f7',
              shadowOpacity: 0.9,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <Text className="text-black font-primary-semibold text-lg">
              Unlock widgets with First Class
            </Text>
          </TouchableOpacity>
        )}

        {/* Placement tips */}
        {isPremium && <View className="mt-4 gap-y-2">
          <Text className="text-gray-400 font-primary-medium text-xs mb-1">
            HOW TO ADD
          </Text>
          <View className="bg-zinc-900/80 border border-zinc-700 rounded-2xl px-4 py-3 gap-y-2">
            <View className="flex-row items-center justify-between">
              
              <Text className="text-gray-300 font-primary-medium text-sm">
                 Home Screen → Long-press → + → FocusRoom
              </Text>
            </View>
          </View>
        </View>}

      </BottomSheetView>
    </BottomSheet>
  );
}
