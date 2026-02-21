import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PremiumRecurringSlide } from '@/components/onboarding/PremiumRecurringSlide';
import { PremiumListsSlide } from '@/components/onboarding/PremiumListsSlide';
import { Premium3DSlide } from '@/components/onboarding/Premium3DSlide';
import { PremiumAnalyticsSlide } from '@/components/onboarding/PremiumAnalyticsSlide';
import { analytics, Events } from '@/lib/analytics';
import { PremiumTicketSlide } from '@/components/onboarding/PremiumTicketSlide';
import { PremiumWidgetsSlide } from '@/components/onboarding/PremiumWidgetsSlide';

const slides = [
  {
    key: 'overview',
    title: 'Welcome to First Class 🚀',
    subtitle: 'Here’s what you just unlocked in FocusRoom.',
  },
  {
    key: 'recurring',
    title: 'Recurring missions',
    subtitle: 'Create powerful recurring tasks that auto‑spawn your routines.',
  },
  {
    key: 'lists',
    title: 'Unlimited mission lists',
    subtitle: 'Organise every area of life with unlimited themed lists.',
  },
  {
    key: 'threeD',
    title: '3D space cockpit',
    subtitle: 'Fly your ship in cinematic 3D while the timer runs.',
  },
  {
    key: 'widgets',
    title: 'Widgets & StandBy',
    subtitle: 'Home, Lock Screen and StandBy widgets keep your mission in view.',
  },
  {
    key: 'analytics',
    title: 'Advanced focus analytics',
    subtitle: 'See streaks, distance travelled and focus health over time.',
  }
] as const;

type SlideKey = (typeof slides)[number]['key'];

export default function PremiumIntro() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    setButtonEnabled(false);
    const timeout = setTimeout(() => setButtonEnabled(true), 500);
    return () => clearTimeout(timeout);
  }, [index]);

  useEffect(() => {
    analytics.track(Events.PREMIUM_INTRO_STARTED).catch(() => { });
  }, []);

  const current = slides[index];

  const handleFinish = async () => {
    try {
      analytics.track(Events.PREMIUM_INTRO_COMPLETED).catch(() => { });
    } catch (err) {
      console.error('Error finishing premium intro:', err);
    } finally {
      router.replace('/(tabs)' as any);
    }
  };

  const handleNext = () => {
    if (!buttonEnabled) return;
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: width * nextIndex, animated: true });
      return;
    }
    handleFinish();
  };

  const renderBody = (key: SlideKey) => {
    if (key === 'recurring') {
      return <PremiumRecurringSlide />;
    }
    if (key === 'lists') {
      return <PremiumListsSlide />;
    }
    if (key === 'threeD') {
      return <Premium3DSlide />;
    }
    if (key === 'analytics') {
      return <PremiumAnalyticsSlide />;
    }
    if (key === 'widgets') {
      return <PremiumWidgetsSlide />;
    }
    // overview
    return <PremiumTicketSlide />;
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 pt-10">
        {/* Title + subtitle */}
        <View className="px-8 items-center mb-6">
          <Text className="text-3xl font-primary-bold text-white text-center mb-3">
            {current.title}
          </Text>
          {!!current.subtitle && (
            <Text className="text-base font-primary-medium text-gray-400 text-center">
              {current.subtitle}
            </Text>
          )}
        </View>

        {/* Swipeable bodies */}
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            pagingEnabled
            ref={scrollRef}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              if (newIndex !== index) {
                setIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {slides.map((slide) => (
              <View
                key={slide.key}
                style={{ width, paddingHorizontal: 32 }}
              >
                <View className="flex-1">
                  {renderBody(slide.key)}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Dots + button */}
      <View className="pb-10 px-8">
        {/* Dots */}
        <View className="flex-row justify-center mb-5">
          {slides.map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <View
              key={i}
              className={`h-2 rounded-full mx-1 ${i === index ? 'w-5 bg-white' : 'w-2 bg-gray-600'
                }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={!buttonEnabled}
          className={`py-4 rounded-2xl items-center ${buttonEnabled ? 'bg-white' : 'bg-white/20'
            }`}
        >
          <Text
            className={`font-primary-bold text-xl ${buttonEnabled ? 'text-black' : 'text-gray-400'
              }`}
          >
            {index < slides.length - 1 ? 'Next' : 'Let’s fly'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
