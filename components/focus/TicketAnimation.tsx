import { Task } from '@/lib/stores/taskStore';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { PlanetTrip } from './PlanetTrips';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useListStore } from '@/lib/stores/listStore';
import { useUserStore } from '@/lib/stores/userStore';

interface TicketAnimationProps {
  visible: boolean;
  trip: PlanetTrip;
  tasks: Task[];
  onAnimationComplete: () => void;
}

export function TicketAnimation({ visible, trip, tasks, onAnimationComplete }: TicketAnimationProps) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const cutProgress = useSharedValue(0);
  const scissorsX = useSharedValue(0);
  const leftPieceOffsetX = useSharedValue(0);
  const leftPieceOffsetY = useSharedValue(0);
  const leftPieceRotate = useSharedValue(0);
  const rightPieceOffsetX = useSharedValue(0);
  const rightPieceOffsetY = useSharedValue(0);
  const rightPieceRotate = useSharedValue(0);
  const cutLineOpacity = useSharedValue(1);
  const perforationOpacity = useSharedValue(1);

  //list of the task
  const lists = useListStore((state) => state.lists);
  const getTaskList = (taskListId: string) => {
    return lists.find((list) => list.id === taskListId);
  }

  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (visible) {
      // Ticket appears
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });

      // Hint animation: scissors glide and partial cut, then reset
      cutProgress.value = 0;
      cutLineOpacity.value = 1;
      perforationOpacity.value = 1;
      scissorsX.value = 0;
      const hintCut = 0.7;
      const hintDistance = 220;

      cutProgress.value = withSequence(
        withTiming(hintCut, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) })
      );

      scissorsX.value = withSequence(
        withTiming(hintDistance, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) })
      );
    } else {
      // Reset values
      scale.value = 0.3;
      opacity.value = 0;
      cutProgress.value = 0;
      scissorsX.value = 0;
      leftPieceOffsetX.value = 0;
      leftPieceOffsetY.value = 0;
      leftPieceRotate.value = 0;
      rightPieceOffsetX.value = 0;
      rightPieceOffsetY.value = 0;
      rightPieceRotate.value = 0;
      cutLineOpacity.value = 1;
      perforationOpacity.value = 1;
    }
  }, [visible]);

  const handleCutComplete = () => {
    // Ticket halves drift apart and fall with a subtle rotation
    cutLineOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
    perforationOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
    leftPieceOffsetX.value = withTiming(-40, { duration: 600, easing: Easing.out(Easing.cubic) });
    leftPieceOffsetY.value = withTiming(40, { duration: 600, easing: Easing.out(Easing.quad) });
    leftPieceRotate.value = withTiming(-6, { duration: 600, easing: Easing.out(Easing.cubic) });

    rightPieceOffsetX.value = withTiming(40, { duration: 600, easing: Easing.out(Easing.cubic) });
    rightPieceOffsetY.value = withTiming(70, { duration: 650, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(onAnimationComplete)();
      }
    });
    rightPieceRotate.value = withTiming(6, { duration: 600, easing: Easing.out(Easing.cubic) });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const progress = Math.max(0, Math.min(1, event.translationX / 300));
      cutProgress.value = progress;
      scissorsX.value = event.translationX;
      
      if (progress > 0.1 && progress < 0.9) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      // Require almost full swipe to truly "tear" the ticket
      if (cutProgress.value > 0.95) {
        // Cut completed!
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);

        // Keep the cut line where the user stopped, just
        // give the scissors a small forward motion to "finish" the cut
        const targetX = Math.min(scissorsX.value + 40, 300);
        scissorsX.value = withTiming(targetX, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) {
            runOnJS(handleCutComplete)();
          }
        });
      } else {
        // Snap back
        cutProgress.value = withTiming(0, { duration: 300 });
        scissorsX.value = withTiming(0, { duration: 300 });
      }
    });

  const ticketStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value }
    ],
  }));

  const cutLineStyle = useAnimatedStyle(() => ({
    width: `${cutProgress.value * 100}%`,
    opacity: cutLineOpacity.value,
  }));

  const perforationStyle = useAnimatedStyle(() => ({
    opacity: perforationOpacity.value,
  }));

  const leftPartStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          -cutProgress.value * 4 - // tiny bend for most of the swipe
          Math.max(0, (cutProgress.value - 0.7) / 0.3) * 36 + // real tear near the end
          leftPieceOffsetX.value,
      },
      { translateY: leftPieceOffsetY.value },
      {
        rotate: `${
          -cutProgress.value * 1.5 - // gentle tilt
          Math.max(0, (cutProgress.value - 0.7) / 0.3) * 4 + // stronger tilt near full tear
          leftPieceRotate.value
        }deg`,
      },
    ],
  }));

  const rightPartStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          cutProgress.value * 4 + // tiny bend for most of the swipe
          Math.max(0, (cutProgress.value - 0.7) / 0.3) * 36 + // real tear near the end
          rightPieceOffsetX.value,
      },
      { translateY: rightPieceOffsetY.value },
      {
        rotate: `${
          cutProgress.value * 1.5 + // gentle tilt
          Math.max(0, (cutProgress.value - 0.7) / 0.3) * 4 + // stronger tilt near full tear
          rightPieceRotate.value
        }deg`,
      },
    ],
  }));

  const scissorsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scissorsX.value }],
    opacity: cutProgress.value > 0 ? 1 : 0.3,
  }));

  if (!visible) return null;


  return (
    <Modal transparent visible={visible} animationType="none">
      <View className="flex-1 bg-black/95 items-center justify-center px-6">
        {/* Instruction Text */}
        <Animated.View style={{ opacity: 1 }} className="mb-4">
          <Text className="text-white font-primary-semibold text-lg text-center mb-2">
            ✂️ Swipe to cut your ticket
          </Text>
          <Text className="text-gray-400 font-primary-medium text-sm text-center">
            Swipe right across the dotted line
          </Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={ticketStyle} className="w-full max-w-md mx-auto">
          {/* Ticket Container with Shadow */}
          <View 
            style={{
              backgroundColor: 'transparent',
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
              elevation: 20,
            }}
          >
            {/* Decorative Notches */}
            <View style={{ position: 'absolute', left: -8, top: '50%', marginTop: -8, width: 16, height: 16, backgroundColor: '#000', borderRadius: 8, zIndex: 10 }} />
            <View style={{ position: 'absolute', right: -8, top: '50%', marginTop: -8, width: 16, height: 16, backgroundColor: '#000', borderRadius: 8, zIndex: 10 }} />
            
            {/* Top Part - Main Ticket Info */}
            <Animated.View style={leftPartStyle}>
              {/* Header Gradient Bar */}
              <View className={`${user?.is_premium ? 'bg-purple-800' : 'bg-black'} rounded-t-2xl px-6 py-4`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View>
                      <Text className="text-white/70 font-primary-medium text-xs tracking-widest">FOCUSROOM AIRWAYS</Text>
                      <Text className="text-white font-primary-bold text-lg">BOARDING PASS</Text>
                    </View>
                  </View>
                  {/* make this view glowing */}
                  {user?.is_premium && (
                    <View style={{
                      backgroundColor: '#A78BFA',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      shadowColor: '#A78BFA',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.7, 
                      shadowRadius: 10,
                      elevation: 10,
                    }}>
                      <Text className="text-white font-primary-bold text-sm tracking-wider">FIRST CLASS</Text>
                    </View>
                  )}
                  {!user?.is_premium && (
                  <View className="bg-white/20 px-3 py-1.5 rounded-lg">
                    <Text className="text-white font-primary-bold text-sm tracking-wider">ECONOMY</Text>
                  </View>
                  )}
                </View>
              </View>

              {/* Main Info Section */}
              <View className="p-6 bg-white">
                {/* Route */}
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-1">
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1.5">FROM</Text>
                    <Text className="text-gray-900 font-primary-bold text-3xl tracking-tight">{trip.from}</Text>
                  </View>
                  
                  <View className="px-4">
                    <MaterialCommunityIcons name="rocket-launch-outline" size={54} color="black" />
                  </View>
                  
                  <View className="flex-1 items-end">
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1.5">TO</Text>
                    <Text className="text-gray-900 font-primary-bold text-3xl tracking-tight">{trip.to}</Text>
                  </View>
                </View>

                {/* Flight Details Grid */}
                <View className="flex-row border-t border-gray-200 pt-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1.5">TRIP</Text>
                    <Text className="text-gray-900 font-primary-bold text-base">{trip.description}</Text>
                  </View>
                  <View className="flex-1 pl-3 border-l border-gray-200">
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1.5">DURATION</Text>
                    <Text className="text-gray-900 font-primary-bold text-base">
                      {Math.floor(trip.duration / 60)} min
                    </Text>
                  </View>
                  <View className="flex-1 pl-3 border-l border-gray-200">
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1.5">GATE</Text>
                    <Text className="text-gray-900 font-primary-bold text-base">A{Math.floor(Math.random() * 20) + 1}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Perforated Cut Line */}
            <View className="relative" style={{ height: 1 }}>
              <Animated.View
                style={[{
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                  backgroundColor: 'transparent',
                  paddingVertical: 0,
                }, perforationStyle]}
              >
                {[...Array(25)].map((_, i) => (
                  <View key={i} style={{ width: 8, height: 1, backgroundColor: '#D1D5DB' }} />
                ))}
              </Animated.View>
              <Animated.View
                style={[cutLineStyle, { 
                  backgroundColor: '#000000', 
                  height: 3,
                  position: 'absolute',
                  left: 0,
                  top: -1,
                }]}
              />
            </View>

            {/* Bottom Part - Stub */}
            <Animated.View style={rightPartStyle}>
              <View className="p-6 bg-gray-50" style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
                {/* <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-1">PASSENGER</Text>
                    <Text className="text-gray-900 font-primary-bold text-base">Space Traveler</Text>
                  </View>
                  <View className="bg-white px-4 py-2 rounded-lg" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                    <Text className="text-gray-900 font-primary-bold text-xs tracking-widest">SEAT 12A</Text>
                  </View>
                </View> */}

                <View className="">
                  <Text className="text-gray-400 font-primary-medium text-xs tracking-wider mb-3">MISSION OBJECTIVES ({tasks.length})</Text>
                  {tasks.slice(0, 3).map((task, index) => (
                    <View key={task.id} className="flex-row items-start mb-2">
                      <View style={{ 
                        width: 6, 
                        height: 6, 
                        borderRadius: 3, 
                        backgroundColor: '#6366F1',
                        marginTop: 5,
                        marginRight: 8 
                      }} />
                      <Text className="text-gray-700 font-primary-medium text-sm flex-1" numberOfLines={1}>
                        {task.title} 
                      </Text>
                    </View>
                  ))}
                  {tasks.length > 3 && (
                    <Text className="text-gray-400 font-primary-medium text-xs mt-1">
                      +{tasks.length - 3} more objectives
                    </Text>
                  )}
                </View>

                {/* Barcode */}
                <View className="mt-4 pt-4 border-t border-gray-200">
                  <View className="flex-row" style={{ height: 40 }}>
                    {[...Array(30)].map((_, i) => (
                      <View 
                        key={i} 
                        style={{ 
                          flex: 1, 
                          backgroundColor: i % 3 === 0 ? '#1F2937' : '#9CA3AF',
                          marginHorizontal: 1 
                        }} 
                      />
                    ))}
                  </View>
                  <Text className="text-gray-400 font-primary-medium text-xs text-center mt-2 tracking-widest">
                    TKT-{trip.from.slice(0, 2)}{trip.to.slice(0, 2)}-{Date.now().toString().slice(-6)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Enhanced Scissors Icon */}
          <Animated.View
            style={[
              scissorsStyle,
              {
                position: 'absolute',
                left: -20,
                top: '50%',
                marginTop: -16,
              }
            ]}
          >
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 8,
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}>
              <Text className="text-4xl">
                <AntDesign name="scissor" size={24} color="black" />
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
