import { FocusSessionScreen } from '@/components/focus/FocusSessionScreen';
import { TaskSelectionModal } from '@/components/focus/TaskSelectionModal';
import { Task, useTaskStore } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { getIncompleteTasks } from '@/lib/utils/taskUtils';
import BottomSheet from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FocusTab() {
  const user = useUserStore((state) => state.user);
  const tasks = useTaskStore((state) => state.tasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [focusStats, setFocusStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    tasksCompleted: 0,
  });

  const bottomSheetRef = useRef<BottomSheet>(null);

  const incompleteTasks = useMemo(() => {
    return getIncompleteTasks(tasks);
  }, [tasks]);

  const handleOpenTaskSelection = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleStartSession = useCallback((tasks: Task[]) => {
    setSelectedTasks(tasks);
    setSessionActive(true);
  }, []);

  const handleEndSession = useCallback((duration: number, completedTaskIds: string[]) => {
    setFocusStats(prev => ({
      totalSessions: prev.totalSessions + 1,
      totalMinutes: prev.totalMinutes + Math.floor(duration / 60),
      tasksCompleted: prev.tasksCompleted + completedTaskIds.length,
    }));
    setSessionActive(false);
    setSelectedTasks([]);
  }, []);

  const handleMarkTasksComplete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      await toggleComplete(taskId);
    }
  }, [toggleComplete]);

  if (sessionActive) {
    return (
      <FocusSessionScreen
        tasks={selectedTasks}
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
            <Text className="text-white font-primary-bold text-3xl mb-2">
              🔒 FocusLock
            </Text>
            <Text className="text-gray-400 font-primary-medium text-base">
              Lock in and crush your tasks
            </Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3 mb-8">
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Sessions</Text>
              <Text className="text-white font-primary-bold text-2xl">{focusStats.totalSessions}</Text>
            </View>
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Minutes</Text>
              <Text className="text-white font-primary-bold text-2xl">{focusStats.totalMinutes}</Text>
            </View>
            <View className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
              <Text className="text-gray-400 font-primary-medium text-sm mb-1">Tasks</Text>
              <Text className="text-white font-primary-bold text-2xl">{focusStats.tasksCompleted}</Text>
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
              className={`py-4 px-8 rounded-xl ${
                incompleteTasks.length > 0 ? 'bg-primary' : 'bg-gray-800'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-primary-bold text-lg ${
                  incompleteTasks.length > 0 ? 'text-midnight-black' : 'text-gray-600'
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

        {/* Task Selection Modal */}
        <TaskSelectionModal
          bottomSheetRef={bottomSheetRef}
          tasks={incompleteTasks}
          onStartSession={handleStartSession}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
