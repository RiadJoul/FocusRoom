import { analytics, Events, Properties } from '@/lib/analytics';
import { privacyPolicyUrl, supportEmail, websiteUrl } from '@/lib/constants';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { supabase, SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';
import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);

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

            // Detach RevenueCat user
            try {
              await Purchases.logOut();
            } catch (error) {
              console.error('RevenueCat logOut error on sign out:', error);
            }

            await supabase.auth.signOut();
            clearUser();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  async function presentPaywall(): Promise<boolean> {
    // Prevent re-entrancy
    if (isPresentingPaywall) return false;
    setIsPresentingPaywall(true);

    try {
      return await presentPaywallOnce({
        userId: user?.id,
        source: 'profile_screen',
      });
    } finally {
      setIsPresentingPaywall(false);
    }
  }

  async function deleteAccount(): Promise<void> {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action is irreversible and will remove all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              const session = await supabase.auth.getSession();
              const accessToken = session.data.session?.access_token;

              if (!accessToken) {
                Alert.alert("Error", "No user session found.");
                return;
              }

              // --- CALL SUPABASE EDGE FUNCTION ---
              const response = await fetch(
                `${SUPABASE_URL}/functions/v1/delete-user`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    apikey: SUPABASE_KEY,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ name: "Functions" }),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data?.error || "Failed to delete account");
              }

              // Clear local state + sign out
              try {
                await Purchases.logOut();
              } catch (error) {
                console.error('RevenueCat logOut error on delete account:', error);
              }

              await supabase.auth.signOut();
              clearUser();
              setIsDeletingAccount(false);
              router.replace("/login" as any);

              Alert.alert(
                "Account Deleted",
                "Your account has been permanently deleted."
              );
            } catch (error: any) {
              setIsDeletingAccount(false);
              Alert.alert("Error", error.message || "Failed to delete account.");
            }
          },
        },
      ]
    );
  }


  const MenuItem = ({ icon, title, onPress, danger = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card rounded-2xl p-4 mb-3"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-3">
          {icon}
          <Text className={`font-primary-semibold text-base ${danger ? 'text-red-500' : 'text-white'
            }`}>
            {title}
          </Text>
        </View>
        <Text className="text-gray-500 text-lg">›</Text>
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({ value, label, icon }: any) => (
    <View className="flex-1 bg-card rounded-2xl p-4 items-center">
      {icon}
      <Text className="text-white font-primary-bold text-2xl mt-2">{value}</Text>
      <Text className="text-gray-400 text-sm font-primary-medium">{label}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
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
          <View className="bg-card rounded-2xl p-6">
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
                <Text className="text-background font-primary-bold text-2xl">
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
                  <View className='flex flex-row justify-between'>
                    <TouchableOpacity
                      onPress={() => setIsEditingName(true)}
                      className="flex-row items-center"
                    >
                      <Text className="text-white font-primary-bold text-xl">
                        {user?.full_name || 'Set your name'}
                      </Text>
                      <Ionicons name="pencil" size={16} color="#818CF8" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    {/* make this view glowing */}
                    {user?.is_premium && (
                      <View style={{
                        backgroundColor: '#A78BFA',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        shadowColor: '#A78BFA',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.7,
                        shadowRadius: 10,
                        elevation: 10,
                      }}>
                        <Text className="text-white font-primary-bold text-xs tracking-wider">FIRST CLASS</Text>
                      </View>
                    )}
                    {!user?.is_premium && (
                      <View className="bg-white/20 px-3 py-1.5 rounded-lg">
                        <Text className="text-white font-primary-bold text-xs tracking-wider">ECONOMY</Text>
                      </View>
                    )}
                  </View>
                )}
                <Text className="text-gray-400 font-primary-medium text-sm mt-1">
                  {user?.email || 'user@example.com'}
                </Text>

              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-3">
              <StatCard
                value={isLoading ? '...' : completedTasks}
                label="Tasks Done"
                icon={<FontAwesome5 name="tasks" size={24} color="white" />}
              />
              <StatCard
                value={isLoading ? '...' : dayStreak}
                label="Day Streak"
                icon={<MaterialCommunityIcons name="fire" size={24} color="white" />}
              />
              <StatCard
                value={isLoading ? '...' : `${successRate}%`}
                label="Success"
                icon={<AntDesign name="check-square" size={24} color="white" />}
              />
            </View>
          </View>
        </View>

        {/* Premium Upsell Box */}
        {!user?.is_premium && (
          <View className="bg-black px-6 py-5 mx-6 mb-6 rounded-2xl border-2 border-secondary/50">

            {/* Badge */}
            <View className="flex-row items-center justify-center mb-4">
              <View className="bg-primary/20 px-3 py-1 rounded-full">
                <Text className="text-primary text-xs font-primary-bold uppercase tracking-wider">
                  Upgrade to First Class
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-white text-center font-primary-bold text-2xl mb-1">
              Unlock Your Full Potential
            </Text>

            {/* Subtext */}
            <Text className="text-gray-400 text-center text-sm mb-4 font-primary leading-relaxed">
              Access 3D space travel, unlimited recurring tasks, detailed weekly stats,
              and premium sounds.
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
              onPress={() => presentPaywall()}
              className="bg-white py-3.5 rounded-xl items-center shadow-lg"
            >
              <Text className="text-black font-primary-bold text-base">
                Upgrade to First Class
              </Text>
            </TouchableOpacity>

          </View>
        )}




        {/* Focus Stats */}
        {stats && stats.totalSessions > 0 ? (
          <View className="px-6 pb-6">
            <Text className="text-lg font-primary-bold text-white mb-4">Focus Statistics</Text>

            <View className="bg-card rounded-2xl p-4 gap-y-5">

              {/* FREE — Total Sessions */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-2">
                  <SimpleLineIcons name="rocket" size={24} color="white" />
                  <Text className="text-gray-400 font-primary-medium">Total Sessions</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">{stats.totalSessions}</Text>
              </View>

              {/* FREE — Total Focus Time */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-2">
                  <MaterialCommunityIcons name="timer-outline" size={24} color="white" />
                  <Text className="text-gray-400 font-primary-medium">Total Focus Time</Text>
                </View>
                <Text className="text-white font-primary-bold text-lg">{stats.totalMinutes}min</Text>
              </View>

              {/* PREMIUM — Average Session */}
              <TouchableOpacity
                onPress={() => !user.is_premium && presentPaywall()}
                className={user.is_premium ? 'opacity-100' : 'opacity-50'}
              >
                <View className="flex-row items-center justify-between opacity-100">
                  <View className="flex-row items-center gap-x-2">
                    <Ionicons name="stats-chart-outline" size={24} color="white" />
                    <Text className="text-gray-400 font-primary-medium">
                      Average Session
                    </Text>
                  </View>

                  {user.is_premium ? (
                    <Text className="text-white font-primary-bold text-lg">
                      {stats.averageSessionLength}min
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-x-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">•••</Text>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* PREMIUM — Focus Health */}
              <TouchableOpacity
                onPress={() => !user.is_premium && presentPaywall()}
                className={user.is_premium ? 'opacity-100' : 'opacity-50'}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-2">
                    <Ionicons name="fitness" size={24} color="white" />
                    <Text className="text-gray-400 font-primary-medium">
                      Focus Health
                    </Text>
                  </View>

                  {user.is_premium ? (
                    <View className="flex-row items-center">
                      <Text className="text-white font-primary-bold text-lg mr-2">
                        {stats.focusHealthScore}
                      </Text>
                      <View className={`px-2 py-1 rounded-full ${stats.focusHealthScore >= 80 ? 'bg-green-500/20' :
                        stats.focusHealthScore >= 60 ? 'bg-yellow-500/20' :
                          stats.focusHealthScore >= 40 ? 'bg-orange-500/20' : 'bg-red-500/20'
                        }`}>
                        <Text className={`text-xs font-primary-bold ${stats.focusHealthScore >= 80 ? 'text-green-500' :
                          stats.focusHealthScore >= 60 ? 'text-yellow-500' :
                            stats.focusHealthScore >= 40 ? 'text-orange-500' : 'text-red-500'
                          }`}>
                          {stats.focusHealthScore >= 80 ? 'Excellent' :
                            stats.focusHealthScore >= 60 ? 'Good' :
                              stats.focusHealthScore >= 40 ? 'Fair' : 'Needs Work'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-x-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">•••</Text>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* PREMIUM — Distance Traveled */}
              <TouchableOpacity
                onPress={() => !user.is_premium && presentPaywall()}
                className={user.is_premium ? 'opacity-100' : 'opacity-50'}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-2">
                    <Ionicons name="planet-outline" size={24} color="white" />
                    <Text className="text-gray-400 font-primary-medium">
                      Distance Traveled
                    </Text>
                  </View>

                  {user.is_premium ? (
                    <Text className="text-white font-primary-bold text-lg">
                      {stats.totalDistanceKm >= 1000000
                        ? `${(stats.totalDistanceKm / 1000000).toFixed(1)}M km`
                        : stats.totalDistanceKm >= 1000
                          ? `${Math.round(stats.totalDistanceKm / 1000)}K km`
                          : `${stats.totalDistanceKm} km`}
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-x-1">
                      <Text className="text-gray-500 font-primary-bold text-lg">•••</Text>
                      <Ionicons name="lock-closed-outline" size={20} color="#888" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

            </View>
          </View>
        ) : (
          <View className="px-6 pb-6">
            <Text className="text-lg font-primary-bold text-white mb-4">Focus Statistics</Text>
            <View className="bg-card rounded-2xl p-12 gap-y-5">
              <Text className="text-gray-200 text-lg text-center font-primary-medium">
                No stats available yet
              </Text>
            </View>
          </View>
        )}



        {/* Menu Items */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">Info</Text>
          <MenuItem
            icon={<Ionicons name="document-text-outline" size={24} color="white" />}
            title="Privacy Policy"
            onPress={() => {
              Linking.openURL(privacyPolicyUrl).catch(() => {
                Alert.alert('Error', 'Failed to open Privacy Policy');
              });
            }}
          />

          <MenuItem
            icon={<Ionicons name="help-circle-outline" size={24} color="white" />}
            title="Help & Support"
            onPress={() => {
              Alert.alert(
                'Help & Support',
                'Need help? Contact us:\n\n📧 Email: support@focusroom.app\n💬 We typically respond within 24 hours',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send Email',
                    onPress: () => Linking.openURL(`mailto:${supportEmail}`)
                  }
                ]
              );
            }}
          />

          <MenuItem
            icon={<Ionicons name="information-circle-outline" size={24} color="white" />}
            title="About FocusRoom"
            onPress={() => {
              Linking.openURL(websiteUrl).catch(() => {
                Alert.alert('Error', 'Failed to open Privacy Policy');
              });
            }}
          />
        </View>
        {/* Menu Items */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-primary-bold text-red-300 mb-4">Danger zone</Text>
          {
            isDeletingAccount ? (
              <View className="bg-card rounded-2xl p-4 mb-3 items-center">
                <ActivityIndicator size="small" color="red" />
                <Text className="text-red-500 font-primary-medium mt-2">Deleting account...</Text>
              </View>
            ) : <MenuItem
              icon={<Ionicons name="trash-bin-outline" size={24} color="red" />}
              title="Delete Account"
              danger
              onPress={deleteAccount}
              disabled={isDeletingAccount}
            />
          }
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
            FocusRoom V2.0
          </Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
