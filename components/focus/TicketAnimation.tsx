import { useListStore } from '@/lib/stores/listStore';
import { Task } from '@/lib/stores/taskStore';
import { useUserStore } from '@/lib/stores/userStore';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatDuration, PlanetTrip } from './PlanetTrips';

// ---------------------------------------------------------------------------
// Barcode generator — produces a deterministic bar pattern from a seed string.
// Bars alternate black/white with widths 1–3 units, flanked by quiet zones
// and guard bars, giving a convincing Code-128-style appearance.
// ---------------------------------------------------------------------------
function generateBars(seed: string): Array<{ width: number; dark: boolean }> {
  const out: Array<{ width: number; dark: boolean }> = [];
  const push = (width: number, dark: boolean) => out.push({ width, dark });

  // Quiet zone
  push(6, false);
  // Start guard: ▌ ▌ ▌ (three narrow bars)
  push(1, true); push(1, false); push(1, true); push(3, false);

  // Data bars — 4 bars per character with widths driven by the char code
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    push((c % 3) + 1,         true);   // bar  1-3
    push(((c >> 2) % 2) + 1,  false);  // space 1-2
    push(((c >> 3) % 3) + 1,  true);   // bar  1-3
    push(((c >> 5) % 2) + 1,  false);  // space 1-2
  }

  // Stop guard: ▌▌ ▌ ▌▌ ▌ ▌
  push(2, true); push(1, false); push(2, true); push(1, false); push(1, true);
  // Quiet zone
  push(6, false);

  return out;
}

