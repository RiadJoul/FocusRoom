import { TaskList } from '@/lib/stores/listStore';
import { RecurrenceType, useTaskStore } from '@/lib/stores/taskStore';
import { getQuickActions, getTaskSuggestions } from '@/lib/utils/taskSuggestions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LIST_ICONS } from './AddTaskBottomSheet';

interface RecurringTaskModalProps {
  visible: boolean;
  lists: TaskList[];
  onClose: () => void;
  onCreateList: (title: string, icon: string) => Promise<TaskList | null>;
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

export function RecurringTaskModal({ visible, lists, onClose, onCreateList, onDeleteList}: RecurringTaskModalProps) {
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

  // Update suggestions when input or context changes
  useEffect(() => {
    const selectedList = lists.find(l => l.id === selectedListId);
    const context = {
      listName: selectedList?.title,
      priority: priority,
    };

    // Get quick actions for empty input
    if (title.length === 0) {
      setQuickActions(getQuickActions(context));
      setSuggestions([]);
      setShowSuggestions(false);
    } else if (title.length >= 2) {
      // Get suggestions for partial input
      const newSuggestions = getTaskSuggestions(title, context);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [title, selectedListId, priority, lists]);
  
  const handleSave = async () => {
    if (!title.trim() || !selectedListId) return;
    if (recurrenceType === 'weekly' && selectedDays.length === 0) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    await addRecurringTask(
      selectedListId,
      title,
      recurrenceType,
      recurrenceType === 'weekly' ? selectedDays : undefined,
      priority,
      new Date().toISOString(), // Start from today
      parseInt(interval) || 1,
      hasEndDate ? null : null // TODO: Add date picker for end date
    );
    
    // Reset form
    setTitle('');
    setPriority('medium');
    setRecurrenceType('weekly');
    setSelectedDays([1]);
    setInterval('1');
    setHasEndDate(false);
    
    onClose();
  };
  
  const toggleDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };
  
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };
  
  const getRecurrenceSummary = () => {
    if (recurrenceType === 'weekly' && selectedDays.length > 0) {
      const dayNames = selectedDays.map(d => WEEKDAYS[d].label);
      return `Every ${dayNames.join(', ')}`;
    }
    if (interval !== '1') {
      return `Every ${interval} ${recurrenceType === 'daily' ? 'days' : recurrenceType === 'weekly' ? 'weeks' : recurrenceType === 'monthly' ? 'months' : 'years'}`;
    }
    return `Every ${recurrenceType.replace('ly', '')}`;
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
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
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
            <View className="w-7" />
          </View>
          <Text className="font-primary-regular text-xs text-gray-500 text-center mt-1">
            {getRecurrenceSummary()}
          </Text>
        </View>
        
        <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
          {/* No Lists Warning */}
          {lists.length === 0 && !isCreatingList && (
            <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <Text className="text-yellow-500 font-primary-semibold text-sm">
                ⚠️ Please create a list first to organize your tasks
              </Text>
            </View>
          )}

          {/* Task Title */}
          <View className="mb-4">
            <Text className="text-gray-400 font-primary-medium text-sm mb-2">Task Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="E.g., Weekly assignment, Daily workout..."
              placeholderTextColor="#6B7280"
              className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 font-primary-regular text-base text-white"
              autoFocus
              editable={lists.length > 0 || isCreatingList}
            />

            {/* Quick Actions (shown when input is empty) */}
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
                      <Text className="text-primary font-primary-medium text-sm">{action}</Text>
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
          
          {/* List Selection */}
        <View className="mb-6">
          <Text className="text-gray-400 font-primary-medium text-sm mb-2">List</Text>

          {isCreatingList ? (
            // Create New List Form
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
              <TextInput
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
                  <Text className={`font-primary-semibold text-sm ${newListTitle.trim() ? 'text-background' : 'text-gray-600'
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
                    onLongPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      // Call delete with list title for confirmation
                      onDeleteList(list.id, list.title);
                      // Update selected list if we're deleting the current one
                      if (selectedListId === list.id) {
                        const remainingLists = lists.filter(l => l.id !== list.id);
                        if (remainingLists.length > 0) {
                          setSelectedListId(remainingLists[0].id);
                        } else {
                          setSelectedListId('');
                        }
                      }
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

          {/* Priority */}
          <View className="mb-4">
            <Text className="text-gray-400 font-primary-medium text-sm mb-2">Priority</Text>
            <View className="flex-row gap-3">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPriority(p);
                  }}
                  disabled={lists.length === 0 && !isCreatingList}
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
            <Text className="text-gray-400 font-primary-medium text-sm mb-2">Repeats</Text>
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
                      recurrenceType === option.type ? 'text-primary' : 'text-gray-400'
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
              <Text className="text-gray-400 font-primary-medium text-sm mb-2">Frequency</Text>
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
                  Every {interval} {recurrenceType === 'daily' && `day${interval !== '1' ? 's' : ''}`}
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
              <Text className="text-gray-400 font-primary-medium text-sm mb-2">On Days</Text>
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
                    <Text className={`font-primary-bold text-sm ${
                      selectedDays.includes(day.value) 
                        ? 'text-primary' 
                        : 'text-gray-600'
                    }`}>
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
          
          {/* Summary */}
          <View className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="repeat" size={16} color="#6B7280" />
              <Text className="font-primary-medium text-sm text-gray-400 ml-2">
                {getRecurrenceSummary()}
              </Text>
            </View>
            <Text className="font-primary-regular text-xs text-gray-500 leading-5">
              Creates new task instances automatically. Each can be completed independently.
            </Text>
          </View>
          
          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 rounded-xl bg-gray-900/50 border border-gray-800"
              activeOpacity={0.7}
            >
              <Text className="font-primary-semibold text-base text-gray-400 text-center">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!title.trim() || !selectedListId || (recurrenceType === 'weekly' && selectedDays.length === 0)}
              className={`flex-1 py-4 rounded-xl ${
                title.trim() && selectedListId && !(recurrenceType === 'weekly' && selectedDays.length === 0)
                  ? 'bg-primary'
                  : 'bg-gray-800'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`font-primary-semibold text-base text-center ${
                title.trim() && selectedListId && !(recurrenceType === 'weekly' && selectedDays.length === 0)
                  ? 'text-black'
                  : 'text-gray-600'
              }`}>
                Create Task
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
