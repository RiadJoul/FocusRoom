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
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FocusTab() {
  const navigation = useNavigation();
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const { stats, fetchStats, createSession } = useSessionStore();
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PlanetTrip | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

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
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
    });
  }, [navigation, sessionActive]);

  const incompleteTasks = useMemo(() => {
    return getIncompleteTasks(tasks);
  }, [tasks]);

  const handleOpenTaskSelection = useCallback(() => {
    bottomSheetRef.current?.expand();
    
    analytics.track(Events.TRIP_MODAL_OPENED, {
      [Properties.TASKS_COUNT]: incompleteTasks.length,
    });
  }, [incompleteTasks.length]);

  const handleStartSession = useCallback((tasks: Task[], trip: PlanetTrip) => {
    setSelectedTasks(tasks);
    setSelectedTrip(trip);
    setShowTicket(true);
    
    analytics.track(Events.TRIP_SELECTED, {
      [Properties.TRIP_ID]: trip.id,
      [Properties.TRIP_NAME]: `${trip.from} → ${trip.to}`,
      [Properties.TRIP_DESTINATION]: trip.to,
      [Properties.DURATION_MINUTES]: Math.floor(trip.duration / 60),
      [Properties.DISTANCE_KM]: trip.distance_km,
      [Properties.TASKS_COUNT]: tasks.length,
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
      });
    }
  }, [selectedTrip, selectedTasks]);

  const handleEndSession = useCallback(async (duration: number, completedTaskIds: string[]) => {
    if (!user?.id || !selectedTrip) return;

    try {
      // Track session completion
      analytics.track(Events.SESSION_COMPLETED, {
        [Properties.TRIP_ID]: selectedTrip.id,
        [Properties.TRIP_NAME]: `${selectedTrip.from} → ${selectedTrip.to}`,
        [Properties.DURATION_SECONDS]: duration,
        [Properties.DURATION_MINUTES]: Math.floor(duration / 60),
        [Properties.DISTANCE_KM]: selectedTrip.distance_km,
        [Properties.TASKS_COMPLETED]: completedTaskIds.length,
        [Properties.TASKS_COUNT]: selectedTasks.length,
        completed_percentage: Math.round((completedTaskIds.length / selectedTasks.length) * 100),
      });
      
      // Increment user stats
      analytics.incrementProperty('total_sessions', 1);
      analytics.incrementProperty('total_minutes', Math.floor(duration / 60));
      analytics.incrementProperty('total_distance_km', selectedTrip.distance_km);
      
      // Save session to database
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
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setSessionActive(false);
    setSelectedTasks([]);
    setSelectedTrip(null);
    setSessionStartTime(null);
  }, [user?.id, selectedTrip, sessionStartTime, createSession, selectedTasks]);

  const handleMarkTasksComplete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      await toggleComplete(taskId);
    }
  }, [toggleComplete]);

  if (sessionActive && selectedTrip) {
    return (
      <FocusSessionScreen
        tasks={selectedTasks}
        trip={selectedTrip}
        onEndSession={handleEndSession}
        onMarkTasksComplete={handleMarkTasksComplete}
      />
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-midnight-black">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="pt-6 pb-8">
            <View className='flex flex-row items-center'>
              <Image
                source={require('../../assets/images/logo.png')}
                className="w-12 h-12 mr-1 mb-2"
              />
              <Text className="text-white font-primary-bold text-3xl">
                FocusRoom
              </Text>
            </View>

            <Text className="text-gray-400 font-primary-medium text-base">
              Lock in and crush your tasks
            </Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3 mb-8">
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Sessions</Text>
              <Text className="text-white font-primary-bold text-2xl">{stats?.totalSessions || 0}</Text>
            </View>
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Minutes</Text>
              <Text className="text-white font-primary-bold text-2xl">{stats?.totalMinutes || 0}</Text>
            </View>
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Tasks</Text>
              <Text className="text-white font-primary-bold text-2xl">{stats?.tasksCompleted || 0}</Text>
            </View>
          </View>
          {/* How it Works */}
          <View className="mb-8">
            <Text className="text-white font-primary-semibold text-xl mb-4">
              How it works
            </Text>
            <View className="gap-4">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-primary-bold">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-primary-semibold mb-1">Select Tasks</Text>
                  <Text className="text-gray-400 font-primary-regular">
                    Choose up to 3 tasks you want to focus on
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-primary-bold">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-primary-semibold mb-1">Lock In</Text>
                  <Text className="text-gray-400 font-primary-regular">
                    Enter immersive focus mode with timer
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-primary-bold">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-primary-semibold mb-1">Complete & Track</Text>
                  <Text className="text-gray-400 font-primary-regular">
                    Mark tasks complete and track your progress
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Main Focus Card */}
          <View className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-3xl p-8 mb-6 items-center">
            <Text className="text-white font-primary-bold text-2xl mb-3 text-center">
              Ready to Focus?
            </Text>
            <Text className="text-gray-400 font-primary-medium text-center mb-8 px-4">
              Select up to 3 tasks and enter deep work mode. Block distractions and unlock your productivity.
            </Text>
            <TouchableOpacity
              onPress={handleOpenTaskSelection}
              disabled={incompleteTasks.length === 0}
              className={`py-4 px-8 rounded-xl ${incompleteTasks.length > 0 ? 'bg-primary' : 'bg-gray-800'
                }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-primary-bold text-lg ${incompleteTasks.length > 0 ? 'text-midnight-black' : 'text-gray-600'
                  }`}
              >
                Start Focus Session
              </Text>
            </TouchableOpacity>
            {incompleteTasks.length === 0 && (
              <Text className="text-gray-500 font-primary-medium text-sm mt-4 text-center">
                Add some tasks first to start a focus session
              </Text>
            )}
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
    </GestureHandlerRootView>
  );
}
