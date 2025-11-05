import * as AuthSession from 'expo-auth-session';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../lib/stores/userStore';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();



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
        
        // Navigate to tabs after setting user (always navigate)
        router.replace('/(tabs)' as any);
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
      setLoading(true);

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
        setLoading(false);
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
                  // The onAuthStateChange listener above will handle navigation
                }
              }
            }
          }
        } catch (err) {
          console.log('WebBrowser.openAuthSessionAsync failed:', err);
          Alert.alert('Authentication failed', 'Could not complete sign in');
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No OAuth URL returned from supabase.auth.signInWithOAuth()', data);
        setLoading(false);
      }

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-midnight-black">
      <View className="flex-1 items-center justify-center px-8">
        <View className="items-center w-full">
          {/* Illustration */}
          <View className="relative mb-12">
            <View
              className="absolute inset-0 bg-primary/10 rounded-full blur-3xl"
              style={{
                width: 280,
                height: 280,
                transform: [{ scale: 0.8 }]
              }}
            />
            <Image
              source={require('../assets/illustrations/time-illustration.svg')}
              style={{ width: 280, height: 280 }}
              contentFit="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-5xl font-primary-bold text-primary text-center mb-3">
            FocusRoom
          </Text>

          {/* Subtitle */}
          <Text className="text-lg text-gray-400 text-center mb-12 px-4 leading-7">
            Take control of your time and unlock your focus
          </Text>

          {/* Google Sign In Button */}
          <View className="w-full">
            <TouchableOpacity
              onPress={signInWithGoogle}
              className="bg-white py-5 rounded-2xl flex-row items-center justify-center shadow-lg"
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  {/* Google Icon */}
                  <View className="mr-3">
                    <Image
                      source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                      style={{ width: 24, height: 24 }}
                      contentFit="contain"
                    />
                  </View>
                  <Text className="text-gray-800 font-primary-bold text-lg">
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text className="text-gray-500 text-center text-sm mt-8 px-8">
            Secure authentication powered by Google OAuth
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}