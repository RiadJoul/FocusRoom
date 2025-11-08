import { analytics, Events, Properties } from '@/lib/analytics';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const stats = useSessionStore((state) => state.stats);
  const fetchStats = useSessionStore((state) => state.fetchStats);
  const tasks = useTaskStore((state) => state.tasks);
  const router = useRouter();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.full_name || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Settings
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Load stats on mount
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        await fetchStats(user.id);
      }
      setIsLoading(false);
    };
    loadData();
    
    // Track profile view
    analytics.track(Events.PROFILE_VIEWED);
  }, [user?.id]);

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Calculate streak (simplified - days with at least one session in last 7 days)
  const dayStreak = stats ? Math.min(7, stats.totalSessions) : 0;



  const handleUpdateName = async () => {
    if (!newName.trim() || !user?.id) return;
    
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      useUserStore.setState({ 
        user: { ...user, full_name: newName.trim() } 
      });
      
      setIsEditingName(false);
      Alert.alert('Success', 'Name updated successfully!');
      
      // Track name update
      analytics.track(Events.PROFILE_NAME_UPDATED, {
        [Properties.NAME]: newName.trim(),
      });
      
      analytics.setUserProperties({
        [Properties.NAME]: newName.trim(),
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

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
            analytics.track(Events.SIGN_OUT);
            analytics.reset();
            
            await supabase.auth.signOut();
            clearUser();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              
              // Delete user data
              await supabase.from('tasks').delete().eq('user_id', user.id);
              await supabase.from('focus_sessions').delete().eq('user_id', user.id);
              await supabase.from('users').delete().eq('id', user.id);

              // Sign out
              await supabase.auth.signOut();
              clearUser();
              router.replace('/login' as any);
              
              Alert.alert('Success', 'Your account has been deleted.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
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
                {isEditingName ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      className="flex-1 bg-gray-800 text-white font-primary-semibold text-lg px-3 py-2 rounded-lg"
                      placeholder="Enter your name"
                      placeholderTextColor="#6B7280"
                      autoFocus
                    />
                    <TouchableOpacity 
                      onPress={handleUpdateName}
                      disabled={isSavingName}
                      className="bg-primary px-3 py-2 rounded-lg"
                    >
                      {isSavingName ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        setIsEditingName(false);
                        setNewName(user?.full_name || '');
                      }}
                      className="bg-gray-700 px-3 py-2 rounded-lg"
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => setIsEditingName(true)}
                    className="flex-row items-center"
                  >
                    <Text className="text-white font-primary-bold text-xl">
                      {user?.full_name || 'Set your name'}
                    </Text>
                    <Ionicons name="pencil" size={16} color="#818CF8" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
                <Text className="text-gray-400 font-primary-medium text-sm mt-1">
                  {user?.email || 'user@example.com'}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-2">
              <StatCard 
                value={isLoading ? '...' : completedTasks} 
                label="Tasks Done" 
                icon="✅" 
              />
              <StatCard 
                value={isLoading ? '...' : dayStreak} 
                label="Day Streak" 
                icon="🔥" 
              />
              <StatCard 
                value={isLoading ? '...' : `${successRate}%`} 
                label="Success" 
                icon="📊" 
              />
            </View>
          </View>
        </View>

        {/* Focus Stats */}
        {stats && stats.totalSessions > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-primary-bold text-white mb-4">Focus Statistics</Text>
            <View className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">🚀</Text>
                  <Text className="text-gray-400 font-primary-medium">Total Sessions</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">{stats.totalSessions}</Text>
              </View>
              
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">⏱️</Text>
                  <Text className="text-gray-400 font-primary-medium">Total Focus Time</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">{stats.totalMinutes}min</Text>
              </View>
              
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">✨</Text>
                  <Text className="text-gray-400 font-primary-medium">Average Session</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">{stats.averageSessionLength}min</Text>
              </View>
              
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">💪</Text>
                  <Text className="text-gray-400 font-primary-medium">Focus Health</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white font-primary-bold text-lg mr-2">
                    {stats.focusHealthScore}
                  </Text>
                  <View className={`px-2 py-1 rounded-full ${
                    stats.focusHealthScore >= 80 ? 'bg-green-500/20' :
                    stats.focusHealthScore >= 60 ? 'bg-yellow-500/20' :
                    stats.focusHealthScore >= 40 ? 'bg-orange-500/20' : 'bg-red-500/20'
                  }`}>
                    <Text className={`text-xs font-primary-bold ${
                      stats.focusHealthScore >= 80 ? 'text-green-500' :
                      stats.focusHealthScore >= 60 ? 'text-yellow-500' :
                      stats.focusHealthScore >= 40 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {stats.focusHealthScore >= 80 ? 'Excellent' :
                       stats.focusHealthScore >= 60 ? 'Good' :
                       stats.focusHealthScore >= 40 ? 'Fair' : 'Needs Work'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">🚀</Text>
                  <Text className="text-gray-400 font-primary-medium">Distance Traveled</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">
                  {stats.totalDistanceKm >= 1000000 
                    ? `${(stats.totalDistanceKm / 1000000).toFixed(1)}M km`
                    : stats.totalDistanceKm >= 1000
                    ? `${Math.round(stats.totalDistanceKm / 1000)}K km`
                    : `${stats.totalDistanceKm} km`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">Settings</Text>
          
          {/* <SettingItem
            icon="🔔"
            title="Push Notifications"
            subtitle="Receive reminders and updates"
            value={notifications}
            onValueChange={setNotifications}
          />

          <SettingItem
            icon="🎵"
            title="Sound Effects"
            subtitle="Play sounds during interactions"
            value={soundEffects}
            onValueChange={setSoundEffects}
          />

          <SettingItem
            icon="📳"
            title="Haptic Feedback"
            subtitle="Vibrate on interactions"
            value={hapticFeedback}
            onValueChange={setHapticFeedback}
          /> */}
        </View>

        {/* Menu Items */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">More</Text>
          
          <MenuItem
            icon="⭐"
            title="Rate FocusRoom"
            onPress={() => {
              Linking.openURL('https://apps.apple.com/').catch(() => 
                Alert.alert('Coming Soon', 'Rate us feature will be available when the app is published!')
              );
            }}
          />

          <MenuItem
            icon="📄"
            title="Privacy Policy"
            onPress={() => {
              Alert.alert(
                'Privacy Policy',
                'We take your privacy seriously. Your data is stored securely and never shared with third parties.\n\n• All focus sessions are private\n• Tasks are encrypted\n• No personal data is sold\n• You can delete your account anytime',
                [{ text: 'OK' }]
              );
            }}
          />
          
          <MenuItem
            icon="❓"
            title="Help & Support"
            onPress={() => {
              Alert.alert(
                'Help & Support',
                'Need help? Contact us:\n\n📧 Email: support@focusroom.app\n💬 We typically respond within 24 hours',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Send Email', 
                    onPress: () => Linking.openURL('mailto:support@focusroom.app')
                  }
                ]
              );
            }}
          />

          <MenuItem
            icon="ℹ️"
            title="About FocusRoom"
            onPress={() => {
              Alert.alert(
                'About FocusRoom',
                '🚀 FocusRoom v1.0\n\nTransform your focus sessions into space journeys. Choose your tasks, pick a destination planet, and focus while traveling through the cosmos.\n\nMade with ❤️ for productivity enthusiasts',
                [{ text: 'OK' }]
              );
            }}
          />
        </View>

        {/* Danger Zone */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-red-500 mb-4">Danger Zone</Text>
          
          <MenuItem
            icon="🗑️"
            title="Delete Account"
            onPress={handleDeleteAccount}
            danger
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
            FocusRoom v1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}