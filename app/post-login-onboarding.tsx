import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListsSlide } from '@/components/onboarding/ListsSlide';
import { BenefitsSlide } from '@/components/onboarding/BenefitsSlide';
import { NotificationTimeSlide } from '@/components/onboarding/NotificationTimeSlide';
import { TicketIntroSlide } from '@/components/onboarding/TicketIntroSlide';
import { SpaceMapSlide } from '@/components/onboarding/SpaceMapSlide';
import { BlockingAppsSlide } from '@/components/onboarding/BlockingAppsSlide';
import { FreeTrialSlide } from '@/components/onboarding/FreeTrialSlide';
import { TrialReminderSlide } from '@/components/onboarding/TrialReminderSlide';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/lib/stores/userStore';
import {
  requestAuthorization as requestScreenTimeAuthorization,
} from 'react-native-device-activity';
import { analytics, Events } from '@/lib/analytics';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_SLIDES = [
  {
    key: 'spaceRoute',
    title: 'Your focus journey',
    subtitle: 'Watch your ship travel from distraction to deep focus.',
  },
  {
    key: 'stats',
    title: 'See your progress',
    subtitle: 'Deep stats turn your sessions into streaks, distance and wins.',
  },
  {
    key: 'benefits',
    title: 'With FocusRoom \n you can...',
    subtitle: '',
  },
  {
    key: 'lists',
    title: 'Choose your focus \n target 🎯',
    subtitle: 'Lists help you track how you work across different missions.',
  },
  {
    key: 'notifications',
    title: 'Pick your daily \n focus time 🔔',
    subtitle: "We'll nudge you once a day \n when it's time to lock in.",
  },
  {
    key: 'blockingApps',
    title: 'Shield your focus',
    subtitle: 'Let FocusRoom block distracting apps \n while you work.',
  },
] as const;

const TRIAL_SLIDES = [
  {
    key: 'freeTrial',
    title: 'We want you to try \n First Class for free ',
    subtitle: '',
  },
  {
    key: 'trialReminder',
    title: "We've got your back",
    subtitle: "We'll remind you 1 day before your trial ends.",
  },
] as const;

type SlideKey = (typeof BASE_SLIDES)[number]['key'] | (typeof TRIAL_SLIDES)[number]['key'];

