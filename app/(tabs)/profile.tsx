import { useUserStore } from '@/lib/stores/userStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const router = useRouter();
  
  const [strictMode, setStrictMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            clearUser();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    showSwitch = true 
  }: any) => (
    <View className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-xl mr-2">{icon}</Text>
            <Text className="text-white font-primary-semibold text-base">{title}</Text>
          </View>
          {subtitle && (
            <Text className="text-gray-400 text-sm font-primary-medium ml-7">
              {subtitle}
            </Text>
          )}
        </View>
        {showSwitch && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#374151', true: '#818CF8' }}
            thumbColor={value ? '#fff' : '#9CA3AF'}
          />
        )}
      </View>
    </View>
  );

  const MenuItem = ({ icon, title, onPress, danger = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 mb-3"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-xl mr-3">{icon}</Text>
          <Text className={`font-primary-semibold text-base ${
            danger ? 'text-red-500' : 'text-white'
          }`}>
            {title}
          </Text>
        </View>
        <Text className="text-gray-500 text-lg">›</Text>
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({ value, label, icon }: any) => (
    <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4 items-center">
      <Text className="text-2xl mb-1">{icon}</Text>
      <Text className="text-white font-primary-bold text-2xl">{value}</Text>
      <Text className="text-gray-400 text-sm font-primary-medium mt-1">{label}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-midnight-black">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-primary-bold text-white">Profile</Text>
        </View>

        {/* User Info Card */}
        <View className="px-6 pb-6">
          <View className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
                <Text className="text-midnight-black font-primary-bold text-2xl">
                  {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              
              {/* User Details */}
              <View className="flex-1">
                <Text className="text-white font-primary-bold text-xl">
                  {user?.full_name || 'User'}
                </Text>
                <Text className="text-gray-400 font-primary-medium text-sm mt-1">
                  {user?.email || 'user@example.com'}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-2">
              <StatCard value="0" label="Tasks Done" icon="✅" />
              <StatCard value="0" label="Day Streak" icon="🔥" />
              <StatCard value="0%" label="Success" icon="📊" />
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">Settings</Text>
          
     
        </View>

        {/* Menu Items */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">More</Text>
          

          <MenuItem
            icon="⭐"
            title="Rate FocusRoom"
            onPress={() => Alert.alert('Rate Us', 'Thank you for your support!')}
          />

          <MenuItem
            icon="📄"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Coming soon!')}
          />
          
          <MenuItem
            icon="❓"
            title="Help & Support"
            onPress={() => Alert.alert('Help & Support', 'Coming soon!')}
          />
        </View>

        {/* Sign Out Button */}
        <View className="px-6 pt-2">
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-500/10 border border-red-500/30 py-5 rounded-2xl items-center"
            activeOpacity={0.8}
          >
            <Text className="text-red-500 font-primary-bold text-lg">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View className="items-center pt-6">
          <Text className="text-gray-600 text-xs font-primary-medium">
            FocusRoom v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}