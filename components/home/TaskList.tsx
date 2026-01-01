import { TaskList as TaskListType } from '@/lib/stores/listStore';
import { Task } from '@/lib/stores/taskStore';
import { formatDueDate, formatLocalDateKey, parseLocalDateKey } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Platform, Text, TouchableOpacity, View, Alert } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface TaskListProps {
  tasks: Task[];
  lists: TaskListType[];
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newDate: string) => void;
}

interface TaskItemProps {
  task: Task;
  list: {
    title: string;
    icon: string;
    color: string;
  };
  isLastItem: boolean;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newDate: string) => void;
}

function TaskItem({ task, list, isLastItem, onToggleComplete, onDeleteTask, onMoveTask }: TaskItemProps) {
  const [isAnimatingComplete, setIsAnimatingComplete] = useState(false);
  const completeAnim = useSharedValue(0);

  const handleToggleCompletePress = () => {
    if (isAnimatingComplete) return;
    // In this list we only show incomplete tasks, so we treat this as a one‑way complete action.
    setIsAnimatingComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeAnim.value = withTiming(1, { duration: 800 }, (finished) => {
      if (finished) {
        runOnJS(onToggleComplete)(task.id);
        runOnJS(setIsAnimatingComplete)(false);
      }
    });
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDeleteTask(task.id);
  };

  const handleMorePress = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = task.due_date ? parseLocalDateKey(task.due_date) : null;
    if (!taskDate) {
      // For tasks without a due date, just offer delete for now
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Delete'],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleDelete();
            }
          }
        );
      } else {
        Alert.alert('Task options', undefined, [
          { text: 'Delete', style: 'destructive' as const, onPress: handleDelete },
          { text: 'Cancel', style: 'cancel' as const },
        ]);
      }
      return;
    }

    const diffDays = Math.round(
      (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const moveToTodayDate = formatLocalDateKey(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const moveToTomorrowDate = formatLocalDateKey(tomorrow);

    const options: { label: string; action: () => void }[] = [];

    if (diffDays === -1) {
      options.push({
        label: 'Move to Today',
        action: () => onMoveTask(task.id, moveToTodayDate),
      });
      options.push({
        label: 'Move to Tomorrow',
        action: () => onMoveTask(task.id, moveToTomorrowDate),
      });
    } else if (diffDays === 0) {
      options.push({
        label: 'Move to Tomorrow',
        action: () => onMoveTask(task.id, moveToTomorrowDate),
      });
    } else if (diffDays === 1) {
      options.push({
        label: 'Move to Today',
        action: () => onMoveTask(task.id, moveToTodayDate),
      });
    }

    options.push({
      label: 'Delete',
      action: handleDelete,
    });

    if (Platform.OS === 'ios') {
      const optionLabels = ['Cancel', ...options.map((o) => o.label)];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: optionLabels,
          cancelButtonIndex: 0,
          destructiveButtonIndex: optionLabels.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) return;
          const chosen = options[buttonIndex - 1];
          chosen?.action();
        }
      );
    } else {
      Alert.alert(
        'Task options',
        undefined,
        [
          ...options.map((o, index) => ({
            text: o.label,
            onPress: o.action,
            style: (index === options.length - 1 ? ('destructive' as const) : ('default' as const)),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  };

  const checkIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completeAnim.value,
    transform: [
      {
        scale: 0.8 + 0.4 * completeAnim.value,
      },
    ],
  }));

  const fillCircleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completeAnim.value,
  }));

  const normalTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - completeAnim.value,
  }));

  const completedTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completeAnim.value,
  }));

  return (
    <View className={isLastItem ? '' : 'mb-3'}>
      {/* Task Card */}
      <View className="p-4 flex-row items-center">
          {/* Completion ring */}
          <TouchableOpacity
            onPress={handleToggleCompletePress}
            activeOpacity={0.8}
            className="mr-4"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={{
                borderColor: '#9CA3AF',
                borderWidth: 2,
              }}
              className={`w-6 h-6 rounded-lg items-center justify-center overflow-hidden`}
            >
              <Animated.View
                style={[fillCircleAnimatedStyle, {backgroundColor: list.color || '#9CA3AF'}]}
                className="absolute inset-0"
              />
              <Animated.View style={checkIconAnimatedStyle}>
                <Ionicons name="checkmark" size={16} color="white" />
              </Animated.View>
            </View>
          </TouchableOpacity>
          
          {/* Task Content */}
          <View className="flex-1">
            <View>
              <Animated.Text
                style={normalTextAnimatedStyle}
                className="font-primary-semibold text-base leading-tight text-white"
              >
                {task.title}
              </Animated.Text>
              <Animated.Text
                style={[
                  completedTextAnimatedStyle,
                  { position: 'absolute', left: 0, right: 0, top: 0 },
                ]}
                className="font-primary-semibold text-base leading-tight text-gray-500 line-through"
              >
                {task.title}
              </Animated.Text>
            </View>
            <View className="flex-row items-center mt-2">
              {/* Priority Badge */}
              <View className={`flex-row items-center py rounded-md mr-2 ${getPriorityColor(task.priority)}`}>
                <Text className="text-xs font-primary-medium capitalize" style={{
                  color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e'
                }}>
                  {task.priority}
                </Text>
              </View>
              
            </View>
          </View>
          <TouchableOpacity
            onPress={handleMorePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
    </View>
  );
}

export function TaskList({ tasks, lists, onToggleComplete, onDeleteTask, onMoveTask }: TaskListProps) {
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
      icon: list?.icon || 'list-outline',
      color: list?.color || '#9CA3AF',
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
              <Ionicons name={listInfo.icon as any} size={18} color={listInfo.color} />
              <Text style={{ color: listInfo.color }} className={`font-primary-semibold text-base uppercase tracking-wider`}>
                {listInfo.title} ({listTasks.length})
              </Text>
            </View>
            
            {/* Tasks in this list */}
            {listTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                list={listInfo}
                task={task}
                isLastItem={index === listTasks.length - 1}
                onToggleComplete={onToggleComplete}
                onDeleteTask={onDeleteTask}
                onMoveTask={onMoveTask}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}
