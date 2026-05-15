import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

type NotificationBottomSheetProps = {
  isNotificationEnabled: boolean;
  initialHour?: number | null;
  initialMinute?: number | null;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onSave: (settings: { enabled: boolean; hour: number; minute: number }) => Promise<void> | void;
  isSaving: boolean;
};

export function NotificationsBottomSheet({
  isNotificationEnabled,
  initialHour,
  initialMinute,
  bottomSheetRef,
  onSave,
  isSaving,
}: NotificationBottomSheetProps) {
  const [notificationEnabled, setNotificationEnabled] = useState(isNotificationEnabled);
  const [selectedHour, setSelectedHour] = useState(initialHour ?? 10);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute ?? 0);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);

  const snapPoints = useMemo(() => ['75%'], []);

  const notificationPreviewTranslateY = useRef(new Animated.Value(40)).current;
  const notificationPreviewOpacity = useRef(new Animated.Value(0)).current;
  const toggleLabelValue = useRef(new Animated.Value(1)).current; // 1 = ON, 0 = OFF

  const ITEM_HEIGHT = 40;

  // Keep local state in sync if user object changes
  useEffect(() => {
    setNotificationEnabled(isNotificationEnabled);
    toggleLabelValue.setValue(isNotificationEnabled ? 1 : 0);
  }, [isNotificationEnabled, toggleLabelValue]);

  useEffect(() => {
    if (typeof initialHour === 'number') {
      setSelectedHour(initialHour);
    }
  }, [initialHour]);

  useEffect(() => {
    if (typeof initialMinute === 'number') {
      setSelectedMinute(initialMinute);
    }
  }, [initialMinute]);

  // When notifications are enabled and we have stored values,
  // keep the wheels aligned with the saved hour/minute.
  useEffect(() => {
    if (!notificationEnabled) return;

    if (typeof initialHour === 'number') {
      setSelectedHour(initialHour);
      if (hourListRef.current) {
        hourListRef.current.scrollToOffset({
          offset: initialHour * ITEM_HEIGHT,
          animated: false,
        });
      }
    }

    if (typeof initialMinute === 'number') {
      setSelectedMinute(initialMinute);
      if (minuteListRef.current) {
        minuteListRef.current.scrollToOffset({
          offset: initialMinute * ITEM_HEIGHT,
          animated: false,
        });
      }
    }
  }, [notificationEnabled, initialHour, initialMinute]);

  const animatePreviewIn = useCallback(() => {
    notificationPreviewTranslateY.setValue(40);
    notificationPreviewOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(notificationPreviewTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(notificationPreviewOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [notificationPreviewOpacity, notificationPreviewTranslateY]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        // Center currently selected time
        if (hourListRef.current) {
          hourListRef.current.scrollToOffset({
            offset: selectedHour * ITEM_HEIGHT,
            animated: false,
          });
        }
        if (minuteListRef.current) {
          minuteListRef.current.scrollToOffset({
            offset: selectedMinute * ITEM_HEIGHT,
            animated: false,
          });
        }

        animatePreviewIn();
      } else {
        notificationPreviewTranslateY.setValue(40);
        notificationPreviewOpacity.setValue(0);
      }
    },
    [
      animatePreviewIn,
      selectedHour,
      selectedMinute,
      ITEM_HEIGHT,
      notificationPreviewOpacity,
      notificationPreviewTranslateY,
    ]
  );

  const handleHourScrollEnd = (event: any) => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = hours[index];
    if (value !== undefined) {
      setSelectedHour(value);
    }
  };

  const handleMinuteScrollEnd = (event: any) => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = minutes[index];
    if (value !== undefined) {
      setSelectedMinute(value);
    }
  };

  const closeNotificationSheet = () => {
    bottomSheetRef.current?.close();
  };

  const handleToggleNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    const next = !notificationEnabled;

    // If turning ON, ensure notification permissions are granted
    if (next) {
      try {
        let { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') {
          const result = await Notifications.requestPermissionsAsync();
          status = result.status;
        }

        if (status !== 'granted') {
          Alert.alert(
            'Enable Notifications',
            'Notifications are currently turned off for FocusRoom. Enable them in Settings to receive your daily reminder.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Linking.openSettings) {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );

          // Keep toggle OFF if permission not granted
          setNotificationEnabled(false);
          Animated.timing(toggleLabelValue, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start();
          return;
        }
      } catch (error) {
        console.warn('Error checking notification permissions', error);
      }
    }

    setNotificationEnabled(next);

    Animated.timing(toggleLabelValue, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

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

  const handleDonePress = async () => {
    try {
      await onSave({
        enabled: notificationEnabled,
        hour: selectedHour,
        minute: selectedMinute,
      });
      closeNotificationSheet();
    } catch (e) {
      // parent handles error via onSave (e.g. Alert)
      console.error('Failed to save notification settings:', e);
    }
  };

  //

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: '#0b0e0f' }}
      handleIndicatorStyle={{ backgroundColor: '#4B5563' }}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-xl font-primary-bold">Notifications</Text>
          <TouchableOpacity
            onPress={handleDonePress}
            className={`bg-white px-4 py-2 rounded-lg ${isSaving ? 'opacity-60' : ''}`}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text className="text-black font-primary-semibold text-base">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Notification toggle */}
        <TouchableOpacity
          onPress={handleToggleNotification}
          activeOpacity={0.8}
          className={`rounded-2xl px-5 py-4 flex-row items-center justify-between border ${notificationEnabled ? 'bg-green-400/20 border-green-400' : 'bg-background border-gray-600'
            }`}
        >
          <Text className="text-white font-primary-semibold">Notification</Text>
          <View className="flex-row items-center gap-x-2">
            {notificationEnabled && <View className="w-2 h-2 rounded-full bg-green-400" />}
            <View style={{ width: 36, height: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <Animated.Text
                className="text-white font-primary-semibold"
                style={{
                  position: 'absolute',
                  transform: [
                    {
                      translateX: toggleLabelValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-12, 0], // slide in from left when turning ON
                      }),
                    },
                  ],
                  opacity: toggleLabelValue,
                }}
              >
                ON
              </Animated.Text>
              <Animated.Text
                className="text-white font-primary-semibold"
                style={{
                  position: 'absolute',
                  transform: [
                    {
                      translateX: toggleLabelValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 12], // slide out to right when turning ON
                      }),
                    },
                  ],
                  opacity: toggleLabelValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }}
              >
                OFF
              </Animated.Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Phone mockup with time picker + preview */}
        <View className="bg-black/80 rounded-[17px] px-4 pt-3 pb-5 mt-6 border border-white/10">
          {/* Fake status bar */}
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-white font-primary-medium text-base">09:41</Text>
            <View className="flex-row items-center gap-x-1">
              <View className="w-12 h-5 rounded-full bg-white/10" />
              <View className="w-5 h-5 rounded-full bg-white/40" />
            </View>
          </View>

          {/* Inner content */}
          {/* Time Picker */}
          <View className="bg-white/10 rounded-3xl py-4 px-2 mb-4">
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
                      <View
                        style={{ height: ITEM_HEIGHT }}
                        className="items-center justify-center"
                      >
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
                      <View
                        style={{ height: ITEM_HEIGHT }}
                        className="items-center justify-center"
                      >
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
          </View>

          {/* Notification Preview */}
          <Animated.View
          className="mt-5"
            style={{
              opacity: notificationPreviewOpacity,
              transform: [{ translateY: notificationPreviewTranslateY }],
            }}
          >
            <View className="bg-background rounded-2xl px-4 py-3 flex-row items-center justify-between border border-white/90">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center mr-4">
                  <Image
                    source={require('../../assets/icons/ios-light.png')}
                    style={{ width: 45, height: 45 }}
                    className="rounded-xl"
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-white font-primary-bold text-lg">Time to focus!</Text>
                    <Text className="text-gray-400 text-sm">now</Text>
                  </View>
                  <Text className="text-gray-300 text-base">
                    Let’s get started on your journey.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        
      </BottomSheetView>
    </BottomSheet>
  );
}
