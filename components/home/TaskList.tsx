import { TaskList as TaskListType } from '@/lib/stores/listStore';
import { Task } from '@/lib/stores/taskStore';
import { formatDueDate } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

interface TaskListProps {
  tasks: Task[];
  lists: TaskListType[];
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

interface TaskItemProps {
  task: Task;
  isLastItem: boolean;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function TaskItem({ task, isLastItem, onToggleComplete, onDeleteTask }: TaskItemProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const isCompleting = useSharedValue(false);
  const isDeleting = useSharedValue(false);

  const SWIPE_THRESHOLD = 100;

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggleComplete(task.id);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDeleteTask(task.id);
  };

  const handleNudge = () => {
    // Light haptic feedback for the nudge
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Allow right swipe for incomplete tasks (complete)
      if (task.status !== 'completed' && event.translationX > 0) {
        translateX.value = event.translationX;
        
        // Scale effect based on swipe progress
        const progress = Math.min(event.translationX / SWIPE_THRESHOLD, 1);
        scale.value = 1 - progress * 0.05;
      }
      // Allow left swipe for all tasks (delete)
      else if (event.translationX < 0) {
        translateX.value = event.translationX;
        
        // Scale effect based on swipe progress
        const progress = Math.min(Math.abs(event.translationX) / SWIPE_THRESHOLD, 1);
        scale.value = 1 - progress * 0.05;
      }
    })
    .onEnd((event) => {
      // Right swipe - Complete task
      if (event.translationX > SWIPE_THRESHOLD && task.status !== 'completed' && !isCompleting.value) {
        isCompleting.value = true;
        translateX.value = withTiming(400, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 }, () => {
          runOnJS(handleComplete)();
        });
      }
      // Left swipe - Delete task
      else if (event.translationX < -SWIPE_THRESHOLD && !isDeleting.value) {
        isDeleting.value = true;
        translateX.value = withTiming(-400, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 }, () => {
          runOnJS(handleDelete)();
        });
      }
      // Spring back to original position
      else {
        translateX.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (task.status === 'completed') {
      return;
    }

    // Nudge animation to hint that user should swipe right
    runOnJS(handleNudge)();
    translateX.value = withSequence(
      // Move to the right
      withSpring(30, {
        damping: 10,
        stiffness: 200,
      }),
      // Hold for 100ms
      withDelay(100,
        // Spring back to original position
        withSpring(0, {
          damping: 15,
          stiffness: 150,
        })
      )
    );
  });

  const composedGestures = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const checkIconStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.5, 1.2]) },
      ],
    };
  });

  const deleteIconStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.5, 1.2]) },
      ],
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress * 0.3,
    };
  });

  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress * 0.3,
    };
  });

  return (
    <View className={isLastItem ? '' : 'mb-3'}>
      {/* Complete Background Indicator (Right Swipe) */}
      <Animated.View 
        style={backgroundStyle}
        className="absolute left-0 top-0 bottom-0 w-24 bg-primary rounded-2xl flex items-center justify-center"
      >
        <Animated.View style={checkIconStyle}>
          <Text className="text-3xl">✓</Text>
        </Animated.View>
      </Animated.View>

      {/* Delete Background Indicator (Left Swipe) */}
      <Animated.View 
        style={deleteBackgroundStyle}
        className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 rounded-2xl flex items-center justify-center"
      >
        <Animated.View style={deleteIconStyle}>
          <Text className="text-3xl">🗑️</Text>
        </Animated.View>
      </Animated.View>

      {/* Task Card */}
      <GestureDetector gesture={composedGestures}>
        <Animated.View
          style={animatedStyle}
          className={`bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex-row items-center`}
        >
          {/* Checkbox */}
          <View className={`w-7 h-7 rounded-full border-2 mr-4 items-center justify-center ${
            task.status === 'completed' ? 'border-primary bg-primary' : 'border-gray-700'
          }`}>
            {task.status === 'completed' && (
              <Text className="text-midnight-black font-primary-bold">✓</Text>
            )}
          </View>
          
          {/* Task Content */}
          <View className="flex-1">
            <Text className={`font-primary-semibold text-base leading-tight ${
              task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'
            }`}>
              {task.title}
            </Text>
            <View className="flex-row items-center mt-2">
              {/* Priority Badge */}
              <View className={`flex-row items-center px-2 py-1 rounded-md mr-2 ${getPriorityColor(task.priority)}`}>
                <Text className="text-xs font-primary-medium capitalize" style={{
                  color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e'
                }}>
                  {task.priority}
                </Text>
              </View>
              
              {/* Due Date */}
              {task.due_date && (
                <View className="flex-row items-center">
                  <Text className="text-xs font-primary-medium text-gray-500">
                    🕒 {formatDueDate(new Date(task.due_date))}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function TaskList({ tasks, lists, onToggleComplete, onDeleteTask }: TaskListProps) {
  // Group tasks by list_id
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const listTasks = groups.get(task.list_id) || [];
      listTasks.push(task);
      groups.set(task.list_id, listTasks);
    });
    
    return groups;
  }, [tasks]);

  // Get list info by id
  const getListInfo = (listId: string) => {
    const list = lists.find(l => l.id === listId);
    return {
      title: list?.title || 'Unknown List',
      icon: list?.icon || 'list-outline'
    };
  };

  return (
    <View>
      {Array.from(groupedTasks.entries()).map(([listId, listTasks], groupIndex) => {
        const listInfo = getListInfo(listId);
        return (
          <View key={listId} className={groupIndex > 0 ? 'mt-6' : ''}>
            {/* List Header */}
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name={listInfo.icon as any} size={16} color="#9CA3AF" />
              <Text className="text-gray-400 font-primary-semibold text-sm uppercase tracking-wider">
                {listInfo.title} ({listTasks.length})
              </Text>
            </View>
            
            {/* Tasks in this list */}
            {listTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                isLastItem={index === listTasks.length - 1}
                onToggleComplete={onToggleComplete}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}
