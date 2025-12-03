import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LIST_ICONS } from './listIcons';
import ColorPicker, { HueSlider } from 'reanimated-color-picker';
import { runOnJS } from 'react-native-reanimated';

const COLOR_PRESETS = ['#A855F7', '#FACC6B', '#34D399', '#60A5FA', '#F97373', '#3B82F6', '#EF4444'];

interface ListCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, icon: string, color?: string) => Promise<void> | Promise<any> | void;
}

export function ListCreateModal({ visible, onClose, onCreate }: ListCreateModalProps) {
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('list-outline');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setTitle('');
    setSelectedIcon('list-outline');
    setSelectedColor(COLOR_PRESETS[0]);
    setIsSubmitting(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onCreate(title.trim(), selectedIcon, selectedColor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-[#050608]">
        {/* Header */}
        <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Text className="text-gray-400 font-primary-medium text-base">
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!title.trim() || isSubmitting}
            activeOpacity={0.7}
          >
            <Text
              className={`font-primary-semibold text-base ${
                title.trim() && !isSubmitting ? 'text-primary' : 'text-gray-600'
              }`}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View className="flex-1 items-center justify-center px-6">
          {/* Big circle preview */}
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 999,
              backgroundColor: selectedColor,
              shadowColor: selectedColor,
              shadowOpacity: 0.4,
              shadowRadius: 40,
              shadowOffset: { width: 0, height: 20 },
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={selectedIcon as any}
              size={72}
              color="#050608"
            />
          </View>

          {/* Title input - Notion-style */}
          <View className="w-full mt-8">
            <Text className="text-gray-500 font-primary-medium text-xs mb-1">
              List name
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Type a list name…"
              placeholderTextColor="#4B5563"
              style={{
                backgroundColor: 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: '#1F2937',
                paddingHorizontal: 0,
                paddingVertical: 10,
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '600',
              }}
              
            />
          </View>

          {/* Color presets + custom picker */}
          <View className="w-full mt-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
            >
              {COLOR_PRESETS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedColor(color);
                  }}
                  activeOpacity={0.8}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    backgroundColor: color,
                    borderWidth: selectedColor === color ? 2 : 0,
                    borderColor: selectedColor === color ? '#E5E7EB' : 'transparent',
                  }}
                />
              ))}
            </ScrollView>

            <View className="mt-4">
              <ColorPicker
                value={selectedColor}
                onComplete={({ hex }) => {
                  'worklet';
                  if (hex) {
                    // Update React state from the worklet safely.
                    runOnJS(setSelectedColor)(hex);
                  }
                }}
                onChange={({ hex }) => {
                  'worklet';
                  if (hex) {
                    runOnJS(setSelectedColor)(hex);
                  }
                }}
                style={{ width: '100%' }}
              >
                <HueSlider
                  style={{
                    marginTop: 12,
                    height: 18,
                    borderRadius: 999,
                  }}
                  thumbShape="circle"
                />
              </ColorPicker>
            </View>
          </View>

          {/* Icon picker */}
          <View className="w-full mt-6 flex-1">
            <>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-gray-200 font-primary-semibold text-sm">
                    Choose icon
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap">
                    {LIST_ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon.name}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedIcon(icon.name);
                        }}
                        activeOpacity={0.7}
                        style={{
                          width: '20%',
                          aspectRatio: 1,
                          padding: 6,
                        }}
                      >
                        <View
                          className={`flex-1 rounded-2xl items-center justify-center ${
                            selectedIcon === icon.name
                              ? 'bg-primary'
                              : 'bg-white/10'
                          }`}
                        >
                          <Ionicons
                            name={icon.name as any}
                            size={22}
                            color="#ffffff"
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
          </View>
        </View>
      </View>
    </Modal>
  );
}
