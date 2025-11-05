import { AddTaskBottomSheet } from '@/components/home/AddTaskBottomSheet';
import { EmptyState } from '@/components/home/EmptyState';
import { FloatingAddButton } from '@/components/home/FloatingAddButton';
import { Header } from '@/components/home/Header';
import { IntroModal } from '@/components/home/IntroModal';
import { ProgressCard } from '@/components/home/ProgressCard';
import { TaskList } from '@/components/home/TaskList';
import { TasksSectionHeader } from '@/components/home/TasksSectionHeader';
import { WeekCalendar } from '@/components/home/WeekCalendar';
import { useListStore } from '@/lib/stores/listStore';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getCompletedCount, getIncompleteTasks, getTasksForDay, getTopPriorityTasks } from '@/lib/utils/taskUtils';
import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const addTask = useTaskStore((state) => state.addTask);
  const removeTask = useTaskStore((state) => state.removeTask);
  const lists = useListStore((state) => state.lists);
  const fetchLists = useListStore((state) => state.fetchLists);
  const addList = useListStore((state) => state.addList);
  const loading = useTaskStore((state) => state.loading);

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  // Intro Modal
  const [showIntroModal, setShowIntroModal] = useState(false);
  
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

  // Check if user has seen intro modal
  useEffect(() => {
    const checkIntroSeen = async () => {
      if (user?.id) {
        const hasSeenIntro = await AsyncStorage.getItem(`hasSeenIntro_${user.id}`);
        if (!hasSeenIntro) {
          setShowIntroModal(true);
        }
      }
    };
    checkIntroSeen();
  }, [user?.id]);

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      fetchLists(user.id);
      fetchTasks(user.id);
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

  // Handler for creating a list
  const handleCreateList = useCallback(async (title: string, icon: string) => {
    return await addList(title, icon);
  }, [addList]);

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

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-midnight-black pt-5">
        <ScrollView 
          className="flex-1 px-4" 
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Header
            userName={user?.full_name?.split(' ')[0] || ''}
            completedCount={completedForSelectedDay}
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
              <ActivityIndicator size="large" color="#EA526F" />
              <Text className="text-gray-400 font-primary-medium mt-4">Loading tasks...</Text>
            </View>
          ) : tasksForSelectedDay.length === 0 ? (
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

        {/* Floating Add Button */}
        <FloatingAddButton onPress={handleOpenBottomSheet} />

        {/* Bottom Sheet for Adding Task */}
        <AddTaskBottomSheet
          bottomSheetRef={bottomSheetRef}
          lists={lists}
          onAddTask={handleAddTask}
          onCreateList={handleCreateList}
        />

        {/* Intro Modal */}
        <IntroModal 
          visible={showIntroModal}
          onClose={handleCloseIntroModal}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}