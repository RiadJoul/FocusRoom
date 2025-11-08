import { TaskList } from '@/lib/stores/listStore';
import { formatDueDate, getFutureDates } from '@/lib/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AddTaskBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  lists: TaskList[];
  onAddTask: (title: string, priority: 'low' | 'medium' | 'high', listId: string, dueDate: string | null) => Promise<void>;
  onCreateList: (title: string, icon: string) => Promise<TaskList | null>;
}

// Common list icons
export const LIST_ICONS = [
  { name: 'briefcase-outline', label: 'Work' },
  { name: 'code-slash-outline', label: 'Coding' },
  { name: 'book-outline', label: 'Study' },
  { name: 'calculator-outline', label: 'Math' },
  { name: 'flask-outline', label: 'Science' },
  { name: 'leaf-outline', label: 'Biology' },
  { name: 'language-outline', label: 'Language' },
  { name: 'pencil-outline', label: 'Writing' },
  { name: 'document-text-outline', label: 'Assignment' },
  { name: 'school-outline', label: 'School' },
  { name: 'desktop-outline', label: 'Computer' },
  { name: 'clipboard-outline', label: 'Project' },
  { name: 'bulb-outline', label: 'Ideas' },
  { name: 'rocket-outline', label: 'Goals' },
  { name: 'star-outline', label: 'Important' },
  { name: 'list-outline', label: 'General' },
];

