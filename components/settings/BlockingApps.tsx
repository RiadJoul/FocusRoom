import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import {
  DeviceActivitySelectionViewPersisted,
  AuthorizationStatus,
  type AuthorizationStatusType,
  getAuthorizationStatus,
  requestAuthorization,
} from 'react-native-device-activity';
import * as Haptics from 'expo-haptics';

type BlockAppsBottomSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  isEnabled: boolean;
  onChangeEnabled: (enabled: boolean) => void;
};

export function BlockAppsBottomSheet({
  bottomSheetRef,
  isEnabled,
  onChangeEnabled,
}: BlockAppsBottomSheetProps) {
  const [blockEnabled, setBlockEnabled] = useState<boolean>(isEnabled);
  const [authStatus, setAuthStatus] = useState<AuthorizationStatusType>(
    AuthorizationStatus.notDetermined
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const hasRequestedInitialAuthRef = useRef(false);
  const toggleLabelValue = useRef(new Animated.Value(isEnabled ? 1 : 0)).current; // 1 = ON, 0 = OFF

  // Keep internal toggle in sync with parent state
  useEffect(() => {
    setBlockEnabled(isEnabled);
    Animated.timing(toggleLabelValue, {
      toValue: isEnabled ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isEnabled]);

  // Load initial Screen Time authorization state
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    try {
      const status = getAuthorizationStatus();
      setAuthStatus(status);
    } catch (e) {
      console.warn('DeviceActivity getAuthorizationStatus error', e);
    }
  }, []);


  // Ensure Screen Time / Device Activity authorization is requested
  // even when the sheet opens with blocking already enabled.
  useEffect(() => {
    if (!blockEnabled) return;
    if (Platform.OS !== 'ios') return;
    if (hasRequestedInitialAuthRef.current) return;
    if (isRequestingRef.current) return;

    const ensureAuthorization = async () => {
      isRequestingRef.current = true;
      try {
        await requestAuthorization();
      } catch (e) {
        console.warn('DeviceActivity authorization error (initial)', e);
        Alert.alert(
          'Screen Time Access Needed',
          'To block apps during a focus session, FocusRoom needs access to Screen Time. You can enable this later in Settings.',
          [{ text: 'OK' }]
        );
      } finally {
        isRequestingRef.current = false;
        hasRequestedInitialAuthRef.current = true;
      }
    };

    ensureAuthorization();
  }, [blockEnabled]);

  const snapPoints = useMemo(() => ['90%'], []);

  const isRequestingRef = useRef(false);

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

  const handleToggle = useCallback(async () => {
    if (isRequesting) return;

    const next = !blockEnabled;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    if (next) {
      if (Platform.OS !== 'ios') {
        // Only iOS supports Screen Time – just flip the toggle.
        Animated.timing(toggleLabelValue, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
        setBlockEnabled(true);
        onChangeEnabled(true);
        return;
      }

      if (isRequestingRef.current) return;
      isRequestingRef.current = true;
      setIsRequesting(true);
      try {
        // Ask for Screen Time / Device Activity permission only when user turns this on
        // The native module will present the system dialog as needed.
        await requestAuthorization();

        const status = getAuthorizationStatus();
        setAuthStatus(status);

        if (status !== AuthorizationStatus.approved) {
          // User denied or has not approved – keep toggle OFF and do not show app list.
          Alert.alert(
            'Screen Time Access Needed',
            'To block apps during a focus session, FocusRoom needs access to Screen Time. You can enable this later in Settings.',
            [{ text: 'OK' }]
          );
          Animated.timing(toggleLabelValue, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start();
          setBlockEnabled(false);
          onChangeEnabled(false);
          isRequestingRef.current = false;
          setIsRequesting(false);
          return;
        }
      } catch (e) {
        console.warn('DeviceActivity authorization error', e);
        Alert.alert(
          'Screen Time Access Needed',
          'To block apps during a focus session, FocusRoom needs access to Screen Time. You can enable this later in Settings.',
          [{ text: 'OK' }]
        );
        isRequestingRef.current = false;
        setIsRequesting(false);
        return;
      }
      isRequestingRef.current = false;
      setIsRequesting(false);
    }
    //toggle animation
    Animated.timing(toggleLabelValue, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setBlockEnabled(next);
    onChangeEnabled(next);
  }, [blockEnabled, isRequesting, onChangeEnabled, toggleLabelValue]);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, [bottomSheetRef]);

  const handleSheetChange = useCallback(() => {
    // No-op for now; kept for symmetry with Notifications sheet
  }, []);

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
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-white text-xl font-primary-bold">Block apps during focus</Text>
          <TouchableOpacity
            onPress={handleClosePress}
            className={`bg-white px-4 py-2 rounded-lg`}
            activeOpacity={0.8}

          >
            <Text className="text-black font-primary-semibold text-base">Save</Text>
          </TouchableOpacity>
        </View>

        {/* toggle */}
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.8}
          className={`mb-5 rounded-2xl px-5 py-4 flex-row items-center justify-between border ${blockEnabled ? 'bg-green-400/20 border-green-400' : 'bg-background border-gray-600'
            }`}
        >
          <Text className="text-white font-primary-semibold">Block distracting apps</Text>
          <View className="flex-row items-center gap-x-2">
            {blockEnabled && !isRequesting && (
              <View className="w-2 h-2 rounded-full bg-green-400" />
            )}
            {isRequesting ? (
              <View style={{ marginLeft: 4 }}>
                <ActivityIndicator size="small" color="#a855f7" />
              </View>
            ) : (
              <View
                style={{
                  width: 36,
                  height: 18,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
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
            )}
          </View>
        </TouchableOpacity>

        {/* App selection view */}
        {blockEnabled && authStatus === AuthorizationStatus.approved && (
          <View className="bg-black/80 rounded-2xl py-4 border border-white/10">
            <Text className="text-white/80 text-sm font-primary-medium px-4">
              Choose which apps you want FocusRoom to block while you’re on a trip:
            </Text>

            <DeviceActivitySelectionViewPersisted
              style={{ height: 460}}
              

              familyActivitySelectionId="focusroom_block_apps"
              onSelectionChange={() => {
                // Native view persists selection under this id.
              }}
            />
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
