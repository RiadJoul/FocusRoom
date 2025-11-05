import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from "@expo-google-fonts/poppins";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";
import { useUserStore } from '../lib/stores/userStore';
import { supabase } from '../lib/supabase';


export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [checking, setChecking] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    if (initialCheckDone) return; // Prevent re-running

    let mounted = true;

    async function check() {
      try {
        // check Supabase session
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (session?.user) {
          // already signed in - fetch user profile from public.users
          try {
            const { data: userProfile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!error && userProfile) {
              useUserStore.getState().setUser(userProfile);
            } else {
              // Fallback to auth user
              useUserStore.getState().setUser(session.user);
            }
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
      } catch (e) {
        // fallback to login
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCheckDone]); // Run only once on mount

  // Handle deep link OAuth callback (for native builds)
  useEffect(() => {
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
      if (url.startsWith('focusroom://')) {
        lastProcessedUrl = url;
        
        let accessToken = null;
        let refreshToken = null;
        
        // Try to extract tokens from URL hash (after #)
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        // If not in hash, try query string (after ?)
        if (!accessToken) {
          const queryPart = url.split('?')[1]?.split('#')[0]; // Get query before hash
          if (queryPart) {
            const queryParams = new URLSearchParams(queryPart);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }
        }
        
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
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

    // Listen for deep links
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // when fonts are loaded and auth check finished, hide the native splash
  useEffect(() => {
    if (fontsLoaded && !checking) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, checking]);

  // Only block on fonts loading, not on checking state
  // The router.replace calls will handle navigation
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={
        { 
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0A' },
          animation: 'fade',
        }
      }>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
