import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analytics, Events, Properties } from '../lib/analytics';
import { useUserStore } from '../lib/stores/userStore';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as AppleAuthentication from 'expo-apple-authentication';
import { privacyPolicyUrl, termsOfServiceUrl } from '@/lib/constants';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [appleAuthLoading, setAppleAuthLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    analytics.track(Events.SCREEN_VIEW, {
      [Properties.SCREEN_NAME]: 'Login'
    });
  }, []);



  useEffect(() => {
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {

      if (session?.user) {

        // For now, just use the auth user directly until RLS policies are configured
        // The auth user already has email, user_metadata with name and picture
        const user = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        };

        useUserStore.getState().setUser(user);

        // Try to fetch from users table in background (non-blocking)
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: userProfile, error }) => {
            if (error) {
              console.log('ℹ️ Could not fetch user profile from DB (RLS may be blocking):', error.message);
            } else if (userProfile) {
              useUserStore.getState().setUser(userProfile);
            }
          });

        // Navigate to post-login onboarding once, then tabs
        const hasSeenPostLoginOnboarding = await AsyncStorage.getItem('hasSeenPostLoginOnboarding');
        if (!hasSeenPostLoginOnboarding) {
          router.replace('/post-login-onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
        
       
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        useUserStore.getState().clearUser();
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove router dependency to prevent re-subscribing

  const signInWithGoogle = async () => {
    try {
      setGoogleAuthLoading(true);

      // For native builds (expo run:ios/android), use custom scheme instead of Expo proxy
      // The scheme 'focusroom' is defined in app.json
      const redirectUri = (AuthSession as any).makeRedirectUri({
        scheme: 'focusroom',
        path: 'auth/callback'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true // Return URL instead of auto-redirecting
        },
      });

      if (error) {
        console.error('Sign in error:', error);
        Alert.alert('Sign in error', error.message);
        setGoogleAuthLoading(false);
        return;
      }

      const url = (data as any)?.url;
      if (url) {
        try {
          const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

          // Handle the result - extract tokens and set session
          if (result.type === 'success' && result.url) {

            // Extract tokens from the callback URL
            const callbackUrl = result.url;
            const hashPart = callbackUrl.split('#')[1];

            if (hashPart) {
              const params = new URLSearchParams(hashPart);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');

              if (accessToken) {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                });

                if (sessionError) {
                  console.error('Error setting session:', sessionError);
                  Alert.alert('Sign in failed', sessionError.message);
                } else if (sessionData?.session) {
                  // Track sign in
                  analytics.track(Events.SIGN_IN, {
                    method: 'google',
                    [Properties.USER_ID]: sessionData.session.user.id,
                    [Properties.EMAIL]: sessionData.session.user.email,
                  });

                  // Identify user
                  analytics.identify(sessionData.session.user.id, {
                    [Properties.EMAIL]: sessionData.session.user.email,
                    [Properties.NAME]: sessionData.session.user.user_metadata?.full_name,
                    [Properties.SIGNUP_DATE]: sessionData.session.user.created_at,
                  });

                  // The onAuthStateChange listener above will handle navigation
                }
              }
            }
          }
        } catch (err) {
          console.log('WebBrowser.openAuthSessionAsync failed:', err);
          Alert.alert('Authentication failed', 'Could not complete sign in');
        } finally {
          setGoogleAuthLoading(false);
        }
      } else {
        console.log('No OAuth URL returned from supabase.auth.signInWithOAuth()', data);
        setGoogleAuthLoading(false);
      }

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
      setGoogleAuthLoading(false);
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      setAppleAuthLoading(true);

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple Sign In failed – no identity token returned.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: appleCredential.identityToken,
      });

      if (error) {
        console.error('Apple sign in error:', error);
        Alert.alert('Sign in error', error.message);
        return;
      }

      if (data?.session) {
        const user = data.session.user;

        analytics.track(Events.SIGN_IN, {
          method: 'apple',
          [Properties.USER_ID]: user.id,
          [Properties.EMAIL]: user.email,
        });

        analytics.identify(user.id, {
          [Properties.EMAIL]: user.email,
          [Properties.NAME]:
            user.user_metadata?.full_name ||
            user.user_metadata?.name,
          [Properties.SIGNUP_DATE]: user.created_at,
        });
        // The onAuthStateChange listener will handle navigation
      }
    } catch (err: any) {
      // User cancelled the Apple sign-in dialog
      if (err?.code === 'ERR_CANCELED') {
        return;
      }

    } finally {
      setAppleAuthLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-8">
        <View className="items-center w-full">
          {/* Illustration */}
          {/* <View className='w-48 h-48 mb-5'>
            <LottieView
              source={require("../assets/illustrations/solar.json")}
              style={{ width: "100%", height: "100%" }}
              autoPlay
              loop
            />
          </View> */}

          {/* Title */}
          <Text className="text-4xl font-primary-semibold text-white text-center mb-3">
            FocusRoom
          </Text>

          {/* Subtitle */}
          <Text className="text-lg font-primary-regular text-gray-300 text-center mb-12 px-4 leading-7">
            Transform your focus sessions into interstellar adventures
          </Text>


          <View className="w-full">
            {/* Google Sign In Button */}
            <TouchableOpacity
              onPress={signInWithGoogle}
              className="bg-white py-5 rounded-2xl flex-row items-center justify-center shadow-lg"
              activeOpacity={0.9}
              disabled={googleAuthLoading}
            >
              {googleAuthLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  {/* Google Icon */}
                  <View className="mr-3">
                    <AntDesign name="google" size={24} color="#000000" />
                  </View>
                  <Text className="text-gray-800 font-primary-bold text-lg">
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {/* Apple Sign In Button */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={signInWithApple}
                className="bg-black border border-gray-700 py-5 rounded-2xl flex-row items-center justify-center shadow-lg mt-4"
                activeOpacity={0.9}
                disabled={appleAuthLoading}
              >
                {appleAuthLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {/* Apple Icon */}
                    <View className="mr-3">
                      <AntDesign name="apple" size={24} color="#fff" />
                    </View>
                    <Text className="text-white font-primary-bold text-lg">
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Text */}
          <View className="flex-row flex-wrap justify-center mt-8 px-8">
            <Text className="text-gray-300 text-sm">By signing in, you agree to our </Text>

            <Text
              className="text-secondary/90 underline text-sm"
              onPress={() => Linking.openURL(termsOfServiceUrl)}
            >
              Terms of Service
            </Text>

            <Text className="text-gray-300 text-sm"> and </Text>

            <Text
              className="text-secondary/90 underline text-sm"
              onPress={() => Linking.openURL(privacyPolicyUrl)}
            >
              Privacy Policy
            </Text>

            <Text className="text-gray-300 text-sm">.</Text>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}
