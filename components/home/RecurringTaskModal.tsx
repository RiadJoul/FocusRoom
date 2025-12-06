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
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default: Monday
  const [interval, setInterval] = useState('1');
  const [hasEndDate, setHasEndDate] = useState(false);

  // AI Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showListCreator, setShowListCreator] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    if (!title.trim() || !selectedListId) return;
    if (recurrenceType === 'weekly' && selectedDays.length === 0) return;

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

  const getRecurrenceSummary = () => {
    if (recurrenceType === 'weekly' && selectedDays.length > 0) {
      const dayNames = selectedDays.map((d) => WEEKDAYS[d].label);
      return `Every ${dayNames.join(', ')}`;
    }
    if (interval !== '1') {
      return `Every ${interval} ${
        recurrenceType === 'daily'
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

                {/* Quick Actions */}
                {title.length === 0 && quickActions.length > 0 && (
                  <View className="mt-2">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {quickActions.map((action, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setTitle(action + ' ');
                          }}
                          className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30"
                          activeOpacity={0.7}
                        >
                          <Text className="text-primary font-primary-medium text-sm">
                            {action}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Smart Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <View className="mt-2 bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
                    {suggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setTitle(suggestion);
                          setShowSuggestions(false);
                        }}
                        className={`px-4 py-3 flex-row items-center ${
                          index < suggestions.length - 1 ? 'border-b border-gray-800' : ''
                        }`}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="bulb-outline" size={16} color="#9CA3AF" />
                        <Text className="text-gray-300 font-primary-regular text-sm ml-2 flex-1">
                          {suggestion}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
                   
                    className={`px-4 py-3 rounded-full flex-row items-center gap-2 border ${
                      canCreateMoreLists
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
                      className={`flex-1 py-3 rounded-xl border items-center ${
                        priority === p
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
                        className={`font-primary-semibold capitalize ${
                          priority === p
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
                      className={`px-4 py-3 rounded-xl border ${
                        recurrenceType === option.type
                          ? 'bg-primary/10 border-primary'
                          : 'bg-gray-900/50 border-gray-800'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`font-primary-semibold text-sm ${
                          recurrenceType === option.type
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
                        className={`flex-1 py-3 rounded-xl border items-center ${
                          selectedDays.includes(day.value)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-gray-900/50 border-gray-800'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`font-primary-bold text-sm ${
                            selectedDays.includes(day.value)
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
              <>
                <TouchableOpacity
                  onPress={goToNextStep}
                  disabled={!title.trim() || !selectedListId}
                  className={`flex-1 py-4 rounded-xl ${
                    title.trim() && selectedListId ? 'bg-secondary' : 'bg-gray-800'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-primary-semibold text-base text-center ${
                      title.trim() && selectedListId ? 'text-black' : 'text-gray-600'
                    }`}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </>
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
                  className={`flex-1 py-4 rounded-xl ${
                    recurrenceType === 'weekly' && selectedDays.length === 0
                      ? 'bg-gray-800'
                      : 'bg-secondary'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-primary-semibold text-base text-center ${
                      recurrenceType === 'weekly' && selectedDays.length === 0
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
                    !title.trim() ||
                    !selectedListId ||
                    (recurrenceType === 'weekly' && selectedDays.length === 0)
                  }
                  className={`flex-1 py-4 rounded-xl ${
                    title.trim() &&
                    selectedListId &&
                    !(recurrenceType === 'weekly' && selectedDays.length === 0)
                      ? 'bg-secondary'
                      : 'bg-gray-800'
                  }`}
                  activeOpacity={0.7}
                >
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
                </TouchableOpacity>
              </>
            )}
          </View>
        </BottomSheetScrollView>
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
