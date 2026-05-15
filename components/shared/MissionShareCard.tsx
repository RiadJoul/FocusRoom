import React from 'react';
import { Image, Text, View } from 'react-native';
import { PlanetTrip } from '@/components/focus/PlanetTrips';
import { Task } from '@/lib/stores/taskStore';

// Fixed star positions — deterministic so the card looks identical every time
const STARS = Array.from({ length: 38 }, (_, i) => ({
  left: `${(i * 19 + 13) % 93}%` as `${number}%`,
  top:  `${(i * 31 + 7)  % 88}%` as `${number}%`,
  size: i % 9 === 0 ? 3 : i % 5 === 0 ? 2.5 : 1.5,
  opacity: 0.18 + (i % 6) * 0.09,
}));

// Simple deterministic barcode (reused from TicketAnimation pattern)
function generateBars(seed: string) {
  const out: Array<{ width: number; dark: boolean }> = [];
  const push = (w: number, d: boolean) => out.push({ width: w, dark: d });
  push(4, false);
  push(1, true); push(1, false); push(1, true); push(2, false);
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    push((c % 3) + 1, true);
    push(((c >> 2) % 2) + 1, false);
    push(((c >> 3) % 3) + 1, true);
    push(((c >> 5) % 2) + 1, false);
  }
  push(2, true); push(1, false); push(1, true);
  push(4, false);
  return out;
}

interface MissionShareCardProps {
  trip: PlanetTrip;
  elapsedSeconds: number;
  completedTasks: Task[];
  totalTasks: number;
  date: Date;
}

// Card dimensions — fixed so the snapshot is always the same resolution.
// Displayed at these exact logical pixels; capture at pixelRatio 2–3 for retina.
export const SHARE_CARD_WIDTH  = 360;
export const SHARE_CARD_HEIGHT = 560;

export const MissionShareCard = React.forwardRef<View, MissionShareCardProps>(
  ({ trip, elapsedSeconds, completedTasks, totalTasks, date }, ref) => {
    const accent = trip.color;
    const bars   = generateBars(`${trip.from}${trip.to}${date.getTime()}`);

    const mins  = Math.floor(elapsedSeconds / 60);
    const hours = Math.floor(mins / 60);
    const displayMins = mins % 60;
    const durationDisplay = hours > 0
      ? `${hours}h ${displayMins > 0 ? `${displayMins}m` : ''}`
      : `${mins}m`;

    const dateLabel = date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    return (
      <View
        ref={ref}
        style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
        className="bg-[#09090B] rounded-3xl overflow-hidden"
      >
        {/* ── Star field ──────────────────────────────────────────────── */}
        {STARS.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: '#ffffff',
              opacity: s.opacity,
            }}
          />
        ))}

        {/* ── Planet glow (top-right) ──────────────────────────────────── */}
        <View
          style={{
            position: 'absolute',
            top: -60, right: -60,
            width: 200, height: 200,
            borderRadius: 100,
            backgroundColor: accent,
            opacity: 0.18,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -30, right: -30,
            width: 100, height: 100,
            borderRadius: 50,
            backgroundColor: accent,
            opacity: 0.22,
          }}
        />

        {/* ── Content ─────────────────────────────────────────────────── */}
        <View className="flex-1 p-7">

          {/* Header row */}
          <View className="flex-row items-center mb-8">
            <Image
              source={require('@/assets/icons/ios-light.png')}
              className='w-6 h-6 mr-2 rounded-lg'
            />
            <Text className="text-white/80 text-[10px] font-primary-medium tracking-[1.5px] uppercase">
              FOCUSROOM AIRWAYS
            </Text>
          </View>

          {/* ── HERO: headline ──────────────────────────────────────────── */}
          <View className="mb-5">
            <Text className="text-white text-[11px] font-primary-medium tracking-[3px] mb-1">
              MISSION
            </Text>
            <Text style={{
              color: '#ffffff',
              fontSize: 58,
              lineHeight: 60,
              fontFamily: 'font-primary-bold',
              textShadowColor: accent,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 24,
            }}>
              COMPLETE.
            </Text>
          </View>

          {/* Route */}
          <View className="flex-row items-center mb-6">
            <Text className="text-white text-xl font-primary-bold">{trip.from}</Text>
            <View className="flex-1 mx-2.5 flex-row items-center">
              <View className="flex-1 h-px bg-white/20" />
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: accent,
                marginHorizontal: 6,
                shadowColor: accent,
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 4,
              }} />
              <View className="flex-1 h-px bg-white/20" />
            </View>
            <Text className="text-white text-xl font-primary-bold">{trip.to}</Text>
          </View>

          {/* Perforation divider */}
          <View className="flex-row justify-evenly mb-6">
            {Array.from({ length: 30 }).map((_, i) => (
              <View key={i} className="w-1.5 bg-white/[0.12] rounded-[1px]" style={{ height: 1.5 }} />
            ))}
          </View>

          {/* Stats row */}
          <View className="flex-row gap-3 mb-6">
            {/* Duration */}
            <View className="flex-1 rounded-[14px] bg-white/[0.06] border border-white/10 p-3.5">
              <Text style={{ color: accent, fontSize: 30, fontFamily: 'font-primary-bold', lineHeight: 34 }}>
                45min
              </Text>
              <Text className="text-white/40 text-[10px] tracking-[1.5px] mt-1">DEEP FOCUS</Text>
            </View>

            {/* Tasks */}
            <View className="flex-1 rounded-[14px] bg-white/[0.06] border border-white/10 p-3.5">
              <Text className="text-white text-[30px] font-primary-bold" style={{ lineHeight: 34 }}>
                {completedTasks.length}/{totalTasks}
              </Text>
              <Text className="text-white/40 text-[10px] tracking-[1.5px] mt-1">TASKS DONE</Text>
            </View>
          </View>

          {/* Completed task titles (up to 3) */}
          {completedTasks.length > 0 && (
            <View className="mb-6">
              {completedTasks.slice(0, 3).map((task) => (
                <View key={task.id} className="flex-row items-center mb-1.5">
                  <View
                    style={{
                      backgroundColor: accent + '33',
                      borderColor: accent + '80',
                    }}
                    className="w-5 h-5 rounded-[4px] border items-center justify-center mr-2"
                  >
                    <Text style={{ color: accent }} className="text-[8px] font-primary-bold">✓</Text>
                  </View>
                  <Text className="text-white/90 text-xs font-primary-medium flex-1" numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Barcode + footer */}
          <View>
            <View className="flex-row h-9 mb-2.5 opacity-35">
              {bars.map((bar, i) => (
                <View
                  key={i}
                  style={{
                    flex: bar.width,
                    backgroundColor: bar.dark ? '#ffffff' : '#09090B',
                  }}
                />
              ))}
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-white/[0.28] text-[10px] font-primary-medium">{dateLabel}</Text>
              <Text className="text-white/[0.28] text-[10px] font-primary-medium tracking-[1px]">FOCUSROOM</Text>
            </View>
          </View>

        </View>
      </View>
    );
  },
);

MissionShareCard.displayName = 'MissionShareCard';
