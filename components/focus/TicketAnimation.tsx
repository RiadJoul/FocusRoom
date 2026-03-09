import { useListStore } from '@/lib/stores/listStore';
import { Task } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, Text, View, Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { formatDuration, PlanetTrip } from './PlanetTrips';

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
  const cutStartProgress = useSharedValue(0);
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

  // Snapshot the current time and compute the expected arrival
  // based on the trip duration (in minutes).
  const now = new Date();
  // `trip.duration` is in seconds (see PlanetTrips.ts),
  // so convert to milliseconds when computing the arrival time.
  const arrival = new Date(now.getTime() + (trip.duration || 0) * 1000);

  useEffect(() => {
    if (visible) {
      // Ticket simply fades/scales in – no auto-cut tutorial animation.
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });

      cutProgress.value = 0;
      cutLineOpacity.value = 1;
      perforationOpacity.value = 1;
      scissorsX.value = 0;
      rightPieceOffsetX.value = 0;
      rightPieceOffsetY.value = 0;
      rightPieceRotate.value = 0;
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
    // Only the bottom / stub piece moves away like a sheet of paper falling.
    rightPieceOffsetX.value = withTiming(42, { duration: 600, easing: Easing.out(Easing.cubic) });
    rightPieceOffsetY.value = withTiming(48, { duration: 650, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(onAnimationComplete)();
      }
    });
    rightPieceRotate.value = withTiming(5, { duration: 600, easing: Easing.out(Easing.cubic) });
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Remember current cut so the user can continue a partial tear.
      cutStartProgress.value = cutProgress.value;
    })
    .onUpdate((event) => {
      const progress = Math.max(
        0,
        Math.min(1, cutStartProgress.value + event.translationX / 300)
      );
      cutProgress.value = progress;
      scissorsX.value = event.translationX;

      if (progress > 0.1 && progress < 0.9) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      // Require almost full swipe to truly "tear" the ticket.
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
      } else if (cutProgress.value > 0.5) {
        // The ticket stays partially torn – don't snap back.
        // Give a tiny easing so it feels natural.
        cutProgress.value = withTiming(cutProgress.value, { duration: 150 });
      } else {
        // Not far enough: snap back to intact ticket.
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

  // Top / main part stays anchored; no movement while cutting.
  const leftPartStyle = useAnimatedStyle(() => ({
    transform: [],
  }));

  const rightPartStyle = useAnimatedStyle(() => {
    const t = cutProgress.value;
    // Paper starts to sag from the cut edge as soon as you begin cutting.
    // We keep the hinge visually on the left (near the perforation) by
    // mostly dropping + rotating, without sliding to the right.
    const easedDrop = Math.max(0, Math.min(1, t)); // drop exactly in proportion to how much is cut

    return {
      transform: [
        { translateX: rightPieceOffsetX.value },
        // Vertical drop that grows with how much you've cut
        { translateY: easedDrop * 32 + rightPieceOffsetY.value },
        // Slight counter‑clockwise tilt so the left edge feels like it's falling first
        { rotate: `${-easedDrop * 7 + rightPieceRotate.value}deg` },
      ],
    };
  });



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

              {/* Top Part - Main Ticket Info */}
              <Animated.View style={leftPartStyle}>
                {/* Header bar */}
                <View className="bg-white rounded-t-2xl px-6 pt-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View>
                        <Text className="text-gray-500 font-primary-medium text-[10px] tracking-[2px]">
                          FOCUSROOM AIRWAYS
                        </Text>
                        <Text className="text-black font-primary-bold text-base">
                          BOARDING PASS
                        </Text>
                      </View>
                    </View>
                    {/* make this view glowing */}
                    {user?.is_premium ? (
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
                        <Text className="text-white font-primary-bold text-sm tracking-wider">
                          FIRST CLASS
                        </Text> 
                      </View> ) :(
                        <View className="bg-white/20 px-3 py-1.5 rounded-lg">
                        <Text className="text-white font-primary-bold text-sm tracking-wider">
                          ECONOMY
                        </Text>
                      </View>
                      )
                    }
                    
                  </View>
                </View>

                {/* Main Info Section */}
                <View className="px-6 pt-4 bg-white">
                  <View className="flex-row items-center justify-between mb-5">
                    <View>
                      <Text className="text-xs text-gray-500 mb-1">FROM</Text>
                      <Text className="text-3xl font-primary-bold text-black">{trip.from}</Text>
                      <Text className="text-xs text-gray-500">  
                        Departing at {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <View className="items-center">
                      <View className="flex-row items-center mb-1">
                        <View className="w-2 h-2 rounded-full bg-black mr-1.5" />
                        <View className="w-14 h-[1px] bg-gray-400" />
                        <View className="w-2 h-2 rounded-full bg-black ml-1.5" />
                      </View>
                      <Text className="text-xs text-gray-500">{formatDuration(trip.duration)} of deep focus</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-gray-500 mb-1">TO</Text>
                      <Text className="text-3xl font-primary-bold text-black">{trip.to}</Text>
                      <Text className="text-xs text-gray-500">
                        Landing at {arrival.getHours().toString().padStart(2, '0')}:{arrival.getMinutes().toString().padStart(2, '0')}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Perforated Cut Line */}
              <View className="relative" style={{ height: 0.5 }}>
                <Animated.View
                  style={[{
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    backgroundColor: 'transparent',
                    paddingVertical: 0,
                  }, perforationStyle]}
                >
                  {[...Array(25)].map((_, i) => (
                    <View key={i} style={{ width: 8, height: 1, backgroundColor: '#e5e7eb' }} />
                  ))}
                </Animated.View>

              </View>

              {/* Bottom Part - Stub */}
              <Animated.View style={rightPartStyle}>
                <View className="p-6 bg-white" style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
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
                    <Text className="text-gray-700 font-primary-medium text-xs tracking-wider mb-3">
                      MISSION OBJECTIVES ({tasks.length})
                    </Text>
                    {tasks.slice(0, 3).map((task, index) => (
                      <View key={task.id} className="flex-row items-start mb-2">
                        <View className='w-1.5 h-1.5 rounded-full bg-secondary mr-2 mt-2' />
                        <Text className="text-gray-900 font-primary-medium text-sm flex-1" numberOfLines={1}>
                          {task.title}
                        </Text>
                      </View>
                    ))}
                    {tasks.length > 3 && (
                      <Text className="text-gray-500 font-primary-medium text-xs mt-1">
                        +{tasks.length - 3} more objectives
                      </Text>
                    )}
                  </View>

                  {/* Barcode */}
                  <View className="">
                    <View className="flex-row bg-white">
                      <Image
                        source={require('../../assets/images/barcode.png')}
                        style={{ width: '100%', height: 60, resizeMode: 'contain' }}
                      />
                    </View>
                    <Text className="text-gray-800 font-primary-medium text-xs text-center mt-3 tracking-widest">
                      TKT-{trip.from.slice(0, 2)}{trip.to.slice(0, 2)}-{Date.now().toString().slice(-6)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>


          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
