import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Animated, Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    title: 'Focus Without Overwhelm',
    subtitle:
      'No clutter, no endless lists — just your top 5 priorities so you can actually finish what matters.',
    illustration: require('../assets/illustrations/focus-illustration.svg'),
  },
  {
    title: 'Simple, Organized, Intentional',
    subtitle:
      'Create clear lists for School, Work, or Home — and keep your mind calm with automatic task cleanup.',
    illustration: require('../assets/illustrations/organize-illustration.svg'),
  },
  {
    title: 'Earn Your Screen Time',
    subtitle:
      'Turn on Strict Mode to block distractions until your tasks are done. Focus first, scroll later.',
    illustration: require('../assets/illustrations/distractions-illustration.svg'),
  },
];



export default function Onboarding() {
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView | null>(null);
    const [index, setIndex] = useState(0);
    const router = useRouter();
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const next = async () => {
        const last = slides.length - 1;
        if (index < last) {
            const nextIndex = index + 1;
            scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
            setIndex(nextIndex);
            return;
        }

        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/login' as any);
    };

    const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(newIndex);
    };

    return (
        <SafeAreaView className="flex-1 bg-midnight-black">

            <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={onMomentumScrollEnd}
                scrollEventThrottle={16}
                ref={scrollRef as any}
            >
                {slides.map((s, i) => (
                    <View 
                        key={i} 
                        style={{ width }} 
                        className="items-center justify-center px-8 pt-20"
                    >
                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim }
                                ],
                            }}
                            className="items-center"
                        >
                            {/* Illustration with backdrop glow */}
                            <View className="relative mb-12">
                                <View 
                                    className="absolute inset-0 bg-primary/10 rounded-full blur-3xl"
                                    style={{ 
                                        width: 320, 
                                        height: 320,
                                        transform: [{ scale: 0.8 }]
                                    }}
                                />
                                <Image
                                    source={s.illustration}
                                    style={{ width: 320, height: 320 }}
                                    contentFit="contain"
                                />
                            </View>

                            {/* Title */}
                            <Text className="text-3xl font-primary-bold text-primary text-center mb-4 px-4">
                                {s.title}
                            </Text>

                            {/* Subtitle */}
                            <Text className="text-lg font-primary-medium text-white text-center leading-7 px-2">
                                {s.subtitle}
                            </Text>
                        </Animated.View>
                    </View>
                ))}
            </Animated.ScrollView>

            {/* Bottom Section */}
            <View className="pb-8 pt-4">
                {/* Pagination Dots */}
                <View className="flex-row justify-center items-center mb-8">
                    {slides.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 16, 8],
                            extrapolate: 'clamp',
                        });
                        
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={i}
                                style={{
                                    width: dotWidth,
                                    opacity,
                                }}
                                className="h-2 rounded-full bg-primary mx-1"
                            />
                        );
                    })}
                </View>

                {/* Action Button */}
                <View className="px-8">
                    <TouchableOpacity 
                        onPress={next} 
                        className="bg-primary py-5 rounded-2xl items-center shadow-lg"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-primary-bold text-lg tracking-wide">
                            {index === slides.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}