import { analytics, Events, Properties } from '@/lib/analytics';
import { privacyPolicyUrl, supportEmail, websiteUrl } from '@/lib/constants';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useListStore } from '@/lib/stores/listStore';
import { useUserStore } from '@/lib/stores/userStore';
import { DistanceUnit, saveDistanceUnitPreference } from '@/lib/utils/distance';
import { supabase, SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';
import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Purchases from 'react-native-purchases';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { NotificationsBottomSheet } from '@/components/cockpit/NotificationsBottomSheet';
import { BlockAppsBottomSheet } from '@/components/cockpit/BlockingApps';

export default function Cockpit() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const stats = useSessionStore((state) => state.stats);
  const fetchStats = useSessionStore((state) => state.fetchStats);
  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const addList = useListStore((state) => state.addList);
  const createSession = useSessionStore((state) => state.createSession);
  const router = useRouter();


  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.full_name || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);
  const [isSavingNotificationSettings, setIsSavingNotificationSettings] = useState(false);
  const [isBlockingAppsEnabled, setIsBlockingAppsEnabled] = useState(false);
  const distanceUnit = useUserStore((state) => state.distanceUnit);

  const notificationsSheetRef = useRef<BottomSheet | null>(null);
  const blockAppsSheetRef = useRef<BottomSheet | null>(null);

  // Load stats on mount
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        await fetchStats(user.id);
      }
      setIsLoading(false);
    };
    loadData();

    analytics.track(Events.SCREEN_VIEW, {
      [Properties.SCREEN_NAME]: 'Cockpit'
    });
  }, [user?.id]);

  // Load persisted block-apps toggle
  useEffect(() => {
    AsyncStorage.getItem('block_apps_enabled')
      .then((value) => {
        if (value === 'true') {
          setIsBlockingAppsEnabled(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to load block_apps_enabled', err);
      });
  }, []);

  const handleChangeBlockAppsEnabled = (enabled: boolean) => {
    setIsBlockingAppsEnabled(enabled);
    AsyncStorage.setItem('block_apps_enabled', enabled ? 'true' : 'false').catch(
      (err) => {
        console.warn('Failed to persist block_apps_enabled', err);
      },
    );

    analytics.track(Events.BLOCK_APPS_OPTION, {
      enabled: enabled,
    });
  };

  const handleChangeDistanceUnit = async (unit: DistanceUnit) => {
    await saveDistanceUnitPreference(unit);
    analytics.track(Events.DISTANCE_UNIT_CHANGED, {
      unit,
    });
  };

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate streak (simplified - days with at least one session in last 7 days)
  const dayStreak = stats ? Math.min(7, stats.totalSessions) : 0;


  const openNotificationsSheet = () => {
    notificationsSheetRef.current?.expand();
  };

  const handleSeedDemoData = async () => {
    if (!__DEV__) return;
    if (!user?.id) {
      Alert.alert('Demo Data', 'You need to be signed in to generate sample data.');
      return;
    }

    Alert.alert(
      'Generate Sample Data',
      'This will add example lists, tasks, and sessions to your account so you can take screenshots.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'default',
          onPress: async () => {
            try {
              // Create lists
              const mathList = await addList('Math', 'calculator-outline', '#38bdf8');
              const biologyList = await addList('Biology', 'leaf-outline', '#10b981');
              const workoutList = await addList('Workout', 'barbell-outline', '#22c55e');

              const lists = [workoutList,mathList, biologyList].filter(Boolean) as {
                id: string;
              }[];

              if (lists.length === 0) return;

              // Create tasks
              await addTask(lists[0].id, 'Morning run - 5km', 'high');

              await addTask(lists[1].id, 'Complete algebra homework', 'high');
              await addTask(lists[1].id, 'Study for geometry test', 'medium');
              await addTask(lists[1].id, 'Review calculus notes', 'low');

              await addTask(lists[2].id, 'Read chapter on cell structure', 'high');
              await addTask(lists[2].id, 'Complete lab report on photosynthesis', 'medium');
              await addTask(lists[2].id, 'Memorize anatomy terms', 'low');


              // Create focus sessions over last 7 days for excellent Focus Health
              const now = new Date();
              for (let i = 6; i >= 0; i--) {
                const start = new Date(now);
                start.setDate(now.getDate() - i);
                start.setHours(9, 0, 0, 0);

                const durationSeconds = 60 * 60; // 60 min
                const end = new Date(start.getTime() + durationSeconds * 1000);

                await createSession({
                  user_id: user.id,
                  started_at: start.toISOString(),
                  ended_at: end.toISOString(),
                  duration_seconds: durationSeconds,
                  tasks_completed: 3,
                  trip_id: 'earth-mars',
                  trip_name: 'Earth → Mars',
                  distance_km: 225_000_000,
                });
              }

              // Refresh stats
              await fetchStats(user.id);

              Alert.alert('Done', 'Sample data added. You can now take screenshots.');
            } catch (err) {
              console.error('Failed to seed demo data:', err);
              Alert.alert('Error', 'Failed to generate sample data.');
            }
          },
        },
      ]
    );
  };

  const handleSaveNotificationSettings = async (settings: { enabled: boolean; hour: number; minute: number }) => {
    if (!user?.id) return;

    const previousEnabled = !!user.notification_enabled;
    const previousHour = user.notification_hour ?? null;
    const previousMinute = user.notification_minute ?? null;

    setIsSavingNotificationSettings(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          notification_enabled: settings.enabled,
          notification_hour: settings.hour,
          notification_minute: settings.minute,
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // update local user store
      useUserStore.setState({
        user: {
          ...user,
          notification_enabled: settings.enabled,
          notification_hour: settings.hour,
          notification_minute: settings.minute,
        },
      });

      // Track notification settings change
      analytics.track(Events.DAILY_NOTIFICATION_SETTINGS_UPDATED, {
        user_id: user.id,
        enabled: settings.enabled,
        hour: settings.hour,
        minute: settings.minute,
        previous_enabled: previousEnabled,
        previous_hour: previousHour,
        previous_minute: previousMinute,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update notifications');
      throw e;
    } finally {
      setIsSavingNotificationSettings(false);
    }
  };


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
      analytics.track(Events.USERNAME_UPDATED, {
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
        source: 'cockpit_screen',
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

              //analytics track
              analytics.track(Events.ACCOUNT_DELETED, {
                user_id: user?.id,
                email: user?.email,
              });

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


  const MenuItem = ({ icon, title, onPress, danger = false, disabled = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`bg-card rounded-xl p-4 mb-3 ${disabled ? 'opacity-50' : ''}`}
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
        {
          danger ? null : <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
        }
      </View>
    </TouchableOpacity>
  );


  const StatCard = ({ value, label, icon }: any) => (
    <View className="flex-1 bg-black rounded-xl p-4 items-center">
      {icon}
      <Text className="text-white font-primary-bold text-2xl mt-2">{value}</Text>
      <Text className="text-gray-400 text-sm font-primary-medium">{label}</Text>
    </View>
  );


  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="pt-6 pb-4">
          <Text className="text-2xl font-primary-bold text-white">Cockpit</Text>
        </View>



        {/* User Info Card */}
        <View className="pb-6">
          <View className="bg-card rounded-2xl p-6">
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              <View className="w-16 h-16 rounded-full bg-black items-center justify-center mr-4">
                <FontAwesome5 name="user-astronaut" size={34} color={"white"} />
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
                    {/* view glowing */}
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


        {/* Premium Upsell Banner */}
        {!user?.is_premium && (
          <TouchableOpacity
            onPress={() => presentPaywall()}
            activeOpacity={0.9}
            className="mb-6"
          >
            <LinearGradient
              colors={['#4c1d95', '#0f172a', '#020617']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#a855f7',
                shadowColor: '#a855f7',
                shadowOpacity: 0.45,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-2xl bg-secondary/25 items-center justify-center mr-3">
                    <Ionicons name="ticket-outline" size={20} color="#E5E7EB" />
                  </View>
                  <Text className="text-[11px] font-primary-bold text-indigo-200 tracking-[0.16em] uppercase">
                    First Class
                  </Text>
                </View>

                <View className="px-3 py-1 rounded-full bg-white">
                  <Text className="text-xs font-primary-bold text-black">
                    7 days free
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-gray-100 font-primary-medium text-xs"
                    numberOfLines={2}
                  >
                    Unlock 3D flights, advanced stats, unlimited recurring missions & list slots.
                  </Text>
                </View>

                <View className="flex-row items-center ml-3">
                  <Text className="text-xs font-primary-semibold text-indigo-100 mr-1">
                    Upgrade
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}



        {/* __DEV__ */}
        {__DEV__ && (<View className='pb-4'>
          <Text className='text-lg font-primary-bold text-white mb-4'>DEV</Text>

          <TouchableOpacity
            onPress={handleSeedDemoData}
            className="bg-card rounded-2xl p-4 mb-3 border border-secondary/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <Ionicons name="flask-outline" size={24} color="#a855f7" />
                <View>
                  <Text className="font-primary-semibold text-base text-white">
                    Generate sample data
                  </Text>
                  <Text className="text-gray-400 text-xs font-primary-medium mt-0.5">
                    Add demo tasks and sessions.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                router.push('/premium-intro' as any);
              } catch (err) {
                console.warn('Failed to navigate to premium intro after purchase', err);
              }
            }
            }
            className="bg-card rounded-2xl p-4 mb-3 border border-secondary/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <Ionicons name="arrow-forward-circle-outline" size={24} color="#a855f7" />
                <View>
                  <Text className="font-primary-semibold text-base text-white">
                    Go to Premium Intro
                  </Text>
                  <Text className="text-gray-400 text-xs font-primary-medium mt-0.5">
                    Preview the premium paywall screen.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                router.push('/post-login-onboarding' as any);
              } catch (err) {
                console.warn('Failed to navigate to premium intro after purchase', err);
              }
            }
            }
            className="bg-card rounded-2xl p-4 mb-3 border border-secondary/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <Ionicons name="arrow-forward-circle-outline" size={24} color="#a855f7" />
                <View>
                  <Text className="font-primary-semibold text-base text-white">
                    Go to Post login Onboarding
                  </Text>
                  <Text className="text-gray-400 text-xs font-primary-medium mt-0.5">
                    Preview the post-login onboarding flow.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        
        
        )}

        {/* Actions Items */}
        <View className="pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">Actions</Text>

          {/* Daily notification */}
          <TouchableOpacity
            onPress={openNotificationsSheet}
            className="bg-card rounded-xl p-4 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <Ionicons name="notifications-outline" size={24} color="white" />
                <Text className="font-primary-semibold text-base text-white">
                  Notifications
                </Text>
              </View>
              <View className="flex flex-row gap-x-2 items-center">
                <View
                  className={`w-2 h-2 rounded-full ${user?.notification_enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                />
                <Text className="text-white font-primary-regular">
                  {user?.notification_enabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Block apps during focus */}
          <TouchableOpacity
            onPress={() => blockAppsSheetRef.current?.expand()}
            className="bg-card rounded-xl p-4 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <MaterialCommunityIcons name="focus-field" size={24} color="white" />
                {/* <Ionicons name="shield-outline" size={24} color="white" /> */}
                <Text className="font-primary-semibold text-base text-white">
                  Block apps during focus
                </Text>
              </View>
              <View className="flex flex-row gap-x-2 items-center">
                <View
                  className={`w-2 h-2 rounded-full ${isBlockingAppsEnabled ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                />
                <Text className="text-white font-primary-regular">
                  {isBlockingAppsEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Distance unit */}
          <TouchableOpacity
            onPress={() =>
              handleChangeDistanceUnit(distanceUnit === 'km' ? 'mi' : 'km')
            }
            className="bg-card rounded-xl p-4 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <Ionicons name="swap-horizontal-outline" size={24} color="white" />
                <Text className="font-primary-semibold text-base text-white">
                  Current distance unit
                </Text>
              </View>
              <View className="flex flex-row gap-x-2 items-center">
                <View
                  className={`w-2 h-2 rounded-full bg-secondary`}
                />
                <Text className="text-white font-primary-regular">
                  {distanceUnit.toUpperCase()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View className="pb-4">
          <Text className="text-lg font-primary-bold text-white mb-4">About</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                if (Platform.OS === 'ios') {
                  const lookup = await fetch(
                    'https://itunes.apple.com/lookup?bundleId=com.anonymous.focusRoom'
                  ).then((r) => r.json());

                  const appId = lookup?.results?.[0]?.trackId;

                  if (appId) {
                    const url = `itms-apps://itunes.apple.com/app/id${appId}?action=write-review`;
                    await Linking.openURL(url);
                  } else {
                    Alert.alert(
                      'Thank you!',
                      'Please search for "FocusRoom" in the App Store to leave a review.'
                    );
                  }
                } else {
                  const available = await StoreReview.isAvailableAsync();
                  if (available) {
                    await StoreReview.requestReview();
                  } else {
                    Alert.alert(
                      'Thank you!',
                      'Reviews can be left from your app store page.'
                    );
                  }
                }
              } catch (err) {
                console.warn('Store review prompt failed:', err);
              }
            }}
            className="bg-card rounded-xl p-4 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-3">
                <FontAwesome5 name="hand-holding-heart" size={24} color="#fb7185" />
                <View>
                  <Text className="font-primary-semibold text-base text-white">
                    Show us some love
                  </Text>
                  <Text className="text-gray-400 text-xs font-primary-medium mt-0.5">
                    Leave a quick review in the App Store.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
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
        {/* Danger zone */}
        <View className="pb-4">
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
        <View className="pt-2">
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

      <NotificationsBottomSheet
        isNotificationEnabled={!!user?.notification_enabled}
        initialHour={user?.notification_hour ?? 10}
        initialMinute={user?.notification_minute ?? 0}
        bottomSheetRef={notificationsSheetRef}
        onSave={handleSaveNotificationSettings}
        isSaving={isSavingNotificationSettings}
      />

      <BlockAppsBottomSheet
        bottomSheetRef={blockAppsSheetRef}
        isEnabled={isBlockingAppsEnabled}
        onChangeEnabled={handleChangeBlockAppsEnabled}
      />

    </SafeAreaView>
  );
}
