import { FocusSessionScreen } from '@/components/focus/FocusSessionScreen';
import { PlanetTrip } from '@/components/focus/PlanetTrips';
import { TaskSelectionModal } from '@/components/focus/TaskSelectionModal';
import { TicketAnimation } from '@/components/focus/TicketAnimation';
import { analytics, Events, Properties } from '@/lib/analytics';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { Task, useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getIncompleteTasks } from '@/lib/utils/taskUtils';
import BottomSheet from '@gorhom/bottom-sheet';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import SpaceStation from '@/components/focus/SpaceStation';
import { BlurView } from 'expo-blur';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';

export default function FocusTab() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const stats = useSessionStore((state) => state.stats);


  //stats
  const { fetchStats, createSession } = useSessionStore();
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // session visual type
  const [sessionType, setSessionType] = useState<'3d' | 'map'>('map');

  const bottomSheetRef = useRef<BottomSheet>(null);

  // Load stats when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id);
    }
  }, [user?.id, fetchStats]);

  // Hide/show tab bar based on session state
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: sessionActive
        ? { display: 'none' }
        : {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#262626',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
    });
  }, [navigation, sessionActive, insets.bottom]);

  const incompleteTasks = useMemo(() => {
    return getIncompleteTasks(tasks);
  }, [tasks]);

  const handleOpenTaskSelection = useCallback(() => {
    bottomSheetRef.current?.expand();

    analytics.track(Events.TRIP_MODAL_OPENED, {
      [Properties.TASKS_COUNT]: incompleteTasks.length,
    });
  }, [incompleteTasks.length]);

  const handleStartSession = useCallback((tasks: Task[], trip: PlanetTrip, mode: 'map' | '3d') => {
    setSelectedTasks(tasks);
    setSelectedTrip(trip);
    setSessionType(mode);
    setShowTicket(true);

    analytics.track(Events.TRIP_SELECTED, {
      [Properties.TRIP_ID]: trip.id,
      [Properties.TRIP_NAME]: `${trip.from} → ${trip.to}`,
      [Properties.TRIP_DESTINATION]: trip.to,
      [Properties.DURATION_MINUTES]: Math.floor(trip.duration / 60),
      [Properties.DISTANCE_KM]: trip.distance_km,
      [Properties.TASKS_COUNT]: tasks.length,
      session_type: mode,
    });
  }, []);

  const handleTicketAnimationComplete = useCallback(() => {
    setShowTicket(false);
    setSessionActive(true);
    setSessionStartTime(new Date());

    if (selectedTrip) {
      analytics.track(Events.SESSION_STARTED, {
        [Properties.TRIP_ID]: selectedTrip.id,
        [Properties.TRIP_NAME]: `${selectedTrip.from} → ${selectedTrip.to}`,
        [Properties.DURATION_SECONDS]: selectedTrip.duration,
        [Properties.DURATION_MINUTES]: Math.floor(selectedTrip.duration / 60),
        [Properties.DISTANCE_KM]: selectedTrip.distance_km,
        [Properties.TASKS_COUNT]: selectedTasks.length,
        session_type: sessionType === '3d' ? 'first_class' : 'economy',
      });
    }
  }, [selectedTrip, selectedTasks, sessionType]);

  const handleEndSession = useCallback(
    async (duration: number, completedTaskIds: string[]) => {
      if (!user?.id || !selectedTrip) return;

      // Determine if this is the very first completed session (before saving).
      const wasFirstSession = !stats || stats.totalSessions === 0;

      try {
        // Track session completion
        analytics.track(Events.SESSION_COMPLETED, {
          [Properties.TRIP_ID]: selectedTrip.id,
          [Properties.TRIP_NAME]: `${selectedTrip.from} → ${selectedTrip.to}`,
          [Properties.SESSION_STATUS]: 'completed',
          [Properties.DURATION_SECONDS]: duration,
          [Properties.DURATION_MINUTES]: Math.floor(duration / 60),
          [Properties.DISTANCE_KM]: selectedTrip.distance_km,
          [Properties.TASKS_COMPLETED]: completedTaskIds.length,
          [Properties.TASKS_COUNT]: selectedTasks.length,
          session_type: sessionType === '3d' ? 'first_class' : 'economy',
          completed_percentage: Math.round(
            (completedTaskIds.length / selectedTasks.length) * 100
          ),
        });

        // Increment user stats
        analytics.incrementProperty('total_sessions', 1);
        analytics.incrementProperty('total_minutes', Math.floor(duration / 60));
        analytics.incrementProperty('total_distance_km', selectedTrip.distance_km);

        // Save session to database (also refreshes stats)
        await createSession({
          user_id: user.id,
          started_at: sessionStartTime?.toISOString() || new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          tasks_completed: completedTaskIds.length,
          trip_id: selectedTrip.id,
          trip_name: `${selectedTrip.from} → ${selectedTrip.to}`,
          distance_km: selectedTrip.distance_km,
        });

        // If this was their very first session, softly ask for an App Store review on iOS.
        if (wasFirstSession && Platform.OS === 'ios') {
          try {
            const alreadyPrompted = await AsyncStorage.getItem('has_app_review_prompted');
            if (!alreadyPrompted) {
              const available = await StoreReview.isAvailableAsync();
              if (available) {
                await StoreReview.requestReview();
                await AsyncStorage.setItem('has_app_review_prompted', 'true');
              }
            }
          } catch (err) {
            console.warn('App review prompt failed:', err);
          }
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      }

      setSessionActive(false);
      setSelectedTasks([]);
      setSelectedTrip(null);
      setSessionStartTime(null);
    },
    [user?.id, selectedTrip, sessionStartTime, createSession, selectedTasks, stats, sessionType]
  );

  const handleMarkTasksComplete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      await toggleComplete(taskId);
    }
  }, [toggleComplete]);

  const handleOpenPremiumSpaceStation = useCallback(async () => {
    await presentPaywallOnce({
      userId: user?.id,
      source: 'focus_tab_space_station',
    });
  }, [user?.id]);

  if (sessionActive && selectedTrip) {
    return (
      <FocusSessionScreen
        tasks={selectedTasks}
        trip={selectedTrip}
        onEndSession={handleEndSession}
        onMarkTasksComplete={handleMarkTasksComplete}
        mode={sessionType}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image
                source={require('../../assets/icons/ios-light.png')}
                className="w-11 h-11 mr-4 rounded-2xl"
              />
              <View>
                <Text className="text-gray-400 font-primary-medium text-xs uppercase tracking-[0.16em]">
                  Focus Mission Control
                </Text>
                
              </View>
            </View>
          </View>

          <Text className="text-gray-400 font-primary-medium text-sm mt-3">
            Lock in and start your focus.
          </Text>
        </View>

        {/* Main Focus Card */}
        <View className="bg-card rounded-3xl px-5 py-6 mb-2 border border-white/5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-gray-400 font-primary-medium text-xs uppercase tracking-[0.18em] mb-1">
                Next Mission
              </Text>
              <Text className="text-white font-primary-bold text-xl">
                Ready to focus?
              </Text>
            </View>
            <View className="bg-primary/20 border border-primary/40 rounded-full px-3 py-1">
              <Text className="text-primary font-primary-semibold text-xs uppercase tracking-wider">
                {incompleteTasks.length > 0
                  ? `${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''}`
                  : 'No tasks'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenTaskSelection}
            disabled={incompleteTasks.length === 0}
            className={`w-full py-4 rounded-2xl items-center ${incompleteTasks.length > 0 ? 'bg-white' : 'bg-gray-800'
              }`}
            activeOpacity={0.85}
          >
            <Text
              className={`font-primary-bold text-base ${incompleteTasks.length > 0 ? 'text-background' : 'text-gray-600'
                }`}
            >
              {incompleteTasks.length > 0 ? 'Start Focus Session' : 'Add a task to begin'}
            </Text>
          </TouchableOpacity>

          {incompleteTasks.length === 0 && (
            <Text className="text-gray-500 font-primary-medium text-xs mt-3 text-center">
              You’re all clear. Add a task to schedule your next focus trip.
            </Text>
          )}
        </View>

        {/* <DailyMotivation stats={stats} /> */}

        {/* Quick stats */}
        {stats && (
          <View className="mb-2 flex-row gap-3">
            <View className="flex-1 bg-card/80 border border-white/5 rounded-2xl px-4 py-3">
              <Text className="text-gray-400 font-primary-medium text-[11px] uppercase tracking-[0.18em] mb-1">
                Focus Time
              </Text>
              <Text className="text-white font-primary-bold text-lg">
                {stats.totalMinutes} min
              </Text>
              <Text className="text-gray-500 font-primary-medium text-xs mt-1">
                All sessions
              </Text>
            </View>
            <View className="flex-1 bg-card/80 border border-white/5 rounded-2xl px-4 py-3">
              <Text className="text-gray-400 font-primary-medium text-[11px] uppercase tracking-[0.18em] mb-1">
                Completed Trips
              </Text>
              <Text className="text-white font-primary-bold text-lg">
                {stats.totalSessions}
              </Text>
              <Text className="text-gray-500 font-primary-medium text-xs mt-1">
                Lifetime
              </Text>
            </View>
          </View>
        )}



        {/* Gamified ship card */}
        <View className="bg-card rounded-3xl px-4 py-5 mb-6 border border-white/5">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View>
              <Text className="text-gray-400 font-primary-medium text-[11px] uppercase tracking-[0.18em]">
                Ship Upgrades
              </Text>
              <Text className="text-white font-primary-semibold text-base mt-1">
                Space Station
              </Text>
            </View>
            {!user?.is_premium && (
              <View className="bg-primary/20 border border-primary/40 rounded-full px-2.5 py-1">
                <Text className="text-primary font-primary-semibold text-[10px] uppercase tracking-[0.16em]">
                  Premium
                </Text>
              </View>
            )}
          </View>

          <View className="relative mt-1">
            <SpaceStation />

            {!user?.is_premium && (
              <BlurView
                intensity={40}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              >
                <View className="flex-1 items-center justify-center px-6">
                  <Text className="text-white font-primary-semibold text-sm text-center mb-2">
                    Upgrade to unlock your evolving spaceship.
                  </Text>
                  <Text className="text-gray-300 font-primary-medium text-xs text-center mb-3">
                    Your focus sessions will power up this ship with new parts and effects.
                  </Text>
                  <TouchableOpacity
                    onPress={handleOpenPremiumSpaceStation}
                    className="px-4 py-2 rounded-full bg-primary"
                    activeOpacity={0.85}
                  >
                    <Text className="text-background font-primary-bold text-xs uppercase tracking-[0.16em]">
                      Unlock First Class
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Task Selection Bottom Sheet */}
      <TaskSelectionModal
        bottomSheetRef={bottomSheetRef}
        tasks={incompleteTasks}
        onStartSession={handleStartSession}
      />

      {/* Ticket Animation */}
      {showTicket && selectedTrip && (
        <TicketAnimation
          visible={showTicket}
          trip={selectedTrip}
          tasks={selectedTasks}
          onAnimationComplete={handleTicketAnimationComplete}
        />
      )}
    </SafeAreaView>
  );
}
