import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COLOR_PRESETS = ['#FFFFFF','#FACC6B', '#34D399', '#60A5FA', '#F97373'];

interface ListCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, icon: string, color?: string) => Promise<void> | Promise<any> | void;
}

export function ListCreateModal({ visible, onClose, onCreate }: ListCreateModalProps) {
  const [title, setTitle] = useState('');

  // Icon and color states
  const [isIconPickerOpen, setIsIconPickerOpen] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string>('list-outline');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[2]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChosenIcon, setHasChosenIcon] = useState(false);

  // Animation for expanding the circle into a panel
  const pickerProgress = useSharedValue(0);
  const colorPickerProgress = useSharedValue(0);

  useEffect(() => {
    pickerProgress.value = withTiming(isIconPickerOpen ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isIconPickerOpen, pickerProgress]);

  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  useEffect(() => {
    colorPickerProgress.value = withTiming(isCustomPickerOpen ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCustomPickerOpen, colorPickerProgress]);

  const CARD_CLOSED_SIZE = 260;
  const CARD_OPEN_WIDTH = 360;
  const CARD_OPEN_HEIGHT = 580;

  const pickerCardStyle = useAnimatedStyle(() => {
    const t = pickerProgress.value;
    const width = CARD_CLOSED_SIZE + (CARD_OPEN_WIDTH - CARD_CLOSED_SIZE) * t;
    const height = CARD_CLOSED_SIZE + (CARD_OPEN_HEIGHT - CARD_CLOSED_SIZE) * t;
    const radius = (CARD_CLOSED_SIZE / 2) * (1 - t) + 24 * t;

    return {
      width,
      height,
      borderRadius: radius,
      padding: 16 * t,
    };
  });

  const plusIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - pickerProgress.value,
    transform: [
      {
        scale: 1 - 0.1 * pickerProgress.value,
      },
    ],
  }));

  const iconGridStyle = useAnimatedStyle(() => ({
    opacity: pickerProgress.value,
  }));

  // Shake animation when user taps Done without choosing an icon or title
  const shake = useSharedValue(0);
  const circleShakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
    ],
  }));

  const nameShake = useSharedValue(0);
  const nameShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nameShake.value }],
  }));



  const customPickerContainerStyle = useAnimatedStyle(() => {
    const t = colorPickerProgress.value;
    const minWidth = 40;
    const maxWidth = 360;
    return {
      width: minWidth + (maxWidth - minWidth) * t,
      paddingHorizontal: 6 + 6 * t,
    };
  });

  const handleClose = () => {
    setTitle('');
    setSelectedIcon('list-outline');
    setSelectedColor(COLOR_PRESETS[0]);
    setHasChosenIcon(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleCreate = async () => {
    if (isSubmitting) return;

    // Require the user to explicitly pick an icon at least once
    if (!hasChosenIcon) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Trigger a quick shake on the circle/card
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 80 }),
        withTiming(-4, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }

    // Icon is chosen but title is missing – shake the name input instead
    if (title.trim().length === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      nameShake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 80 }),
        withTiming(-4, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }
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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'black' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Text className="text-gray-400 font-primary-medium text-base">
              CANCEL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${!isSubmitting ? 'bg-white' : 'bg-white/50'
              }`}
            onPress={handleCreate}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text
              className={`font-primary-semibold text-base text-black`}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View className="flex-1 items-center justify-center px-6">
          {/* Animated icon picker: starts as a circle with +, expands into a panel */}
          {!isIconPickerOpen ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsIconPickerOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  {
                    borderRadius: 999,
                    backgroundColor: selectedColor,
                    shadowColor: selectedColor,
                    shadowOpacity: 0.4,
                    shadowRadius: 40,
                    shadowOffset: { width: 0, height: 20 },
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pickerCardStyle,
                  circleShakeStyle,
                ]}
              >
                <Animated.View style={plusIconStyle}>
                  <Ionicons
                    name={(hasChosenIcon ? selectedIcon : 'add') as any}
                    size={75}
                    color="#050608"
                  />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <Animated.View
              style={[
                {
                  borderRadius: 999,
                  backgroundColor: selectedColor,
                  shadowColor: selectedColor,
                  shadowOpacity: 0.4,
                  shadowRadius: 40,
                  shadowOffset: { width: 0, height: 20 },
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pickerCardStyle,
                circleShakeStyle,
              ]}
            >
              <Animated.View
                style={[
                  {
                    flex: 1,
                    width: '100%',
                  },
                  iconGridStyle,
                ]}
              >
                <View className="flex-row items-center justify-start mb-8">
                  <TouchableOpacity
                    className="flex flex-row items-center gap-1"
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsIconPickerOpen(false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-back" size={18} color={selectedColor === "#FFFFFF" ? "#000000" : "#FFFFFF"} />
                    <Text className={`${selectedColor === "#FFFFFF" ? "text-black" : "text-white"} font-primary-medium pb-0.5 text-lg`}>
                      Back
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap">
                    {LIST_ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon.name}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedIcon(icon.name);
                          setHasChosenIcon(true);
                          setIsIconPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                        style={{
                          width: '20%',
                          aspectRatio: 1,
                          padding: 6,
                        }}
                      >
                        <View
                          className={`flex-1 rounded-2xl items-center justify-center ${selectedIcon === icon.name
                            ? 'bg-black'
                            : 'bg-black/15'
                            }`}
                        >
                          <Ionicons
                            name={icon.name as any}
                            size={28}
                            color={
                              selectedIcon === icon.name ? selectedColor : '#111827'
                            }
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Animated.View>
            </Animated.View>
          )}

          {/* Title + color controls are hidden while icon panel is open */}
          {!isIconPickerOpen && (
            <>
              {/* Title input - Notion-style */}
              <Animated.View style={[{ width: '100%', marginTop: 32 }, nameShakeStyle]}>
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
              </Animated.View>

              {/* Color presets + custom color picker. When custom is open, the slider takes full width. */}
              <View className="w-full mt-8">
                {!isCustomPickerOpen ? (
                  <View className="flex-row items-center">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
                      style={{ flex: 1 }}
                    >
                      {COLOR_PRESETS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            setSelectedColor(color);
                          }}
                          activeOpacity={0.8}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            backgroundColor: color,
                            borderWidth: selectedColor === color ? 2 : 0,
                            borderColor:
                              selectedColor === color
                                ? '#E5E7EB'
                                : 'transparent',
                          }}
                        />
                      ))}
                    </ScrollView>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (selectedColor.toLowerCase() === '#ffffff') {
                          setSelectedColor(COLOR_PRESETS[1]);
                        }
                        setIsCustomPickerOpen(true);
                      }}
                      className="w-10 h-10 rounded-full items-center justify-center overflow-hidden"
                    >
                      {/* Multicolor indicator with current color dot */}
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 999,
                          
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            inset: 0,
                            flexDirection: 'row',
                          }}
                        >
                          <View style={{ flex: 1, backgroundColor: '#F97373' }} />
                          <View style={{ flex: 1, backgroundColor: '#FACC6B' }} />
                          <View style={{ flex: 1, backgroundColor: '#34D399' }} />
                          <View style={{ flex: 1, backgroundColor: '#60A5FA' }} />
                          <View style={{ flex: 1, backgroundColor: '#A855F7' }} />
                        </View>
                        
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Animated.View
                    style={[
                      {
                        borderRadius: 24,
                        backgroundColor: '#111827',
                        paddingHorizontal: 10,
                        paddingVertical: 14,
                      },
                      customPickerContainerStyle,
                    ]}
                  >
                    <View className="flex-row items-center">
                      <View style={{ flex: 1 }}>
                        <ColorPicker
                          value={selectedColor}
                          onComplete={({ hex }) => {
                            'worklet';
                            if (hex) {
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
                              marginTop: 0,
                              height: 18,
                              borderRadius: 999,
                            }}
                            thumbShape="circle"
                          />
                        </ColorPicker>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.selectionAsync();
                          setIsCustomPickerOpen(false);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="ml-3"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={28} color="#E5E7EB" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}
              </View>
            </>
          )}

          {/* Icon picker UI now lives inside the animated circle panel */}
	        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
