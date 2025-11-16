import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming
} from 'react-native-reanimated';

interface IntroModalProps {
  visible: boolean;
  onClose: () => void;
}

const INTRO_ITEMS = [
  { text: 'Stop procrastinating', delay: 800 },
  { text: 'Lock in and focus', delay: 1500 },
  { text: 'Get your shit done', delay: 2500 },
];

function IntroItem({ text, delay, index }: { text: string; delay: number; index: number }) {
  const opacity = useSharedValue(1);
  const strikethrough = useSharedValue(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    // Animate the strikethrough after the delay
    strikethrough.value = withDelay(
      delay,
      withTiming(1, { duration: 400 })
    );
  }, []);

  const strikethroughStyle = useAnimatedStyle(() => {
    return {
      width: strikethrough.value * textWidth,
    };
  });

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 150)}
      className="flex-row items-center mb-4"
    >
      <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
        <Text className="text-white font-primary-bold text-base">✓</Text>
      </View>
      <View className="relative">
        <Text 
          className="text-gray-700 font-primary-medium text-sm"
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        >
          {text}
        </Text>
        <Animated.View 
          style={[strikethroughStyle, { height: 2 }]}
          className="absolute top-1/3 left-0 bg-gray-500"
        />
      </View>
    </Animated.View>
  );
}

export function IntroModal({ visible, onClose }: IntroModalProps) {
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const buttonOpacity = useSharedValue(0.5);
  const buttonScale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      // Enable button after all animations complete (3.5 seconds)
      const timeout = setTimeout(() => {
        setButtonEnabled(true);
        buttonOpacity.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.95, { duration: 200 }),
          withTiming(1, { duration: 200 })
        );
        buttonScale.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(1.05, { duration: 200 }),
          withTiming(1, { duration: 200 })
        );
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <Animated.View 
          entering={FadeIn.duration(400)}
          className="bg-white rounded-3xl p-8 w-full max-w-md"
        >
          {/* Title */}
          <Animated.Text 
            entering={FadeInDown}
            className="text-background font-primary-bold text-3xl mb-2"
          >
            Welcome to FocusRoom!
          </Animated.Text>

          {/* Subtitle */}
          <Animated.View 
            entering={FadeInDown.delay(200)}
            className="bg-gray-100 rounded-2xl p-6 mb-6 mt-6"
          >
            <Text className="text-gray-700 font-primary-semibold text-base mb-4">
              FocusRoom can help you...
            </Text>

            {/* Animated List Items */}
            {INTRO_ITEMS.map((item, index) => (
              <IntroItem 
                key={index}
                text={item.text}
                delay={item.delay}
                index={index}
              />
            ))}

            {/* Final Item - Now it's your turn */}
            <Animated.View 
              entering={FadeInDown.delay(450)}
              className="flex-row items-center"
            >
              <View className="w-8 h-8 rounded-full border-2 border-gray-300 items-center justify-center mr-3">
                <View className="w-3 h-3 rounded-full bg-gray-300" />
              </View>
              <Text className="text-gray-700 font-primary-medium text-base">
                Now it's your turn! ✨
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              onPress={onClose}
              disabled={!buttonEnabled}
              className={`py-4 rounded-xl items-center ${
                buttonEnabled ? 'bg-black' : 'bg-gray-300'
              }`}
              activeOpacity={0.8}
            >
              <Text className={`font-primary-bold text-lg ${
                buttonEnabled ? 'text-white' : 'text-gray-500'
              }`}>
                Let's go!
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
