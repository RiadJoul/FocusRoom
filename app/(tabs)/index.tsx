import { AddTaskBottomSheet } from '@/components/home/AddTaskBottomSheet';
import { EmptyState } from '@/components/home/EmptyState';
import { FloatingAddButton } from '@/components/home/FloatingAddButton';
import { Header } from '@/components/home/Header';
import { IntroModal } from '@/components/home/IntroModal';
import { ProgressCard } from '@/components/home/ProgressCard';
import { RecurringTaskModal } from '@/components/home/RecurringTaskModal';
import { TaskList } from '@/components/home/TaskList';
import { TasksSectionHeader } from '@/components/home/TasksSectionHeader';
import { WeekCalendar } from '@/components/home/WeekCalendar';
import { useListStore } from '@/lib/stores/listStore';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getCompletedCount, getIncompleteTasks, getTasksForDay, getTopPriorityTasks } from '@/lib/utils/taskUtils';
import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { NewVersionModal } from '@/components/home/NewVersionModal';
import * as Localization from 'expo-localization';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/hooks/useRegisterForPushNotifications';
import * as Notifications from 'expo-notifications';

export default function HomeScreen() {
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const addTask = useTaskStore((state) => state.addTask);
  const removeTask = useTaskStore((state) => state.removeTask);
  const lists = useListStore((state) => state.lists);
  const fetchLists = useListStore((state) => state.fetchLists);
  const addList = useListStore((state) => state.addList);
  const removeList = useListStore((state) => state.removeList);
  const loading = useTaskStore((state) => state.loading);

  // Premium Status and List Creation Limit
  const isPremium = Boolean(user?.is_premium);
  const canCreateMoreLists = isPremium || lists.length < 5;

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const recurringBottomSheetRef = useRef<BottomSheet>(null);

  // Intro Modal
  const [showIntroModal, setShowIntroModal] = useState(false);

  // New version alert modal
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  // Selected Day for Filtering
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);
  const handleOpenRecurringSheet = useCallback(() => {
    recurringBottomSheetRef.current?.expand();
  }, []);

  // Sync device info with server
  useEffect(() => {
    if (!user) return;

    const syncDeviceInfo = async () => {
      const updates: Partial<{ timezone: string; push_token: string }> = {};

      const timeZone = Localization.getCalendars()[0]?.timeZone;
      if (!user.timezone || user.timezone != timeZone) {
        if (timeZone) updates.timezone = timeZone;
      }

      // Batch update if there are any changes
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        // Update local store with merged data
        useUserStore.getState().setUser({ ...user, ...updates });
      }

      // Sync push token independently (doesn't block other updates)
      const token = await registerForPushNotifications();
      if (user.push_token != token) {
        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
      }
    };

    syncDeviceInfo();
  }, [user]);

  // Check if user has seen intro modal and app version alert
  useEffect(() => {
    const checkIntroSeen = async () => {
      if (user?.id) {
        const hasSeenIntro = await AsyncStorage.getItem(`hasSeenIntro_${user.id}`);
        if (!hasSeenIntro) {
          setShowIntroModal(true);
        }
      }
    };

    // Show app version alert on first load after install/update
    async function checkForUpdate() {
      const latest = await fetch(
        "https://itunes.apple.com/lookup?bundleId=com.anonymous.focusRoom"
      ).then(r => r.json());
      const current = Application.nativeApplicationVersion;
      const latestVersion = latest?.results?.[0]?.version;
      if (latestVersion && latestVersion !== current) {
        const hasSeenNewVersionModal = await AsyncStorage.getItem(`hasSeenNewVersionModal_${latestVersion}`);
        if (!hasSeenNewVersionModal) {
          setLatestVersion(latestVersion);
          setShowNewVersionModal(true);
        }
      }
    }

    checkForUpdate();
    checkIntroSeen();
  }, [user?.id]);

  // Fetch data on mount and generate recurring tasks
  const generateRecurringTasks = useTaskStore((state) => state.generateRecurringTaskOccurrences);

  useEffect(() => {
    clearNotificationBadge();
    if (user?.id) {
      fetchLists(user.id);
      fetchTasks(user.id).then(() => {
        // Generate any pending recurring task occurrences
        generateRecurringTasks();
      });
    }
  }, [user?.id]);

  // Get tasks for the selected day
  const tasksForSelectedDay = useMemo(() => {
    return getTasksForDay(tasks, selectedDay, today);
  }, [tasks, selectedDay, today]);

  // Get incomplete tasks for selected day
  const incompleteTasks = useMemo(() => {
    return getIncompleteTasks(tasksForSelectedDay);
  }, [tasksForSelectedDay]);

  // Get top priority tasks for selected day
  const topTasks = useMemo(() => {
    return getTopPriorityTasks(incompleteTasks);
  }, [incompleteTasks]);

  // Calculate completed for selected day
  const completedForSelectedDay = useMemo(() => {
    return getCompletedCount(tasksForSelectedDay);
  }, [tasksForSelectedDay]);

  // Handler for adding a task
  const handleAddTask = useCallback(async (
    title: string,
    priority: 'low' | 'medium' | 'high',
    listId: string,
    dueDate: string | null
  ) => {
    await addTask(listId, title, priority, dueDate);
  }, [addTask]);

  // Handler for creating a list (enforce free vs premium limits)
  const handleCreateList = useCallback(
    async (title: string, icon: string, color?: string) => {
      if (!canCreateMoreLists) {
        Alert.alert(
          'Lists limit reached',
          'Free plan allows up to 5 lists. Upgrade to Premium to create unlimited lists.'
        );
        return null;
      }

      return await addList(title, icon, color);
    },
    [addList, canCreateMoreLists]
  );

  // Handler for deleting a list
  const handleDeleteList = useCallback(async (listId: string, listTitle: string) => {
    // Count tasks in this list
    const tasksInList = tasks.filter(task => task.list_id === listId);
    const taskCount = tasksInList.length;

    // Show confirmation alert
    Alert.alert(
      'Delete List',
      taskCount > 0
        ? `Are you sure you want to delete "${listTitle}"? This will also delete ${taskCount} task${taskCount > 1 ? 's' : ''} in this list.`
        : `Are you sure you want to delete "${listTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete all tasks in the list
            for (const task of tasksInList) {
              await removeTask(task.id);
            }
            // Delete the list
            await removeList(listId);
          }
        }
      ]
    );
  }, [tasks, removeTask, removeList]);

  // Handler for deleting a task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    await removeTask(taskId);
  }, [removeTask]);

  // Handler for closing intro modal
  const handleCloseIntroModal = useCallback(async () => {
    if (user?.id) {
      await AsyncStorage.setItem(`hasSeenIntro_${user.id}`, 'true');
    }
    setShowIntroModal(false);
  }, [user?.id]);

  const handleCloseNewVersionModal = useCallback(async () => {
    if (latestVersion) {
      await AsyncStorage.setItem(`hasSeenNewVersionModal_${latestVersion}`, "true");
    }
    setShowNewVersionModal(false);
  }, [latestVersion]);

  async function clearNotificationBadge() {
    await Notifications.setBadgeCountAsync(0);
  }


  return (
      <SafeAreaView className="flex-1 bg-background pt-5">
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Header
            userName={user?.full_name?.split(' ')[0] || ''}
            selectedDay={selectedDay}
            today={today}
          />

          {/* Week Calendar */}
          <WeekCalendar
            selectedDay={selectedDay}
            today={today}
            onDaySelect={setSelectedDay}
          />

          {/* Progress Section */}
          <ProgressCard
            selectedDay={selectedDay}
            today={today}
            completedCount={completedForSelectedDay}
            totalCount={tasksForSelectedDay.length}
          />

          {/* Today's Focus Section or Empty State */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#8F8F8F" />
              <Text className="text-gray-400 font-primary-medium mt-4">Loading tasks...</Text>
            </View>
          ) : incompleteTasks.length === 0 ? (
            <EmptyState selectedDay={selectedDay} today={today} />
          ) : (
            <View className="pt-5">
              <TasksSectionHeader
                selectedDay={selectedDay}
                today={today}
                taskCount={topTasks.length}
              />

              <TaskList
                tasks={topTasks}
                lists={lists}
                onToggleComplete={toggleComplete}
                onDeleteTask={handleDeleteTask}
              />
            </View>
          )}

          {/* Bottom Padding */}
          <View className="h-24" />
        </ScrollView>

        {/* Intro Modal */}
        <IntroModal
          visible={showIntroModal}
          onClose={handleCloseIntroModal}
        />

        <NewVersionModal
          visible={showNewVersionModal}
          latestVersion={latestVersion}
          onClose={handleCloseNewVersionModal}
        />

        {/* Floating Add Button */}
        <FloatingAddButton
          onPress={handleOpenBottomSheet}
          onLongPress={handleOpenRecurringSheet}
        />

        {/* Bottom Sheet for Adding Task */}
        <AddTaskBottomSheet
          bottomSheetRef={bottomSheetRef}
          lists={lists}
          canCreateMoreLists={canCreateMoreLists}
          onAddTask={handleAddTask}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
        />

        {/* Recurring Task Modal */}
        <RecurringTaskModal
          bottomSheetRef={recurringBottomSheetRef}
          lists={lists}
          canCreateMoreLists={canCreateMoreLists}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          onClose={() => { }}
        />

      </SafeAreaView>
  );
}
