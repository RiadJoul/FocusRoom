import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from 'react-native-purchases';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { analytics, Events } from '../lib/analytics';
import { useUserStore } from '../lib/stores/userStore';
import { useSessionStore } from '../lib/stores/sessionStore';
import { supabase } from '../lib/supabase';
import {
  ShieldConfiguration,
  getFamilyActivitySelectionId,
  unblockSelection,
  updateShield,
} from 'react-native-device-activity';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data ?? {};
    const isFocusSessionComplete = data.type === 'focus_session_complete';
    const isForeground = AppState.currentState === 'active';

    // If the app is in the foreground and this is a focus-session completion
    // notification, don't show any system UI. We'll handle the end-of-session
    // UX inside the app itself.
    if (isFocusSessionComplete && isForeground) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    };
  },
});

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Guard to ensure we only track APP_OPENED once per app run
let hasTrackedAppOpened = false;

export default function RootLayout() {
  const user = useUserStore((state) => state.user);
  const fetchStats = useSessionStore((state) => state.fetchStats);
  const router = useRouter();
  const [fontsLoaded, fontsError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [checking, setChecking] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const REVENUECAT_APPLE_API_KEY =
    process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY as string;

  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [hasCheckedPaywall, setHasCheckedPaywall] = useState(false);

  // Configure RevenueCat once on mount
  useEffect(() => {
    if (Platform.OS === 'ios' && REVENUECAT_APPLE_API_KEY) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
      Purchases.configure({ apiKey: REVENUECAT_APPLE_API_KEY });
      setIsRevenueCatReady(true);
    }
    // We intentionally omit REVENUECAT_APPLE_API_KEY from deps since it is static at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep focus stats (and Habit widget) in sync whenever we have a logged-in user.
  // This mirrors the fetch done in Focus/Settings, but from the root so the
  // Habit widget updates even if the user never opens those tabs.
  useEffect(() => {
    if (!user?.id) return;
    fetchStats(user.id);
  }, [user?.id, fetchStats]);

  // When the user has premium (whether self-purchased or admin-granted),
  // show the premium onboarding once if they haven't seen it locally.
  useEffect(() => {
    if (!user?.id || !user?.is_premium) return;

    const maybeShowPremiumIntro = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenPremiumIntro');
        if (seen) return;

        await AsyncStorage.setItem('hasSeenPremiumIntro', 'true');
        router.push('/premium-intro' as any);
      } catch (err) {
        console.warn('Failed to check premium intro flag', err);
      }
    };

    maybeShowPremiumIntro();
  }, [user?.id, user?.is_premium]);

  // Configure Screen Time shield UI once (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    try {
      const shieldConfig = {
        title: '🔒 {applicationOrDomainDisplayName} \n is blocked',
        subtitle: "You're focusing! Stay on track.",
        iconSystemName: 'moon.stars.fill',
        iconAppGroupRelativePath: 'shield/logo.png',
      };

      const shieldActions = {
        primary: {
          behavior: 'close' as const,
        },
      };

      updateShield(shieldConfig as ShieldConfiguration, shieldActions as any);
    } catch (err) {
      console.warn('Failed to configure Screen Time shield UI', err);
    }
  }, []);

  // Safety: on app launch, ensure any FocusRoom-blocked apps are unblocked
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const ensureAppsUnblockedOnLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem('block_apps_enabled');
        if (value !== 'true') return;

        const selectionToken =
          getFamilyActivitySelectionId('focusroom_block_apps');
        if (selectionToken) {
          unblockSelection(
            { activitySelectionId: 'focusroom_block_apps' },
            'appLaunch',
          );
        }
      } catch (err) {
        console.warn('Failed to unblock apps on app launch', err);
      }
    };

    ensureAppsUnblockedOnLaunch();
  }, []);

  // Link RevenueCat customer to Supabase user.id (app_user_id)
  useEffect(() => {
    if (!isRevenueCatReady || !user?.id || Platform.OS !== 'ios') return;
    const logInToRevenueCat = async () => {
      try {
        await Purchases.logIn(user.id);
      } catch (error) {
        console.error('RevenueCat logIn error:', error);
      }
    };

    logInToRevenueCat();
  }, [isRevenueCatReady, user?.id]);

  // Track connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline =
        !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize analytics
  useEffect(() => {
    const initServices = async () => {
      try {
        await analytics.init();
        console.log('✅ Mixpanel ready, tracking app open');
        if (!hasTrackedAppOpened) {
          hasTrackedAppOpened = true;
          await analytics.track(Events.APP_OPENED);
        }
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };

    initServices();
  }, []);

  // Soft paywall surfacing: show every 2 hours for non-premium users on app open
  useEffect(() => {
    const maybeShowPaywall = async () => {
      if (hasCheckedPaywall) return;
      if (!user?.id) return;
      if (user.is_premium) return;

      try {
        const hasSeenPostLogin = await AsyncStorage.getItem(
          'hasSeenPostLoginOnboarding',
        );
        if (!hasSeenPostLogin) {
          setHasCheckedPaywall(true);
          return;
        }

        const lastShownRaw = await AsyncStorage.getItem(
          'paywall_last_shown_root_layout',
        );
        const now = Date.now();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

        if (lastShownRaw) {
          const lastShown = Number(lastShownRaw);
          if (!Number.isNaN(lastShown) && now - lastShown < TWO_HOURS_MS) {
            setHasCheckedPaywall(true);
            return;
          }
        }

        setHasCheckedPaywall(true);

        const { presentPaywallOnce } = await import(
          '../lib/paywall/presentPaywall'
        );
        const didPurchase = await presentPaywallOnce({
          userId: user.id,
          source: 'layout',
        });

        if (!didPurchase) {
          await AsyncStorage.setItem(
            'paywall_last_shown_root_layout',
            String(now),
          );
        }
      } catch (err) {
        console.warn('Failed to maybe show paywall on root layout', err);
        setHasCheckedPaywall(true);
      }
    };

    maybeShowPaywall();
  }, [user?.id, user?.is_premium, hasCheckedPaywall]);

  // Initial auth + onboarding routing
  useEffect(() => {
    if (initialCheckDone) return;

    let mounted = true;

    async function applyPendingReferralIfNeeded(
      userId: string,
      currentUserRow: any | null,
    ) {
      try {
        const pendingCode = await AsyncStorage.getItem('pending_referral_code');
        if (!pendingCode) return;

        if (currentUserRow?.referral_code) {
          await AsyncStorage.removeItem('pending_referral_code');
          return;
        }

        const { error } = await supabase
          .from('users')
          .update({ referral_code: pendingCode })
          .eq('id', userId);

        if (!error) {
          const existing = useUserStore.getState().user;
          if (existing) {
            useUserStore
              .getState()
              .setUser({ ...existing, referral_code: pendingCode });
          }
          await AsyncStorage.removeItem('pending_referral_code');
        }
      } catch (err) {
        console.warn('Failed to apply pending referral code', err);
      }
    }

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (session?.user) {
          try {
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const profileToUse =
              !error && userProfile ? userProfile : session.user;
            useUserStore.getState().setUser(profileToUse);

            await applyPendingReferralIfNeeded(session.user.id, userProfile);
          } catch (err) {
            console.error('Error fetching user profile on startup:', err);
            useUserStore.getState().setUser(session.user);
          }

          if (mounted) {
            setChecking(false);
            setInitialCheckDone(true);
          }

          router.replace('/(tabs)' as any);
          return;
        }

        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (mounted) {
          setChecking(false);
          setInitialCheckDone(true);
        }

        if (!seen) {
          router.replace('/onboarding' as any);
          return;
        }

        router.replace('/login' as any);
      } catch {
        if (mounted) {
          setChecking(false);
          setInitialCheckDone(true);
        }
        router.replace('/login' as any);
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [initialCheckDone, router]);

  // Handle OAuth deep link callback (native builds) once on mount.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let lastProcessedUrl = '';

    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      // Ignore Expo development client URLs to prevent infinite loops
      if (url.includes('expo-development-client')) {
        return;
      }

      // Prevent processing the same URL multiple times
      if (url === lastProcessedUrl) {
        return;
      }

      // Check if it's an OAuth callback (focusroom://auth/callback or contains tokens)
      if (url.startsWith('focusroom://auth')) {
        lastProcessedUrl = url;

        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // Try to extract tokens from URL hash (after #)
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        // If not in hash, try query string (after ?)
        if (!accessToken) {
          const queryPart = url.split('?')[1]?.split('#')[0];
          if (queryPart) {
            const queryParams = new URLSearchParams(queryPart);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }
        }

        if (accessToken) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              console.error('Error setting session:', error);
            }
          } catch (err) {
            console.error('Exception setting session:', err);
          }
        } else {
          console.log('No access_token found in callback URL');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Log font errors but let the animated splash decide when to hide.
  useEffect(() => {
    if (fontsError) {
      console.error('Font load error:', fontsError);
    }
  }, [fontsError]);

  const handleRetryConnection = () => {
    NetInfo.fetch().then((state) => {
      const offline =
        !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });
  };

  const appIsReady = (fontsLoaded || !!fontsError) && !checking;

  useEffect(() => {
    if (!appIsReady) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [appIsReady]);

  const offlineOverlayStyles = StyleSheet.create({
    container: {
      backgroundColor: '#0A0A0A',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    title: {
      color: 'white',
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
    },
    subtitle: {
      color: '#A1A1A1',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 12,
    },
    button: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
    },
    buttonText: {
      color: '#0A0A0A',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!fontsLoaded && !fontsError) {
    return null;
  }

  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Use full screen width on iPhone, iPad and Mac */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        {isOffline && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              offlineOverlayStyles.container,
            ]}
          >
            <Text style={offlineOverlayStyles.title}>You&apos;re Offline</Text>
            <Text style={offlineOverlayStyles.subtitle}>
              FocusRoom needs an internet connection to keep everything in sync.
              Please reconnect to continue.
            </Text>
            <Pressable
              onPress={handleRetryConnection}
              style={offlineOverlayStyles.button}
            >
              <Text style={offlineOverlayStyles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        )}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
