import React, { useCallback, useMemo } from 'react';
import { Text, View, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

type Props = {
    bottomSheetRef: React.RefObject<BottomSheet | null>;
    isPremium: boolean;
    onPressUpgrade: () => Promise<boolean> | void;
};

export function StandbyBottomSheet({ bottomSheetRef, isPremium, onPressUpgrade }: Props) {
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
                            Standby Mode
                        </Text>
                        <Text className="text-gray-400 font-primary-medium mt-1">
                            Your phone becomes a sleek, full-screen - perfect for your desk or nightstand.
                        </Text>
                    </View>

                </View>

                {/* Hero preview */}
                <View
                className='mb-4'
                >
                    <Image
                        source={require('../../assets/images/standBy-widget.png')}
                        style={{ width: '100%', height: 300, borderRadius: 24 }}
                        resizeMode="cover"
                    />
                    
                </View>


                {/* Premium CTA / status */}
                {isPremium ? (
                    <View className="mt-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                        <Text className="text-emerald-300 font-primary-semibold text-sm mb-1">
                            Standby Mode is enabled on your account.
                        </Text>
                        <Text className="text-emerald-100 font-primary-medium text-xs">
                            Make sure standBy is enabled in your device settings.
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
                            Unlock Stand By with First Class
                        </Text>
                    </TouchableOpacity>
                )}

            </BottomSheetView>
        </BottomSheet>
    );
}