export default function PostLoginOnboarding() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const slides = user?.is_premium ? BASE_SLIDES : [...BASE_SLIDES, ...TRIAL_SLIDES];
  const [index, setIndex] = useState(0);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(9);
  const [notificationMinute, setNotificationMinute] = useState(0);
  const [isRequestingBlockingApps, setIsRequestingBlockingApps] = useState(false);
  const premiumGlow = useRef(new Animated.Value(0)).current;
  const premiumFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setButtonEnabled(false);
    const timeout = setTimeout(() => setButtonEnabled(true), 200);
    return () => clearTimeout(timeout);
  }, [index]);

  // Premium slide animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(premiumGlow, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(premiumGlow, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(premiumFloat, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(premiumFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [premiumGlow, premiumFloat]);

  // Track start once
  useEffect(() => {
    analytics.track(Events.POST_LOGIN_ONBOARDING_STARTED).catch(() => {});
  }, []);

  // Track slide view on index change
  useEffect(() => {
    const slide = slides[index];
    analytics
      .track(Events.POST_LOGIN_ONBOARDING_SLIDE_VIEWED, {
        slide_key: slide.key,
        slide_title: slide.title,
      })
      .catch(() => {});
  }, [index]);

  const current = slides[index];

  const handleNext = async () => {
    if (!buttonEnabled) return;

    const currentKey = slides[index].key as SlideKey;

    analytics
      .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
        action: 'next',
        slide_key: currentKey,
      })
      .catch(() => {});

    // On notifications slide, request permission and set default 09:00
    if (currentKey === 'notifications' && user?.id) {
      try {
        let { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') {
          const result = await Notifications.requestPermissionsAsync();
          status = result.status;
        }

        if (status === 'granted') {
          const { error } = await supabase
            .from('users')
            .update({
              notification_enabled: true,
              notification_hour: notificationHour,
              notification_minute: notificationMinute,
            })
            .eq('id', user.id);

          if (error) {
            console.warn('Failed to save default notification settings', error);
          } else {
            analytics
              .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
                action: 'allow_notifications_success',
                slide_key: currentKey,
                hour: notificationHour,
                minute: notificationMinute,
              })
              .catch(() => {});
            useUserStore.setState({
              user: {
                ...user,
                notification_enabled: true,
                notification_hour: notificationHour,
                notification_minute: notificationMinute,
              },
            });
          }
        } else {
          Alert.alert(
            'Notifications off',
            'You can turn on your daily reminder later from the Settings screen.',
          );
          analytics
            .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
              action: 'allow_notifications_denied',
              slide_key: currentKey,
            })
            .catch(() => {});
        }
      } catch (e) {
        console.warn('Error setting up notifications from onboarding', e);
        analytics
          .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
            action: 'allow_notifications_error',
            slide_key: currentKey,
          })
          .catch(() => {});
      }
    }

    // On blocking apps slide, request Screen Time / Device Activity access and
    // enable the global "block apps" toggle so Settings picks it up.
    if (currentKey === 'blockingApps') {
      if (Platform.OS === 'ios') {
        try {
          setIsRequestingBlockingApps(true);
          await requestScreenTimeAuthorization();
          analytics
            .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
              action: 'allow_blocking_apps_success',
              slide_key: currentKey,
            })
            .catch(() => {});
        } catch (e) {
          console.warn('Error requesting Screen Time authorization from onboarding', e);
          Alert.alert(
            'Screen Time Access Needed',
            'We could not request Screen Time access right now. You can enable it later from the Settings screen.',
          );
          analytics
            .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
              action: 'allow_blocking_apps_error',
              slide_key: currentKey,
            })
            .catch(() => {});
        } finally {
          setIsRequestingBlockingApps(false);
        }
      }
    }

    if (index < slides.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }

    // Last slide: mark onboarding as seen
    await AsyncStorage.setItem('hasSeenPostLoginOnboarding', 'true');

    // Immediately present the paywall for non‑premium users.
    if (user?.id && !user.is_premium) {
      const now = Date.now();
      const didPurchase = await presentPaywallOnce({
        userId: user.id,
        source: 'post_login_onboarding',
      });

      if (!didPurchase) {
        // Seed the 2‑hour soft paywall timer used in RootLayout so the
        // user doesn't see another paywall immediately on app open.
        await AsyncStorage.setItem(
          'paywall_last_shown_root_layout',
          String(now),
        );
      }
    }

    router.replace('/(tabs)' as any);
  };

  const handleSkip = async () => {
    // Skip should NOT trigger side effects like notification or Screen Time permission.
    const currentKey = slides[index].key as SlideKey;

    analytics
      .track(Events.POST_LOGIN_ONBOARDING_ACTION, {
        action: 'skip',
        slide_key: currentKey,
      })
      .catch(() => {});

    if (index < slides.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }

    // Last slide: finish onboarding
    analytics.track(Events.POST_LOGIN_ONBOARDING_COMPLETED).catch(() => {});
    await AsyncStorage.setItem('hasSeenPostLoginOnboarding', 'true');

    // Also surface the paywall when the user has seen all slides,
    // even if they used "Skip" on the last one.
    if (user?.id && !user.is_premium) {
      const now = Date.now();
      const didPurchase = await presentPaywallOnce({
        userId: user.id,
        source: 'post_login_onboarding_skip',
      });

      if (!didPurchase) {
        await AsyncStorage.setItem(
          'paywall_last_shown_root_layout',
          String(now),
        );
      }
    }

    router.replace('/(tabs)' as any);
  };

  const renderBody = (key: SlideKey) => {
    if (key === 'lists') {
      return <ListsSlide />;
    }
    if (key === 'spaceRoute') {
      return <SpaceMapSlide />;
    }
    if (key === 'benefits') {
      return <BenefitsSlide />;
    }
    if (key === 'blockingApps') {
      return <BlockingAppsSlide />;
    }
    if (key === 'notifications') {
      return (
        <NotificationTimeSlide
          hour={notificationHour}
          minute={notificationMinute}
          onChangeTime={({ hour, minute }) => {
            setNotificationHour(hour);
            setNotificationMinute(minute);
          }}
        />
      );
    }

    if (key === 'freeTrial') {
      return <FreeTrialSlide />;
    }
    if (key === 'trialReminder') {
      return <TrialReminderSlide />;
    }
    // stats slide
    return <TicketIntroSlide />;
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-8 pt-10">
        {/* Title + subtitle */}
        <View className="items-center mb-6">
          <Text className="text-3xl font-primary-bold text-white text-center mb-3">
            {current.title}
          </Text>
          {!!current.subtitle && (
            <Text className="text-base font-primary-medium text-gray-400 text-center">
              {current.subtitle}
            </Text>
          )}
        </View>

        <View className="flex-1">{renderBody(current.key)}</View>
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

        {current.key === 'notifications' ? (
          <>
            {/* For notifications slide: text actions only */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.85}
              className="py-3 rounded-2xl items-center bg-white/90"
            >
              <Text className="font-primary-bold text-xl text-black">Allow notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.8}
              className="mt-5 items-center"
            >
              <Text className="text-gray-400 font-primary-medium text-base">Skip for now</Text>
            </TouchableOpacity>
          </>
        ) : current.key === 'blockingApps' ? (
          <>
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={isRequestingBlockingApps}
              className={`py-3 rounded-2xl items-center ${
                isRequestingBlockingApps ? 'bg-white/60' : 'bg-white/90'
              }`}
            >
              {isRequestingBlockingApps ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="font-primary-bold text-xl text-black">Allow blocking apps</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.8}
              className="mt-5 items-center"
            >
              <Text className="text-gray-400 font-primary-medium text-base">Skip for now</Text>
            </TouchableOpacity>
          </>

        ) : current.key === 'trialReminder' ? (
          <>
            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.setItem('hasSeenPostLoginOnboarding', 'true');
                if (user?.id) {
                  const now = Date.now();
                  const didPurchase = await presentPaywallOnce({ userId: user.id, source: 'trial_reminder_onboarding' });
                  if (!didPurchase) {
                    await AsyncStorage.setItem('paywall_last_shown_root_layout', String(now));
                  }
                }
                router.replace('/(tabs)' as any);
              }}
              activeOpacity={0.85}
              disabled={!buttonEnabled}
              className={`py-4 rounded-2xl items-center ${buttonEnabled ? 'bg-white' : 'bg-white/20'}`}
            >
              <Text className={`font-primary-bold text-xl ${buttonEnabled ? 'text-black' : 'text-gray-400'}`}>
                Try for $0.00
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.setItem('hasSeenPostLoginOnboarding', 'true');
                router.replace('/(tabs)' as any);
              }}
              activeOpacity={0.8}
              className="mt-5 items-center"
            >
              <Text className="text-gray-500 font-primary-medium text-base">Skip for now</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={!buttonEnabled}
              className={`py-4 rounded-2xl items-center ${buttonEnabled ? 'bg-white' : 'bg-white/20'}`}
            >
              <Text className={`font-primary-bold text-xl ${buttonEnabled ? 'text-black' : 'text-gray-400'}`}>
                {index < slides.length - 1 ? 'Next' : 'Start focusing'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
