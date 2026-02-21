import React, { useCallback, useMemo } from 'react';
import { Text, View, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
    bottomSheetRef: React.RefObject<BottomSheet | null>;
    isPremium: boolean;
    onPressUpgrade: () => Promise<boolean> | void;
};

export function LiveActivityBottomSheet({ bottomSheetRef, isPremium, onPressUpgrade }: Props) {
    const snapPoints = useMemo(() => ['80%'], []);


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
                            Live Activity
                        </Text>
                        <Text className="text-gray-400 font-primary-medium mt-1">
                            See your current focus session on your lock screen.
                        </Text>
                    </View>

                </View>

                {/* Hero preview */}
                <LinearGradient
                    colors={['#111112', '#3D3C44', '#111112']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        borderRadius: 24,
                        marginBottom: 18,
                        paddingHorizontal: 16,
                        paddingVertical: 0,
                    }}
                >

                    {/* Visual preview – show only the bottom half of the phone */}
                    <View
                        className="flex-col items-center"
                        style={{
                            height: 240,
                            overflow: 'hidden',
                        }}
                    >
                        <Image
                            source={require('../../assets/images/liveActivity-widget.png')}
                            style={{
                                width: 300,
                                height: 600,
                                borderRadius: 36,
                                transform: [{ translateY: -350 }],
                            }}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Copy */}
                    <View className="flex-1 mr-4 mt-5">
                        <Text className="text-gray-200 font-primary-semibold text-base mb-2">
                            Glance at your missions without opening the app.
                        </Text>
                        <Text className="text-gray-400 font-primary-medium text-sm mb-4">
                            Allowing you to stay on track without unlocking your phone.
                        </Text>

                    </View>
                </LinearGradient>


                {/* Premium CTA / status */}
                {isPremium ? (
                    <View className="mt-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                        <Text className="text-emerald-300 font-primary-semibold text-sm mb-1">
                            Live Activity unlocked
                        </Text>
                        <Text className="text-emerald-100 font-primary-medium text-xs">
                            Your current and upcoming missions will appear on your lock screen and in your dynamic island.
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
                            Unlock Live Activity with First Class
                        </Text>
                    </TouchableOpacity>
                )}

            </BottomSheetView>
        </BottomSheet>
    );
}