export function AddTaskBottomSheet({
  bottomSheetRef,
  lists,
  onAddTask,
  onCreateList
}: AddTaskBottomSheetProps) {
  const snapPoints = useMemo(() => ['75%', '90%'], []);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // List Creation State
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('list-outline');

  // Set default list when lists change
  React.useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    Keyboard.dismiss();
    // Reset form states
    setTaskTitle('');
    setSelectedPriority('medium');
    setIsCreatingList(false);
    setNewListTitle('');
    setSelectedDueDate(new Date());
    setShowDatePicker(false);
  }, [bottomSheetRef]);

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

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !selectedListId || !selectedDueDate) return;

    const dueDateStr = selectedDueDate.toISOString().split('T')[0];

    await onAddTask(taskTitle.trim(), selectedPriority, selectedListId, dueDateStr);
    handleCloseBottomSheet();
  };

  const handleSetToday = () => {
    setSelectedDueDate(new Date());
    setShowDatePicker(false);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDueDate(tomorrow);
    setShowDatePicker(false);
  };



  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;

    const newList = await onCreateList(newListTitle.trim(), selectedIcon);

    if (newList) {
      setSelectedListId(newList.id);
      setNewListTitle('');
      setSelectedIcon('list-outline');
      setIsCreatingList(false);
    }
  };

  const handleCancelCreateList = () => {
    setNewListTitle('');
    setSelectedIcon('list-outline');
    setIsCreatingList(false);
  };

  const futureDates = useMemo(() => getFutureDates(14), []);

  return (
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
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
        <Text className="text-white font-primary-bold text-2xl mb-6">Add New Task</Text>

        {/* No Lists Warning */}
        {lists.length === 0 && !isCreatingList && (
          <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
            <Text className="text-yellow-500 font-primary-semibold text-sm">
              ⚠️ Please create a list first to organize your tasks
            </Text>
          </View>
        )}

        {/* Task Title Input */}
        <View className="mb-4">
          <Text className="text-gray-400 font-primary-medium text-sm mb-2">Task Title</Text>
          <BottomSheetTextInput
            style={{
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
              borderWidth: 1,
              borderColor: '#1F2937',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFFFFF',
              fontSize: 16,
            }}
            placeholder="What do you need to do?"
            placeholderTextColor="#6B7280"
            value={taskTitle}
            onChangeText={setTaskTitle}
            editable={lists.length > 0 || isCreatingList}
          />
        </View>

        {/* Priority Selection */}
        <View className="mb-4">
          <Text className="text-gray-400 font-primary-medium text-sm mb-2">Priority</Text>
          <View className="flex-row gap-3">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <TouchableOpacity
                key={priority}
                onPress={() => setSelectedPriority(priority)}
                disabled={lists.length === 0 && !isCreatingList}
                className={`flex-1 py-3 rounded-xl border items-center ${selectedPriority === priority
                  ? priority === 'high'
                    ? 'bg-red-500/10 border-red-500'
                    : priority === 'medium'
                      ? 'bg-yellow-500/10 border-yellow-500'
                      : 'bg-green-500/10 border-green-500'
                  : 'bg-gray-900/50 border-gray-800'
                  }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-primary-semibold capitalize ${selectedPriority === priority
                    ? priority === 'high'
                      ? 'text-red-500'
                      : priority === 'medium'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    : 'text-gray-400'
                    }`}
                >
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date Selection */}
        <View className="mb-4">
          <Text className="text-gray-400 font-primary-medium text-sm mb-2">Due Date</Text>
          <View className="flex-row gap-2">
            {/* Today Button */}
            <TouchableOpacity
              onPress={handleSetToday}
              className={`flex-1 py-3 rounded-xl border items-center ${selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                ? 'bg-primary/10 border-primary'
                : 'bg-gray-900/50 border-gray-800'
                }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-primary-semibold text-sm ${selectedDueDate && formatDueDate(selectedDueDate) === 'Today'
                  ? 'text-primary'
                  : 'text-gray-400'
                  }`}
              >
                📅 Today
              </Text>
            </TouchableOpacity>

            {/* Tomorrow Button */}
            <TouchableOpacity
              onPress={handleSetTomorrow}
              className={`flex-1 py-3 rounded-xl border items-center ${selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                ? 'bg-primary/10 border-primary'
                : 'bg-gray-900/50 border-gray-800'
                }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-primary-semibold text-sm ${selectedDueDate && formatDueDate(selectedDueDate) === 'Tomorrow'
                  ? 'text-primary'
                  : 'text-gray-400'
                  }`}
              >
                🗓️ Tomorrow
              </Text>
            </TouchableOpacity>

            {/* Custom Date Button */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(!showDatePicker)}
              className={`flex-1 py-3 rounded-xl border items-center ${selectedDueDate && formatDueDate(selectedDueDate) !== 'Today' && formatDueDate(selectedDueDate) !== 'Tomorrow'
                ? 'bg-primary/10 border-primary'
                : 'bg-gray-900/50 border-gray-800'
                }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-primary-semibold text-sm ${selectedDueDate && formatDueDate(selectedDueDate) !== 'Today' && formatDueDate(selectedDueDate) !== 'Tomorrow'
                  ? 'text-primary'
                  : 'text-gray-400'
                  }`}
              >
                {selectedDueDate && formatDueDate(selectedDueDate) !== 'Today' && formatDueDate(selectedDueDate) !== 'Tomorrow'
                  ? formatDueDate(selectedDueDate)
                  : '📆 Other'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <View className="mt-3 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <Text className="text-white font-primary-semibold text-sm mb-3">Select Date</Text>
              <View className="flex-row flex-wrap gap-2">
                {futureDates.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedDueDate(date);
                      setShowDatePicker(false);
                    }}
                    className="bg-gray-800 px-3 py-2 rounded-lg border border-gray-700"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-300 font-primary-medium text-xs">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* List Selection */}
        <View className="mb-6">
          <Text className="text-gray-400 font-primary-medium text-sm mb-2">List</Text>

          {isCreatingList ? (
            // Create New List Form
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
              <BottomSheetTextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  marginBottom: 12,
                  paddingVertical: 4,
                }}
                placeholder="Enter list name..."
                placeholderTextColor="#6B7280"
                value={newListTitle}
                onChangeText={setNewListTitle}
                autoFocus
              />

              {/* Icon Selection */}
              <Text className="text-gray-400 font-primary-medium text-xs mb-2">Select Icon</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
                contentContainerStyle={{ gap: 8 }}
              >
                {LIST_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    onPress={() => setSelectedIcon(icon.name)}
                    className={`w-12 h-12 rounded-lg items-center justify-center border ${selectedIcon === icon.name
                        ? 'bg-primary/20 border-primary'
                        : 'bg-gray-800 border-gray-700'
                      }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={20}
                      color={selectedIcon === icon.name ? '#8F8F8F' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleCancelCreateList}
                  className="flex-1 py-2 rounded-lg bg-gray-800 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-400 font-primary-medium text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateList}
                  disabled={!newListTitle.trim()}
                  className={`flex-1 py-2 rounded-lg items-center ${newListTitle.trim() ? 'bg-primary' : 'bg-gray-800'
                    }`}
                  activeOpacity={0.7}
                >
                  <Text className={`font-primary-semibold text-sm ${newListTitle.trim() ? 'text-midnight-black' : 'text-gray-600'
                    }`}>
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // List Selection Chips
            <View className="flex-row items-center">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {lists.map((list) => (
                  <TouchableOpacity
                    key={list.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedListId(list.id);
                    }}
                    className={`mr-2 px-4 py-3 rounded-xl border flex-row items-center gap-2 ${selectedListId === list.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-gray-900/50 border-gray-800'
                      }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={list.icon as any}
                      size={16}
                      color={selectedListId === list.id ? '#E4F964' : '#6B7280'}
                    />
                    <Text
                      className={`font-primary-semibold text-sm ${selectedListId === list.id ? 'text-primary' : 'text-gray-400'
                        }`}
                    >
                      {list.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setIsCreatingList(true)}
                className="ml-4 px-4 py-2 rounded-lg border border-dashed border-primary/50 bg-primary/5"
                activeOpacity={0.7}
              >
                <Text className="text-primary font-primary-semibold">+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleCloseBottomSheet}
            className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-gray-400 font-primary-semibold text-base">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAddTask}
            disabled={!taskTitle.trim() || !selectedListId || !selectedDueDate}
            className={`flex-1 py-4 rounded-xl items-center ${taskTitle.trim() && selectedListId && selectedDueDate
              ? 'bg-primary'
              : 'bg-gray-800'
              }`}
            activeOpacity={0.8}
          >
            <Text className={`font-primary-bold text-base ${taskTitle.trim() && selectedListId && selectedDueDate ? 'text-midnight-black' : 'text-gray-600'
              }`}>
              Add Task
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
