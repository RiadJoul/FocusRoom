import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { FontAwesome5 } from '@expo/vector-icons';

type SectorStatus = 'held' | 'unlocked' | 'locked';

type Sector = {
  id: number;
  label: string;
  status: SectorStatus;
  sessions: number;
};

const SECTORS_BACK = 4;
const MIN_SESSIONS_PER_WEEK = 3;

export function GalaxyMap() {
  const sessions = useSessionStore((state) => state.sessions);

  const sectors: Sector[] = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return Array.from({ length: SECTORS_BACK }).map((_, index) => ({
        id: index,
        label: index === 0 ? 'This Week' : `${index}w ago`,
        status: 'locked' as SectorStatus,
        sessions: 0,
      }));
    }

    const now = new Date();
    const endOfCurrentWeek = new Date(now);
    const dayOfWeek = endOfCurrentWeek.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    endOfCurrentWeek.setHours(23, 59, 59, 999);
    endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + (6 - diffToMonday));

    const sectorList: Sector[] = [];

    for (let i = 0; i < SECTORS_BACK; i++) {
      const end = new Date(endOfCurrentWeek);
      end.setDate(end.getDate() - 7 * i);

      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const count = sessions.filter((s) => {
        const createdAt = new Date(s.created_at);
        return createdAt >= start && createdAt <= end;
      }).length;

      sectorList.push({
        id: i,
        label: i === 0 ? 'This Week' : `${i}w ago`,
        sessions: count,
        status: 'locked',
      });
    }

    let streakBroken = false;
    return sectorList.map((sector, index) => {
      const meetsThreshold = sector.sessions >= MIN_SESSIONS_PER_WEEK;
      if (!streakBroken && meetsThreshold) {
        return { ...sector, status: 'held' as SectorStatus };
      }
      if (!streakBroken && !meetsThreshold) {
        streakBroken = true;
        return { ...sector, status: sector.sessions > 0 ? 'unlocked' : 'locked' };
      }
      return { ...sector, status: sector.sessions > 0 ? 'unlocked' : 'locked' };
    });
  }, [sessions]);

  const heldCount = sectors.filter((s) => s.status === 'held').length;

  // Longest streak of held sectors starting from "This Week"
  const heldStreak = useMemo(() => {
    let streak = 0;
    for (let i = 0; i < sectors.length; i++) {
      if (sectors[i].status === 'held') {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [sectors]);

  const rankLabel = useMemo(() => {
    if (heldCount >= 8) return 'Fleet Admiral';
    if (heldCount >= 5) return 'Commander';
    if (heldCount >= 3) return 'Captain';
    if (heldCount >= 1) return 'Pilot';
    return 'Cadet';
  }, [heldCount]);

  const rankVisual = useMemo(() => {
    switch (rankLabel) {
      case 'Fleet Admiral':
        return {
          iconColor: '#fefce8',
          borderColor: '#f97316',
          flameColor: 'rgba(249,115,22,0.55)',
        };
      case 'Commander':
        return {
          iconColor: '#ecfeff',
          borderColor: '#22c55e',
          flameColor: 'rgba(34,197,94,0.55)',
        };
      case 'Captain':
        return {
          iconColor: '#e0f2fe',
          borderColor: '#38bdf8',
          flameColor: 'rgba(56,189,248,0.55)',
        };
      case 'Pilot':
        return {
          iconColor: '#e5e7eb',
          borderColor: '#a855f7',
          flameColor: 'rgba(168,85,247,0.45)',
        };
      default:
        return {
          iconColor: '#9ca3af',
          borderColor: '#4b5563',
          flameColor: 'rgba(31,41,55,0.7)',
        };
    }
  }, [rankLabel]);

  const rankPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rankPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(rankPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [rankPulse]);

  const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.id ?? 0);

  const selectedSector = sectors.find((s) => s.id === selectedSectorId) ?? sectors[0];
  const selectedLabel =
    selectedSector?.label === 'This Week'
      ? 'This Week'
      : selectedSector?.label.replace('w ago', 'w');

  const selectedStatusText =
    selectedSector?.status === 'held'
      ? 'Held sector'
      : selectedSector?.status === 'unlocked'
        ? 'Visited sector'
        : 'Unexplored sector';

  const sessionsToHoldSelected =
    selectedSector?.id === 0 && selectedSector.sessions < MIN_SESSIONS_PER_WEEK
      ? MIN_SESSIONS_PER_WEEK - selectedSector.sessions
      : 0;

  return (
    <View className="bg-card rounded-3xl px-4 py-5 mb-6 border border-white/5">
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View>
          <Text className="text-gray-400 font-primary-medium text-[11px] uppercase tracking-[0.18em]">
            Galaxy Map
          </Text>
          <Text className="text-white font-primary-semibold text-base mt-1">
            Sectors under your control
          </Text>
        </View>
        <View className="flex-col items-end">
          {/* Rank avatar with subtle flame animation */}
          <View style={{ marginRight: 8 }}>
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  backgroundColor: rankVisual.flameColor,
                  opacity: rankPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 0.8],
                  }),
                  transform: [
                    {
                      scale: rankPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                }}
              />
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: rankVisual.borderColor,
                  backgroundColor: '#020617',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: rankVisual.flameColor,
                  shadowOpacity: 0.7,
                  shadowRadius: 8,
                }}
              >
                <FontAwesome5
                  name="user-astronaut"
                  size={17}
                  color={rankVisual.iconColor}
                />
              </View>
            </View>
          </View>
          <View>
            <Text className="text-gray-400 font-primary-medium text-xs">
              Rank: <Text className="text-gray-100">{rankLabel}</Text>
                
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 10 }}
      >
        {sectors.map((sector, index) => {
          const isHeld = sector.status === 'held';
          const isUnlocked = sector.status === 'unlocked';
          const isLocked = sector.status === 'locked';
          const isSelected = sector.id === selectedSectorId;

          const planetColor = isHeld
            ? '#22c55e'
            : isUnlocked
              ? '#eab308'
              : '#4b5563';

          const ringColor = isHeld
            ? 'rgba(34,197,94,0.35)'
            : isUnlocked
              ? 'rgba(234,179,8,0.25)'
              : 'rgba(75,85,99,0.18)';

          const label =
            sector.label === 'This Week'
              ? 'This Week'
              : sector.label.replace('w ago', 'w');

          const planetSize = isSelected ? 34 : 28;

          const sessionsProgress = Math.min(
            1,
            sector.sessions / MIN_SESSIONS_PER_WEEK
          );

          return (
            <TouchableOpacity
              key={sector.id}
              activeOpacity={0.8}
              onPress={() => setSelectedSectorId(sector.id)}
              style={{
                width: 90,
                alignItems: 'center',
                marginHorizontal: 4,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 32,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: '#111827',
                  opacity: 0.7,
                }}
              />

              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    width: 60,
                    height: 60,
                    borderRadius: 999,
                    borderWidth: isSelected ? 2 : 1.2,
                    borderColor: ringColor,
                  }}
                />
                {/* Progress arc for this week’s control (sessions towards threshold) */}
                {sector.id === 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      width: 40,
                      height: 2,
                      borderRadius: 999,
                      overflow: 'hidden',
                      backgroundColor: '#1f2937',
                    }}
                  >
                    <View
                      style={{
                        width: `${sessionsProgress * 100}%`,
                        height: '100%',
                        backgroundColor: planetColor,
                      }}
                    />
                  </View>
                )}
                <View
                  style={{
                    width: planetSize,
                    height: planetSize,
                    borderRadius: 999,
                    backgroundColor: planetColor,
                    opacity: isLocked ? 0.6 : 1,
                    shadowColor: planetColor,
                    shadowOpacity: isHeld ? 0.6 : 0.25,
                    shadowRadius: isHeld ? 12 : 6,
                  }}
                />
              </View>
              <Text
                className="text-gray-200 font-primary-medium text-[11px] mt-2"
                numberOfLines={1}
              >
                {label}
              </Text>
              <Text className="text-gray-500 font-primary-medium text-[10px] mt-0.5">
                {sector.sessions} sessions
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedSector && (
        <View className="mt-3 px-1">
          <Text className="text-gray-300 font-primary-medium text-[11px]">
            {selectedLabel}: {selectedSector.sessions} sessions · {selectedStatusText}
          </Text>
          <Text className="text-gray-500 font-primary-medium text-[11px] mt-1">
            Hold a sector by completing at least {MIN_SESSIONS_PER_WEEK} focus sessions in that week.
            A break in your streak doesn&apos;t reset progress, but new sessions are needed to reclaim control.
          </Text>
          {sessionsToHoldSelected > 0 && (
            <Text className="text-primary font-primary-medium text-[11px] mt-1.5">
              {sessionsToHoldSelected === 1
                ? 'One more focus flight secures this sector.'
                : `${sessionsToHoldSelected} more focus flights to secure this sector.`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
