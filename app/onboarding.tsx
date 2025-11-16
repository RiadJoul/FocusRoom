import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const slides = [
    {
        question: 'Welcome aboard! 👋',
        description: 'Your journey to deep focus begins here.',
        buttonText: 'Hi!',
    },
    {
        question: 'Do you often feel distracted?',
        highlightWord: 'distracted',
        buttonText: 'Yes, I do.',
    },
    {
        question: 'Do you often find it \nhard to focus?',
        highlightWord: 'hard to focus',
        buttonText: 'Yes, how can i fix it?',
    },
    {
        question: "That's why we created FocusRoom",
        highlightWord: 'FocusRoom',
        buttonText: 'Get Started',
    },
];

export default function Onboarding() {
    const [index, setIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const router = useRouter();

    // Animation values
    const questionSlideAnim = useRef(new Animated.Value(-100)).current;
    const descriptionSlideAnim = useRef(new Animated.Value(-80)).current;
    const blurOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const wavyAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Initial animation on mount
    useEffect(() => {
        animateScreenIn();
    }, []);

    // Animate wavy effect for highlighted words
    useEffect(() => {
        const highlightWord = slides[index].highlightWord;
        const isGlowing = highlightWord === 'Hyperfocus' || highlightWord === 'FocusRoom';
        
        let wavySequence: Animated.CompositeAnimation | null = null;
        
        if (highlightWord && !isGlowing) {
            // Only animate wavy for non-glowing words
            wavySequence = Animated.loop(
                Animated.sequence([
                    Animated.timing(wavyAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(wavyAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            wavySequence.start();
        }
        
        return () => {
            if (wavySequence) {
                wavySequence.stop();
            }
        };
    }, [index]);

    // Animate glow effect for special words
    useEffect(() => {
        const isGlowing = slides[index].highlightWord === 'Hyperfocus' ||
            slides[index].highlightWord === 'FocusRoom';

        let glowSequence: Animated.CompositeAnimation | null = null;
        
        if (isGlowing) {
            glowSequence = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                ])
            );
            glowSequence.start();
        }
        
        return () => {
            if (glowSequence) {
                glowSequence.stop();
            }
        };
    }, [index]);

    // Animate screen in - slide down from top with blur clearing
    const animateScreenIn = () => {
        // Reset animations
        questionSlideAnim.setValue(-100);
        descriptionSlideAnim.setValue(-80);
        blurOpacity.setValue(1);
        contentOpacity.setValue(0);
        buttonOpacity.setValue(0);

        Animated.parallel([
            // Question slides down
            Animated.spring(questionSlideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
            // Description slides down (slightly delayed)
            Animated.spring(descriptionSlideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                delay: 100,
                useNativeDriver: true,
            }),
            // Clear the blur in 1 second
            Animated.timing(blurOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }),
            // Fade in content
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // After text is clear, show button
            setIsTransitioning(false);
            Animated.timing(buttonOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        });
    };

    const next = async () => {
        if (isTransitioning) return;

        const last = slides.length - 1;

        if (index < last) {
            setIsTransitioning(true);

            // Fade out current screen (including button)
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(blurOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(questionSlideAnim, {
                    toValue: 50,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(descriptionSlideAnim, {
                    toValue: 50,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Move to next screen AFTER fade out completes
                const nextIndex = index + 1;
                setIndex(nextIndex);

                // Animate in new screen
                setTimeout(() => {
                    animateScreenIn();
                }, 100);
            });
            return;
        }

        // Final transition to login
        setIsTransitioning(true);
        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(buttonOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(blurOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(async () => {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            router.replace('/login' as any);
        });
    };

    const currentSlide = slides[index];

    // Function to render question with highlighted word
    const renderQuestion = () => {
        const { question, highlightWord } = currentSlide;

        if (!highlightWord) {
            return (
                <Text className="text-3xl font-primary-bold text-white text-start leading-tight">
                    {question}
                </Text>
            );
        }

        const parts = question.split(highlightWord);
        const isGlowing = highlightWord === 'Hyperfocus' || highlightWord === 'FocusRoom';

        const isLastSlide = highlightWord === 'FocusRoom';
        if (isGlowing) {
            // For glowing words, use separate animated view for glow effect
            return (
                <>

                    <View className="flex-row items-center">
                        <Text className="text-3xl font-primary-bold text-white text-start leading-tight">
                            {parts[0]}
                            <Animated.Text
                                style={{
                                    color: '#FFFFFF',
                                    fontSize: 28,
                                    fontWeight: 'bold',
                                    textShadowColor: 'rgba(255, 255, 255, 0.8)',
                                    textShadowOffset: { width: 0, height: 0 },
                                    textShadowRadius: glowAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [8, 20],
                                    }),
                                }}
                            >
                                {highlightWord}
                            </Animated.Text>
                            {parts[1]}
                        </Text>

                    </View>
                    {isLastSlide && (
                        <Animated.Image
                            source={require('../assets/icons/ios-light.png')}
                            className="mt-5 rounded-lg"
                            style={{
                                width: 60,
                                height: 60,

                                opacity: glowAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1],
                                }),
                            }}
                            resizeMode="contain"
                        />
                    )}
                </>
            );
        }

        // For non-glowing words, use wavy animation
        return (
            <Text className="text-3xl font-primary-bold text-white text-start leading-tight">
                {parts[0]}
                <Animated.Text
                    style={{
                        transform: [
                            {
                                translateY: wavyAnim.interpolate({
                                    inputRange: [0, 0.25, 0.5, 0.75, 1],
                                    outputRange: [0, -3, 0, 3, 0],
                                }),
                            },
                            {
                                rotate: wavyAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: ['0deg', '2deg', '0deg'],
                                }),
                            },
                        ],
                        opacity: wavyAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 0.85, 1],
                        }),
                        color: '#EF4444',
                        fontSize: 28,
                        fontWeight: 'bold',
                    }}
                >
                    {highlightWord}
                </Animated.Text>
                {parts[1]}
            </Text>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <View className="flex-1 items-center justify-center px-8">
                {/* Question Text with smooth drop and blur */}
                <Animated.View
                    style={{
                        opacity: contentOpacity,
                        transform: [{ translateY: questionSlideAnim }],
                    }}
                    className="w-full"
                >
                    <View className="relative mb-8">
                        {renderQuestion()}

                        {/* Blur overlay */}
                        <Animated.View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                opacity: blurOpacity,
                            }}
                            pointerEvents="none"
                        />
                    </View>
                </Animated.View>

                {/* Description with smooth drop and blur */}
                {currentSlide.description && (
                    <Animated.View
                        style={{
                            opacity: contentOpacity,
                            transform: [{ translateY: descriptionSlideAnim }],
                        }}
                        className="w-full"
                    >
                        <View className="relative mb-12">
                            <Text className="text-2xl font-primary-medium text-gray-400 text-start">
                                {currentSlide.description}
                            </Text>

                            {/* Blur overlay */}
                            <Animated.View
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    opacity: blurOpacity,
                                }}
                                pointerEvents="none"
                            />
                        </View>
                    </Animated.View>
                )}
            </View>

            {/* Bottom Section - Button */}
            <Animated.View
                className="pb-8 pt-4"
                style={{ opacity: buttonOpacity }}
                pointerEvents={isTransitioning ? "none" : "auto"}
            >
                <View className="px-8">
                    <TouchableOpacity
                        onPress={next}
                        className="py-5 rounded-2xl items-center shadow-lg bg-white"
                        activeOpacity={0.8}
                    >
                        <Text className="font-primary-bold text-lg tracking-wide text-black">
                            {currentSlide.buttonText}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}