// ---------------------------------------------------------------------------
// Barcode component
// ---------------------------------------------------------------------------
function Barcode({ seed }: { seed: string }) {
  const bars = generateBars(seed);
  return (
    <View style={{ flexDirection: 'row', height: 52, alignItems: 'stretch' }}>
      {bars.map((bar, i) => (
        <View
          key={i}
          style={{ flex: bar.width, backgroundColor: bar.dark ? '#1a1a1a' : '#ffffff' }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface TicketAnimationProps {
  visible: boolean;
  trip: PlanetTrip;
  tasks: Task[];
  onAnimationComplete: () => void;
}

export function TicketAnimation({ visible, trip, tasks, onAnimationComplete }: TicketAnimationProps) {
  // Ticket enter animation
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  // Cut mechanics
  const cutProgress = useSharedValue(0);
  const cutStartProgress = useSharedValue(0);
  const lastHapticProgress = useSharedValue(0); // used to throttle haptics

  // Progressive cut-line overlay (fills behind the scissors)
  const perfWidth = useSharedValue(0); // measured width of the perforation row

  // Top-piece: stays still during cut, then bounces free when cut completes
  const topOffsetY = useSharedValue(0);
  const topScale = useSharedValue(1);

  // Bottom stub: sags as cut progresses, then falls away after completion
  const stubOffsetX = useSharedValue(0);
  const stubOffsetY = useSharedValue(0);
  const stubRotate = useSharedValue(0);
  const stubOpacity = useSharedValue(1);
  const stubWidth = useSharedValue(0); // measured on layout — needed for right-edge hinge

  // Perforation & scissors visibility
  const perforationOpacity = useSharedValue(1);
  const scissorsOpacity = useSharedValue(1);

  const lists = useListStore((state) => state.lists);
  const user = useUserStore((state) => state.user);

  const now = new Date();
  const arrival = new Date(now.getTime() + (trip.duration || 0) * 1000);
  const ticketId = `TKT-${trip.from.slice(0, 2)}${trip.to.slice(0, 2)}-${Date.now().toString().slice(-6)}`;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });

      // Reset cut state
      cutProgress.value = 0;
      lastHapticProgress.value = 0;
      stubOffsetX.value = 0;
      stubOffsetY.value = 0;
      stubRotate.value = 0;
      stubOpacity.value = 1;
      topOffsetY.value = 0;
      topScale.value = 1;
      perforationOpacity.value = 1;
      scissorsOpacity.value = 1;
    } else {
      scale.value = 0.3;
      opacity.value = 0;
      cutProgress.value = 0;
    }
  }, [visible]);

  // Called (on JS thread) once the scissors has fully finished the cut.
  const handleCutComplete = () => {
    // Hide the perforation line and scissors icon
    perforationOpacity.value = withTiming(0, { duration: 180 });
    scissorsOpacity.value = withTiming(0, { duration: 120 });

    // Top piece: micro-bounce upward (paper freed from the stub)
    topOffsetY.value = withSequence(
      withTiming(-6, { duration: 90 }),
      withSpring(0, { damping: 5, stiffness: 260 }),
    );
    topScale.value = withSequence(
      withTiming(1.015, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 260 }),
    );

    // Bottom stub: gravity fall — continues counter-clockwise (left was already down),
    // drifts slightly left, accelerates down.
    stubRotate.value = withTiming(20, { duration: 560, easing: Easing.in(Easing.cubic) });
    stubOffsetX.value = withTiming(-20, { duration: 560, easing: Easing.in(Easing.quad) });
    stubOpacity.value = withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) });
    stubOffsetY.value = withTiming(
      380,
      { duration: 580, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onAnimationComplete)();
      },
    );
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      cutStartProgress.value = cutProgress.value;
    })
    .onUpdate((event) => {
      const progress = Math.max(
        0,
        Math.min(1, cutStartProgress.value + event.translationX / 290),
      );
      cutProgress.value = progress;

      // Haptics throttled to every ~8% of progress (≈12 pulses across the full swipe)
      const bucket = Math.floor(progress / 0.08);
      if (bucket > Math.floor(lastHapticProgress.value / 0.08)) {
        lastHapticProgress.value = progress;
        runOnJS(Haptics.selectionAsync)();
      }
    })
    .onEnd(() => {
      if (cutProgress.value > 0.85) {
        // Snap to full cut with a brisk finishing motion
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        cutProgress.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(handleCutComplete)();
        });
      } else if (cutProgress.value > 0.35) {
        // Leave it partially torn — feels natural, user can re-swipe
      } else {
        // Snap back
        cutProgress.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      }
    });

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------
  const ticketStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const perforationStyle = useAnimatedStyle(() => ({
    opacity: perforationOpacity.value,
  }));

  // Scissors travels along the perforation row
  const scissorsStyle = useAnimatedStyle(() => {
    const x = Math.max(0, cutProgress.value * perfWidth.value - 14);
    return {
      opacity: scissorsOpacity.value,
      transform: [{ translateX: x }],
    };
  });

  // Filled cut-line that grows behind the scissors (left → right)
  const cutLineStyle = useAnimatedStyle(() => ({
    width: cutProgress.value * perfWidth.value,
    opacity: perforationOpacity.value,
  }));

  // Top piece — stays in place during cutting, bounces when freed
  const topPartStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: topOffsetY.value },
      { scale: topScale.value },
    ],
  }));

  // Bottom stub — sags as cut progresses, falls after completion.
  // The hinge is on the RIGHT edge (the right side is still "attached" while you
  // cut left → right). We simulate transform-origin: right-center using the
  // standard three-step trick:  translate(+halfW) → rotate → translate(-halfW).
  // Negative angle = counter-clockwise = left edge drops, right edge stays put.
  const stubStyle = useAnimatedStyle(() => {
    const halfW = stubWidth.value > 0 ? stubWidth.value / 2 : 160;
    const angle = cutProgress.value * 10 + stubRotate.value;
    return {
      opacity: stubOpacity.value,
      transform: [
        { translateX: halfW },
        { rotate: `-${angle}deg` },
        { translateX: -halfW },
        // Free-fall translations applied after the hinge (world-space offsets)
        { translateX: stubOffsetX.value },
        { translateY: stubOffsetY.value },
      ],
    };
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View className="flex-1 bg-black/95 items-center justify-center px-6">

        {/* Instruction */}
        <Animated.View className="mb-4 items-center">
          <Text className="text-white font-primary-semibold text-lg text-center mb-1">
            ✂️ Swipe to cut your ticket
          </Text>
          <Text className="text-gray-400 font-primary-medium text-sm text-center">
            Swipe right across the dotted line
          </Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={ticketStyle} className="w-full max-w-md mx-auto">
            {/* Shadow wrapper */}
            <View
              style={{
                backgroundColor: 'transparent',
                borderRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.3,
                shadowRadius: 30,
                elevation: 20,
              }}
            >
              {/* ── TOP PIECE ─────────────────────────────────────────── */}
              <Animated.View style={topPartStyle}>
                {/* Header */}
                <View className="bg-white rounded-t-3xl px-6 pt-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <View>
                      <Text className="text-gray-500 font-primary-medium text-[10px] tracking-[2px]">
                        FOCUSROOM AIRWAYS
                      </Text>
                      <Text className="text-black font-primary-bold text-base">
                        BOARDING PASS
                      </Text>
                    </View>
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
                      </View>
                    ) : (
                      <View className="bg-black px-3 py-1.5 rounded-lg">
                        <Text className="text-white font-primary-bold text-sm tracking-wider">
                          ECONOMY
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Route info */}
                <View className="px-6 pt-3 pb-5 bg-white">
                  <View className="flex-row items-center justify-between">
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

              {/* ── PERFORATION LINE ──────────────────────────────────── */}
              <View
                style={{ height: 1, justifyContent: 'center', overflow: 'hidden' }}
                onLayout={(e) => { perfWidth.value = e.nativeEvent.layout.width; }}
              >
                {/* Dashed perforations (full row, fades out when cut completes) */}
                <Animated.View
                  style={[perforationStyle, { flexDirection: 'row', justifyContent: 'space-evenly' }]}
                >
                  {[...Array(28)].map((_, i) => (
                    <View key={i} style={{ width: 7, height: 1.5, backgroundColor: '#d1d5db', borderRadius: 1 }} />
                  ))}
                </Animated.View>

                {/* Solid cut line that fills in from the left behind the scissors */}
                <Animated.View
                  style={[
                    cutLineStyle,
                    { position: 'absolute', left: 0, height: 1.5, backgroundColor: '#6b7280', borderRadius: 1 },
                  ]}
                />

              
              </View>

              {/* ── BOTTOM STUB ───────────────────────────────────────── */}
              <Animated.View style={stubStyle}>
                <View
                  className="bg-white px-6 pt-4 pb-5"
                  style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
                  onLayout={(e) => { stubWidth.value = e.nativeEvent.layout.width; }}
                >
                  {/* Mission objectives */}
                  <Text className="text-gray-500 font-primary-medium text-[10px] tracking-[1.5px] uppercase mb-3">
                    Mission Objectives ({tasks.length})
                  </Text>
                  {tasks.slice(0, 3).map((task) => (
                    <View key={task.id} className="flex-row items-start mb-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-secondary mr-2 mt-1.5" />
                      <Text className="text-gray-800 font-primary-medium text-sm flex-1" numberOfLines={1}>
                        {task.title}
                      </Text>
                    </View>
                  ))}
                  {tasks.length > 3 && (
                    <Text className="text-gray-400 font-primary-medium text-xs mt-1">
                      +{tasks.length - 3} more objectives
                    </Text>
                  )}

                  {/* Generated barcode */}
                  <View className="mt-4">
                    <Barcode seed={ticketId} />
                    <Text className="text-gray-500 font-primary-medium text-[10px] text-center mt-2 tracking-[2px]">
                      {ticketId}
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
