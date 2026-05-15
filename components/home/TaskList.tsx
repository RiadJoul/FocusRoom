import { TaskList as TaskListType } from '@/lib/stores/listStore';
import { Task } from '@/lib/stores/taskStore';
import { formatLocalDateKey, parseLocalDateKey } from '@/lib/utils/dateUtils';
import { getPriorityColor } from '@/lib/utils/taskUtils';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Platform, Text, TouchableOpacity, View, Alert } from 'react-native';
import { NestableDraggableFlatList, NestableScrollContainer, RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const LIST_ORDER_KEY = 'list_group_order';
const taskOrderKey = (dateKey: string) => `task_order_${dateKey}`;

interface TaskListProps {
  tasks: Task[];
  lists: TaskListType[];
  selectedDay: Date;
  listHeaderComponent?: React.ReactNode;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newDate: string) => void;
}

interface TaskItemProps {
  task: Task;
  list: { title: string; icon: string; color: string };
  drag: () => void;
  isActive: boolean;
  showDragHandle: boolean;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newDate: string) => void;
}

function TaskItem({ task, list, drag, isActive, showDragHandle, onToggleComplete, onDeleteTask, onMoveTask }: TaskItemProps) {
  const [isAnimatingComplete, setIsAnimatingComplete] = useState(false);
  const completeAnim = useSharedValue(0);

  const handleToggleCompletePress = () => {
    if (isAnimatingComplete) return;
    setIsAnimatingComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeAnim.value = withTiming(1, { duration: 800 }, (finished) => {
      'worklet';
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

  const handleOptionsPress = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = task.due_date ? parseLocalDateKey(task.due_date) : null;

    const moveToTodayDate = formatLocalDateKey(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const moveToTomorrowDate = formatLocalDateKey(tomorrow);

    const options: { label: string; action: () => void }[] = [];

    if (taskDate) {
      const diffDays = Math.round(
        (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === -1) {
        options.push({ label: 'Move to Today', action: () => onMoveTask(task.id, moveToTodayDate) });
        options.push({ label: 'Move to Tomorrow', action: () => onMoveTask(task.id, moveToTomorrowDate) });
      } else if (diffDays === 0) {
        options.push({ label: 'Move to Tomorrow', action: () => onMoveTask(task.id, moveToTomorrowDate) });
      } else if (diffDays === 1) {
        options.push({ label: 'Move to Today', action: () => onMoveTask(task.id, moveToTodayDate) });
      }
    }

    options.push({ label: 'Delete', action: handleDelete });

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
          options[buttonIndex - 1]?.action();
        }
      );
    } else {
      Alert.alert('Task options', undefined, [
        ...options.map((o, index) => ({
          text: o.label,
          onPress: o.action,
          style: (index === options.length - 1 ? 'destructive' : 'default') as 'destructive' | 'default',
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const checkIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: completeAnim.value,
    transform: [{ scale: 0.8 + 0.4 * completeAnim.value }],
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
    <ScaleDecorator activeScale={0.97}>
      <View
        className="mb-3 rounded-2xl overflow-hidden flex-row"
        style={{
          backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        }}
      >

        <View className="flex-1 px-4 py-3 flex-row items-center">
          {/* Completion ring */}
          <TouchableOpacity
            onPress={handleToggleCompletePress}
            activeOpacity={0.8}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              style={{ borderColor: '#9CA3AF', borderWidth: 2 }}
              className="w-6 h-6 rounded-lg items-center justify-center overflow-hidden"
            >
              <Animated.View
                style={[fillCircleAnimatedStyle, { backgroundColor: list.color || '#9CA3AF' }]}
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
                style={[completedTextAnimatedStyle, { position: 'absolute', left: 0, right: 0, top: 0 }]}
                className="font-primary-semibold text-base leading-tight text-gray-500 line-through"
              >
                {task.title}
              </Animated.Text>
            </View>
            <View className="flex-row items-center mt-1.5">
              <View className={`flex-row items-center rounded-md mr-2 ${getPriorityColor(task.priority)}`}>
                <Text
                  className="text-xs font-primary-medium capitalize"
                  style={{
                    color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e',
                  }}
                >
                  {task.priority}
                </Text>
              </View>
            </View>
          </View>

          {/* Options button */}
          <TouchableOpacity
            onPress={handleOptionsPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="ml-3"
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </TouchableOpacity>

          {/* Drag handle — only when >1 task in list */}
          {showDragHandle && (
            <TouchableOpacity
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }}
              delayLongPress={200}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              className="ml-3"
              activeOpacity={0.5}
            >
              <Ionicons name="reorder-two-outline" size={20} color="#374151" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScaleDecorator>
  );
}

type GroupItem = {
  listId: string;
  listInfo: { title: string; icon: string; color: string };
  tasks: Task[];
};

export function TaskList({ tasks, lists, selectedDay, listHeaderComponent, onToggleComplete, onDeleteTask, onMoveTask }: TaskListProps) {
  const dateKey = formatLocalDateKey(selectedDay);

  const [orderedListIds, setOrderedListIds] = useState<string[]>([]);
  const [orderedTaskIds, setOrderedTaskIds] = useState<string[]>([]);
  const orderLoaded = useRef(false);

  useEffect(() => {
    async function load() {
      const [listOrderRaw, taskOrderRaw] = await Promise.all([
        AsyncStorage.getItem(LIST_ORDER_KEY),
        AsyncStorage.getItem(taskOrderKey(dateKey)),
      ]);
      setOrderedListIds(listOrderRaw ? JSON.parse(listOrderRaw) : []);
      setOrderedTaskIds(taskOrderRaw ? JSON.parse(taskOrderRaw) : []);
      orderLoaded.current = true;
    }
    orderLoaded.current = false;
    load();
  }, [dateKey]);

  const listIdsInTasks = useMemo(() => {
    const seen = new Set<string>();
    tasks.forEach((t) => seen.add(t.list_id));
    return Array.from(seen);
  }, [tasks]);

  const sortedListIds = useMemo(() => {
    const saved = orderedListIds.filter((id) => listIdsInTasks.includes(id));
    const unsaved = listIdsInTasks.filter((id) => !saved.includes(id));
    return [...saved, ...unsaved];
  }, [orderedListIds, listIdsInTasks]);

  const sortedTasks = useMemo(() => {
    const taskIds = tasks.map((t) => t.id);
    const saved = orderedTaskIds.filter((id) => taskIds.includes(id));
    const unsaved = tasks.filter((t) => !saved.includes(t.id)).map((t) => t.id);
    return [...saved, ...unsaved].map((id) => tasks.find((t) => t.id === id)!).filter(Boolean);
  }, [orderedTaskIds, tasks]);

  const groupItems: GroupItem[] = useMemo(() => {
    const getListInfo = (listId: string) => {
      const list = lists.find((l) => l.id === listId);
      return {
        title: list?.title || 'Unknown List',
        icon: list?.icon || 'list-outline',
        color: list?.color || '#9CA3AF',
      };
    };
    return sortedListIds.map((listId) => ({
      listId,
      listInfo: getListInfo(listId),
      tasks: sortedTasks.filter((t) => t.list_id === listId),
    }));
  }, [sortedListIds, sortedTasks, lists]);

  const handleReorderGroups = useCallback(async ({ data }: { data: GroupItem[] }) => {
    const newOrder = data.map((g) => g.listId);
    setOrderedListIds(newOrder);
    await AsyncStorage.setItem(LIST_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  const handleReorderTasks = useCallback(
    async (newGroupTasks: Task[]) => {
      const groupListId = newGroupTasks[0]?.list_id;
      if (!groupListId) return;

      const newFull: Task[] = [];
      let groupInserted = false;
      for (const t of sortedTasks) {
        if (t.list_id === groupListId) {
          if (!groupInserted) {
            newFull.push(...newGroupTasks);
            groupInserted = true;
          }
        } else {
          newFull.push(t);
        }
      }

      const newOrder = newFull.map((t) => t.id);
      setOrderedTaskIds(newOrder);
      await AsyncStorage.setItem(taskOrderKey(dateKey), JSON.stringify(newOrder));
    },
    [dateKey, sortedTasks]
  );

  const renderGroupItem = useCallback(
    ({ item, drag: dragGroup, isActive: isGroupActive }: RenderItemParams<GroupItem>) => (
      <View
        style={{ opacity: isGroupActive ? 0.9 : 1 }}
        className={item === groupItems[groupItems.length - 1] ? '' : 'mb-6'}
      >
        {/* List header — long press to reorder groups */}
        <TouchableOpacity
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            dragGroup();
          }}
          delayLongPress={300}
          activeOpacity={1}
          className="mb-3 flex-row items-center gap-2"
        >
          <Ionicons name={item.listInfo.icon as any} size={16} color={item.listInfo.color} />
          <Text
            style={{ color: item.listInfo.color }}
            className="font-primary-semibold text-sm uppercase tracking-widest flex-1"
          >
            {item.listInfo.title} - {item.tasks.length}
          </Text>
          <Ionicons name="reorder-three-outline" size={24} color="#374151" />
        </TouchableOpacity>

        <NestableDraggableFlatList
          data={item.tasks}
          keyExtractor={(task) => task.id}
          onDragEnd={({ data }) => handleReorderTasks(data)}
          onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          renderItem={({ item: task, drag, isActive }) => (
            <TaskItem
              key={task.id}
              task={task}
              list={item.listInfo}
              drag={drag}
              isActive={isActive}
              showDragHandle={item.tasks.length > 1}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onMoveTask={onMoveTask}
            />
          )}
        />
      </View>
    ),
    [groupItems, handleReorderTasks, onToggleComplete, onDeleteTask, onMoveTask]
  );

  return (
    <NestableScrollContainer
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
    >
      {listHeaderComponent}
      <NestableDraggableFlatList
        data={groupItems}
        keyExtractor={(item) => item.listId}
        onDragEnd={handleReorderGroups}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        renderItem={renderGroupItem}
      />
    </NestableScrollContainer>
  );
}
