import { TaskList } from '@/lib/stores/listStore';
import { RecurrenceType, useTaskStore } from '@/lib/stores/taskStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ListCreateModal } from './ListCreateModal';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { formatLocalDateKey } from '@/lib/utils/dateUtils';

interface RecurringTaskModalProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  lists: TaskList[];
  canCreateMoreLists: boolean;
  onClose: () => void;
  onCreateList: (title: string, icon: string, color?: string) => Promise<TaskList | null>;
  onDeleteList: (listId: string, listTitle: string) => Promise<void>;
}

const WEEKDAYS = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
];

const RECURRENCE_OPTIONS = [
  { type: 'daily' as RecurrenceType, icon: 'calendar-today', label: 'Daily', description: 'Repeats every day' },
  { type: 'weekly' as RecurrenceType, icon: 'calendar-week', label: 'Weekly', description: 'Repeats on specific days' },
  { type: 'monthly' as RecurrenceType, icon: 'calendar-month', label: 'Monthly', description: 'Repeats every month' },
  { type: 'yearly' as RecurrenceType, icon: 'calendar', label: 'Yearly', description: 'Repeats every year' },
];

export function RecurringTaskModal({
  bottomSheetRef,
  lists,
  canCreateMoreLists,
  onClose,
  onCreateList,
  onDeleteList,
}: RecurringTaskModalProps) {
  const addRecurringTask = useTaskStore((state) => state.addRecurringTask);
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default: Monday
  const [interval, setInterval] = useState('1');
  const [hasEndDate, setHasEndDate] = useState(false);


  const [showListCreator, setShowListCreator] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showManager, setShowManager] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const snapPoints = useMemo(() => ['45%', '60%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Set default list when lists change
  React.useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);



  const handleSave = async () => {
    if (!title.trim() || !selectedListId || isSaving) return;
    if (recurrenceType === 'weekly' && selectedDays.length === 0) return;

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Compute the template's first due_date so the Supabase
    // generator can schedule future occurrences from it.
    let firstDueDate: string | null = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (recurrenceType === 'weekly' && selectedDays.length > 0) {
      // Find the nearest upcoming selected weekday (including today).
      const todayDow = today.getDay(); // 0 = Sun ... 6 = Sat
      let minOffset: number | null = null;

      selectedDays.forEach((day) => {
        const offset = (day - todayDow + 7) % 7;
        if (minOffset === null || offset < minOffset) {
          minOffset = offset;
        }
      });

      const target = new Date(today);
      target.setDate(today.getDate() + (minOffset ?? 0));
      firstDueDate = formatLocalDateKey(target);
    } else {
      // For daily/monthly/yearly we can start from today.
      firstDueDate = formatLocalDateKey(today);
    }

    try {
      await addRecurringTask(
        selectedListId,
        title,
        recurrenceType,
        recurrenceType === 'weekly' ? selectedDays : undefined,
        priority,
        firstDueDate,
        parseInt(interval) || 1,
        hasEndDate ? null : null
      );

      setTitle('');
      setPriority('medium');
      setRecurrenceType('weekly');
      setSelectedDays([1]);
      setInterval('1');
      setHasEndDate(false);

      setStep(1);
      bottomSheetRef.current?.close();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
    setStep(1);
    onClose();
  };

  const handleOpenManager = () => {
    if (!recurringTemplates.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowManager(true);
  };

  const getRecurrenceSummary = () => {
    if (recurrenceType === 'weekly' && selectedDays.length > 0) {
      const dayNames = selectedDays.map((d) => WEEKDAYS[d].label);
      return `Every ${dayNames.join(', ')}`;
    }
    if (interval !== '1') {
      return `Every ${interval} ${recurrenceType === 'daily'
        ? 'days'
        : recurrenceType === 'weekly'
          ? 'weeks'
          : recurrenceType === 'monthly'
            ? 'months'
            : 'years'
        }`;
    }
    return `Every ${recurrenceType.replace('ly', '')}`;
  };

  const handleCreateListViaModal = async (
    listTitle: string,
    icon: string,
    color?: string
  ) => {
    const newList = await onCreateList(listTitle, icon, color);
    if (newList) {
      setSelectedListId(newList.id);
    }
  };

  const goToNextStep = () => {
    if (step === 1) {
      if (!title.trim() || !selectedListId) return;
      setStep(2);
    } else if (step === 2) {
      if (recurrenceType === 'weekly' && selectedDays.length === 0) return;
      setStep(3);
    }
  };

  const goToPreviousStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const recurringTemplates = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.is_recurring &&
          !t.parent_task_id &&
          t.recurrence_type
      ),
    [tasks]
  );

  const getRecurrenceSummaryForTask = useCallback(
    (task: (typeof tasks)[number]) => {
      const type = task.recurrence_type;
      const interval = task.recurrence_interval || 1;
      const days = task.recurrence_days || [];

      if (!type) return 'Repeats';

      if (type === 'weekly' && days.length > 0) {
        const WEEKDAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const names = days.map((d) => WEEKDAYS_NAMES[d] ?? '').filter(Boolean);
        return `Every ${names.join(', ')}`;
      }

      if (interval !== 1) {
        const unit =
          type === 'daily'
            ? 'days'
            : type === 'weekly'
              ? 'weeks'
              : type === 'monthly'
                ? 'months'
                : 'years';
        return `Every ${interval} ${unit}`;
      }

      const unit =
        type === 'daily'
          ? 'day'
          : type === 'weekly'
            ? 'week'
            : type === 'monthly'
              ? 'month'
              : 'year';
      return `Every ${unit}`;
    },
    [tasks]
  );

  const handleStopRecurring = useCallback(
    (task: (typeof tasks)[number]) => {
      Alert.alert(
        'Stop repeating?',
        'This will stop this task from creating new occurrences. Existing ones will stay in your list.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop repeating',
            style: 'destructive',
            onPress: async () => {
              await updateTask(task.id, {
                is_recurring: false,
                recurrence_type: null,
                //@ts-ignore
                recurrence_interval: null,
                //@ts-ignore
                recurrence_days: null,
                recurrence_end_date: null,
              });
            },
          },
        ]
      );
    },
    [tasks, updateTask]
  );

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#0C0C0D' }}
        handleIndicatorStyle={{ backgroundColor: '#6B7280' }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onClose={handleClose}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header with step indicator */}
          <View className="px-6 py-6 border-b border-gray-800">
            <View className="flex-row items-center justify-between mb-2">
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="repeat" size={20} color="#60A5FA" />
                <Text className="font-primary-bold text-xl text-white">
                  Recurring Task
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-500 font-primary-medium text-xs">
                  Step {step} of 3
                </Text>
              </View>
            </View>
            <Text className="font-primary-regular text-xs text-gray-500 text-center mt-1">
              {getRecurrenceSummary()}
            </Text>
          </View>

          <BottomSheetScrollView
            className="flex-1 px-5 py-4"
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: Title + List */}
            {step === 1 && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(140)}
              >
                {/* No Lists Warning */}
                {lists.length === 0 && (
                  <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                    <Text className="text-yellow-500 font-primary-semibold text-sm">
                      ⚠️ Please create a list first to organize your tasks
                    </Text>
                  </View>
                )}

                {/* Task Title - Notion-style */}
                <View className="mb-4">
                  <Text className="text-gray-400 font-primary-medium text-xs mb-1">
                    Task title
                  </Text>
                  <BottomSheetTextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="E.g., Weekly assignment, Daily workout..."
                    placeholderTextColor="#4B5563"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: '#1F2937',
                      paddingHorizontal: 0,
                      paddingVertical: 10,
                      color: '#FFFFFF',
                      fontSize: 18,
                    }}
                  />



                </View>

                {/* List Selection – same pill style as quick add */}
                <View className="mt-4">

                  <View className="flex-row flex-wrap gap-3 mb-4">
                    {lists.map((list) => (
                      <TouchableOpacity
                        key={list.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedListId(list.id);
                        }}
                        onLongPress={() => {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning
                          );
                          onDeleteList(list.id, list.title);
                          if (selectedListId === list.id) {
                            const remaining = lists.filter((l) => l.id !== list.id);
                            setSelectedListId(remaining[0]?.id ?? '');
                          }
                        }}
                        className="px-4 py-3 rounded-full flex-row items-center gap-2"
                        style={{
                          backgroundColor: `${list.color}4D`,
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={list.icon as any}
                          size={18}
                          color={list.color}
                          style={{
                            opacity: selectedListId === list.id ? 1 : 0.5,
                          }}
                        />
                        <Text
                          className="font-primary-semibold text-base"
                          style={{
                            color: list.color,
                            opacity: selectedListId === list.id ? 1 : 0.5,
                          }}
                        >
                          {list.title}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={() => {
                        if (!canCreateMoreLists) {
                          presentPaywallOnce();
                          return;
                        }
                        setShowListCreator(true);
                      }}

                      className={`px-4 py-3 rounded-full flex-row items-center gap-2 border ${canCreateMoreLists
                        ? 'bg-primary/10 border-dashed border-primary/60'
                        : 'bg-secondary/10 border-secondary'
                        }`}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={16} color="#E4F964" />
                      <Text className="text-primary font-primary-semibold text-base">
                        New
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* STEP 2: Priority + Recurrence */}
            {step === 2 && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(140)}
              >
                {/* Priority */}
                <View className="mb-4">
                  <Text className="text-gray-400 font-primary-medium text-sm mb-2">
                    Priority
                  </Text>
                  <View className="flex-row gap-3">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPriority(p);
                        }}
                        disabled={lists.length === 0}
                        className={`flex-1 py-3 rounded-xl border items-center ${priority === p
                          ? p === 'high'
                            ? 'bg-red-500/10 border-red-500'
                            : p === 'medium'
                              ? 'bg-yellow-500/10 border-yellow-500'
                              : 'bg-green-500/10 border-green-500'
                          : 'bg-gray-900/50 border-gray-800'
                          }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`font-primary-semibold capitalize ${priority === p
                            ? p === 'high'
                              ? 'text-red-500'
                              : p === 'medium'
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            : 'text-gray-400'
                            }`}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Recurrence Type */}
                <View className="mb-4">
                  <Text className="text-gray-400 font-primary-medium text-sm mb-2">
                    Repeats
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {RECURRENCE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.type}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setRecurrenceType(option.type);
                        }}
                        className={`px-4 py-3 rounded-xl border ${recurrenceType === option.type
                          ? 'bg-primary/10 border-primary'
                          : 'bg-gray-900/50 border-gray-800'
                          }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`font-primary-semibold text-sm ${recurrenceType === option.type
                            ? 'text-primary'
                            : 'text-gray-400'
                            }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Interval */}
                {interval !== '1' && (
                  <View className="mb-4">
                    <Text className="text-gray-400 font-primary-medium text-sm mb-2">
                      Frequency
                    </Text>
                    <View className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex-row items-center justify-center gap-3">
                      <TouchableOpacity
                        onPress={() => {
                          const num = Math.max(1, parseInt(interval) - 1);
                          setInterval(num.toString());
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={20} color="white" />
                      </TouchableOpacity>

                      <Text className="font-primary-semibold text-base text-white px-4">
                        Every {interval}{' '}
                        {recurrenceType === 'daily' && `day${interval !== '1' ? 's' : ''}`}
                        {recurrenceType === 'weekly' && `week${interval !== '1' ? 's' : ''}`}
                        {recurrenceType === 'monthly' && `month${interval !== '1' ? 's' : ''}`}
                        {recurrenceType === 'yearly' && `year${interval !== '1' ? 's' : ''}`}
                      </Text>

                      <TouchableOpacity
                        onPress={() => {
                          const num = Math.min(99, parseInt(interval) + 1);
                          setInterval(num.toString());
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Days of Week (only for weekly) */}
                {recurrenceType === 'weekly' && (
                  <View className="mb-4">
                    <Text className="text-gray-400 font-primary-medium text-sm mb-2">
                      On Days
                    </Text>
                    <View className="flex-row gap-2">
                      {WEEKDAYS.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          onPress={() => toggleDay(day.value)}
                          className={`flex-1 py-3 rounded-xl border items-center ${selectedDays.includes(day.value)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-gray-900/50 border-gray-800'
                            }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-primary-bold text-sm ${selectedDays.includes(day.value)
                              ? 'text-primary'
                              : 'text-gray-600'
                              }`}
                          >
                            {day.short}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {selectedDays.length === 0 && (
                      <Text className="font-primary-regular text-xs text-red-400 mt-2">
                        ⚠️ Please select at least one day
                      </Text>
                    )}
                  </View>
                )}
              </Animated.View>
            )}

            {/* STEP 3: Summary */}
            {step === 3 && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(140)}
              >
                <View className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4 mt-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="repeat" size={16} color="#6B7280" />
                    <Text className="font-primary-medium text-sm text-gray-400 ml-2">
                      {getRecurrenceSummary()}
                    </Text>
                  </View>
                  <Text className="font-primary-regular text-xs text-gray-500 leading-5">
                    Creates new task instances automatically. Each can be completed
                    independently.
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3 mb-4 mt-2">
              {step === 1 && (
                <View className='w-full flex-col gap-3'>
                  <TouchableOpacity
                    onPress={goToNextStep}
                    disabled={!title.trim() || !selectedListId}
                    className={`flex-1 py-4 rounded-xl ${title.trim() && selectedListId ? 'bg-white' : 'bg-white/50'
                      }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`font-primary-semibold text-base text-center ${title.trim() && selectedListId ? 'text-black' : 'text-gray-600'
                        }`}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                  {recurringTemplates.length > 0 && (
                    <TouchableOpacity
                      onPress={handleOpenManager}
                      activeOpacity={0.7}
                      className="flex-row items-center px-3 py-4 rounded-xl bg-gray-900/70 border border-gray-700"
                    >
                      <MaterialCommunityIcons name="timetable" size={16} color="#9CA3AF" />
                      <Text className="ml-2 text-base text-center font-primary-medium text-gray-300">
                        Manage recurring tasks ({recurringTemplates.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {step === 2 && (
                <>
                  <TouchableOpacity
                    onPress={goToPreviousStep}
                    className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800"
                    activeOpacity={0.7}
                  >
                    <Text className="font-primary-semibold text-base text-gray-400 text-center">
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={goToNextStep}
                    disabled={recurrenceType === 'weekly' && selectedDays.length === 0}
                    className={`flex-1 py-4 rounded-xl ${recurrenceType === 'weekly' && selectedDays.length === 0
                      ? 'bg-white/50'
                      : 'bg-white'
                      }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`font-primary-semibold text-base text-center ${recurrenceType === 'weekly' && selectedDays.length === 0
                        ? 'text-gray-600'
                        : 'text-black'
                        }`}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 3 && (
                <>
                  <TouchableOpacity
                    onPress={goToPreviousStep}
                    className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800"
                    activeOpacity={0.7}
                  >
                    <Text className="font-primary-semibold text-base text-gray-400 text-center">
                      Back
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={
                      isSaving ||
                      !title.trim() ||
                      !selectedListId ||
                      (recurrenceType === 'weekly' && selectedDays.length === 0)
                    }
                    className={`flex-1 py-4 rounded-xl ${
                      isSaving
                        ? 'bg-white/60'
                        : title.trim() &&
                          selectedListId &&
                          !(recurrenceType === 'weekly' && selectedDays.length === 0)
                        ? 'bg-white'
                        : 'bg-white/50'
                    }`}
                    activeOpacity={0.7}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text
                        className={`font-primary-semibold text-base text-center ${
                          title.trim() &&
                          selectedListId &&
                          !(recurrenceType === 'weekly' && selectedDays.length === 0)
                            ? 'text-black'
                            : 'text-gray-600'
                        }`}
                      >
                        Create Task
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BottomSheetScrollView>
          {/* In-modal manager overlay */}
          {showManager && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              className="absolute inset-0 bg-black/70 items-center justify-center px-5"
            >
              <View className="w-full max-w-md rounded-2xl bg-black border border-gray-800 p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-white font-primary-semibold text-base">
                      Recurring tasks
                    </Text>
                    <Text className="text-gray-400 font-primary-regular text-xs mt-1">
                      These templates automatically create future tasks.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowManager(false)}
                    activeOpacity={0.7}
                    className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {recurringTemplates.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-gray-500 font-primary-regular text-sm text-center">
                      You don&apos;t have any recurring tasks yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 320 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {recurringTemplates.map((task) => {
                      const list =
                        lists.find((list) => list.id === task.list_id)
                      const summary = getRecurrenceSummaryForTask(task);

                      return (
                        <View
                          key={task.id}
                          className="mb-3 rounded-xl bg-black border border-white/40 p-4"
                        >
                          <View className="mb-2">
                            <Text className="text-white font-primary-semibold text-sm">
                              {task.title}
                            </Text>
                            <Text className="text-gray-400 font-primary-regular text-xs mt-1">
                              {summary}
                            </Text>
                          </View>

                          <View className="flex-row items-center justify-between">
                            <View
                              className="px-2 py-1.5 rounded-full flex-row items-center gap-2"
                              style={{
                                backgroundColor: `${list?.color}4D`,
                              }}
                              
                            >
                              <Ionicons
                                name={list?.icon as any}
                                size={14}
                                color={list?.color}
                                
                              />
                              <Text
                                className="font-primary-semibold text-sm"
                                style={{
                                  color: list?.color,
                                }}
                              >
                                {list?.title}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleStopRecurring(task)}
                              activeOpacity={0.7}
                              className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/60"
                            >
                              <Text className="text-red-400 font-primary-semibold text-xs">
                                Stop repeating
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </Animated.View>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* List Create Modal */}
      <ListCreateModal
        visible={showListCreator}
        onClose={() => setShowListCreator(false)}
        onCreate={handleCreateListViaModal}
      />
    </>
  );
}

// Re-export for any existing imports
export { LIST_ICONS } from './listIcons';
