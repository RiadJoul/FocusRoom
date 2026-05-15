import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useUserStore } from '@/lib/stores/userStore';
import { useListStore } from '@/lib/stores/listStore';
import { presentPaywallOnce } from '@/lib/paywall/presentPaywall';
import { FocusSession } from '@/lib/types/session';
import { analytics, Events, Properties } from '@/lib/analytics';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Computations ──────────────────────────────────────────────────────────────

function computeStreaks(sessions: FocusSession[]) {
  const daySet = new Set(sessions.map((s) => s.created_at.slice(0, 10)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Current streak — grace period: if today has no session yet, start from yesterday
  let d = new Date(today);
  if (!daySet.has(toDateKey(d))) d.setDate(d.getDate() - 1);

  let currentStreak = 0;
  while (daySet.has(toDateKey(d))) {
    currentStreak++;
    d.setDate(d.getDate() - 1);
  }

  // Best streak
  const sortedDays = Array.from(daySet).sort();
  let best = 0;
  let run = sortedDays.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedDays.length; i++) {
    const diff =
      (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) /
      86400000;
    if (Math.round(diff) === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  if (run > best) best = run;

  return { currentStreak, bestStreak: Math.max(best, currentStreak) };
}

function getLast7Days(sessions: FocusSession[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = toDateKey(d);
    const daySessions = sessions.filter((s) => s.created_at.slice(0, 10) === key);
    return {
      label: DAY_ABBR[d.getDay()],
      minutes: Math.round(daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60),
      tasks: daySessions.reduce((sum, s) => sum + s.tasks_completed, 0),
    };
  });
}

function getHeatmapData(sessions: FocusSession[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay: Record<string, number> = {};
  sessions.forEach((s) => {
    const key = s.created_at.slice(0, 10);
    byDay[key] = (byDay[key] || 0) + s.duration_seconds / 60;
  });

  return Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (83 - i));
    const mins = byDay[toDateKey(d)] || 0;
    const level = mins === 0 ? 0 : mins < 25 ? 1 : mins < 60 ? 2 : 3;
    return { level };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <Text className="text-white font-primary-bold text-xl">{value}</Text>
      <Text className="text-gray-400 font-primary-medium text-xs mt-1">{label}</Text>
    </View>
  );
}

function BigStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 rounded-2xl p-4"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <Text className="text-white font-primary-bold text-2xl">{value}</Text>
      <Text className="text-gray-400 font-primary-medium text-xs mt-1.5">{label}</Text>
    </View>
  );
}

function BarChart({
  data,
  color,
  formatValue,
}: {
  data: { label: string; value: number }[];
  color: string;
  formatValue: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const BAR_H = 90;

  return (
    <View className="mt-3">
      <View className="flex-row items-end gap-1.5" style={{ height: BAR_H }}>
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max((d.value / max) * BAR_H, 6) : 2;
          return (
            <View key={i} className="flex-1 items-center justify-end">
              {d.value > 0 && (
                <Text
                  className="font-primary-medium mb-1"
                  style={{ color, fontSize: 9 }}
                  numberOfLines={1}
                >
                  {formatValue(d.value)}
                </Text>
              )}
              <View
                style={{
                  width: '100%',
                  height: h,
                  backgroundColor: d.value > 0 ? color : 'rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  opacity: d.value > 0 ? 1 : 0.6,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row mt-2 gap-1.5">
        {data.map((d, i) => (
          <Text
            key={i}
            className="flex-1 text-center text-gray-500 font-primary-medium"
            style={{ fontSize: 10 }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Matches HabitWidget.swift exactly: purple at 3 opacities + near-invisible empty
const CELL_COLORS = [
  'rgba(255,255,255,0.08)', // level 0 — empty
  'rgba(168,85,247,0.33)',  // level 1
  'rgba(168,85,247,0.66)',  // level 2
  '#a855f7',                // level 3
];
const LEGEND_COLORS = CELL_COLORS; // same order

const CELL_SPACING = 3;
const ROWS = 7;
const COLS = 12; // 12 weeks

function Heatmap({ data }: { data: { level: number }[] }) {
  // Widget renders column-first (LazyHGrid with rows): each column = one week, 7 days top→bottom
  // data is oldest→newest, so column 0 = oldest week
  const weeks: { level: number }[][] = [];
  for (let c = 0; c < COLS; c++) {
    weeks.push(data.slice(c * ROWS, c * ROWS + ROWS));
  }

  return (
    <View>
      {/* Grid */}
      <View style={{ flexDirection: 'row', gap: CELL_SPACING, marginTop: 8 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ flex: 1, gap: CELL_SPACING }}>
            {week.map((day, di) => (
              <View
                key={di}
                style={{
                  aspectRatio: 1.2,
                  borderRadius: 3,
                  backgroundColor: CELL_COLORS[day.level],
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, gap: 4 }}>
        <Text className="text-gray-600 font-primary-medium" style={{ fontSize: 10 }}>Less</Text>
        {LEGEND_COLORS.map((c, i) => (
          <View key={i} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }} />
        ))}
        <Text className="text-gray-600 font-primary-medium" style={{ fontSize: 10 }}>More</Text>
      </View>
    </View>
  );
}

function PremiumLockBanner({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.3)',
      }}
    >
      {/* Background */}
      <View
        style={{
          backgroundColor: 'rgba(168,85,247,0.08)',
          padding: 16,
        }}
      >
        {/* Top row: icon + label + badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Glowing icon container */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(168,85,247,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#a855f7',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
              }}
            >
              <Ionicons name="planet-outline" size={24} color="#a855f7" />
            </View>
            <View>
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins-SemiBold', fontSize: 14 }}>
                {title}
              </Text>
              <Text style={{ color: 'rgba(156,163,175,1)', fontFamily: 'Poppins-Medium', fontSize: 11, marginTop: 1 }}>
                {subtitle}
              </Text>
            </View>
          </View>

          {/* FIRST CLASS pill */}
          <View
            style={{
              backgroundColor: '#a855f7',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              shadowColor: '#a855f7',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
            }}
          >
            <Text style={{ color: '#ffffff', fontFamily: 'Poppins-Bold', fontSize: 9, letterSpacing: 1 }}>
              FIRST CLASS
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: 'rgba(168,85,247,0.2)', marginBottom: 12 }} />

        {/* CTA row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: 'rgba(196,181,253,1)', fontFamily: 'Poppins-Medium', fontSize: 12, flex: 1, marginRight: 12 }}>
            Unlock this feature and more with Premium.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#a855f7',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 7,
              shadowColor: '#a855f7',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontFamily: 'Poppins-SemiBold', fontSize: 12 }}>Unlock</Text>
            <Ionicons name="arrow-forward" size={12} color="#ffffff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const user = useUserStore((s) => s.user);
  const isPremium = Boolean(user?.is_premium);
  const sessions = useSessionStore((s) => s.sessions);
  const stats = useSessionStore((s) => s.stats);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const fetchStats = useSessionStore((s) => s.fetchStats);
  const lists = useListStore((s) => s.lists);

  useEffect(() => {
    analytics.track(Events.SCREEN_VIEW, { [Properties.SCREEN_NAME]: 'Analytics' });
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchSessions(user.id);
      fetchStats(user.id);
    }
  }, [user?.id]);

  const { currentStreak, bestStreak } = useMemo(
    () => computeStreaks(sessions),
    [sessions]
  );

  const last7Days = useMemo(() => getLast7Days(sessions), [sessions]);
  const heatmapData = useMemo(() => getHeatmapData(sessions), [sessions]);

  const thisWeekMinutes = last7Days.reduce((s, d) => s + d.minutes, 0);
  const thisWeekTasks = last7Days.reduce((s, d) => s + d.tasks, 0);
  const thisWeekSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return last7Days.reduce((count, d, i) => {
      const dayD = new Date(today);
      dayD.setDate(dayD.getDate() - (6 - i));
      const key = toDateKey(dayD);
      return count + sessions.filter((s) => s.created_at.slice(0, 10) === key).length;
    }, 0);
  }, [last7Days, sessions]);

  const streakMessage =
    currentStreak === 0
      ? 'Start a focus session today!'
      : currentStreak < 3
      ? "You're building momentum"
      : currentStreak < 7
      ? 'Great consistency!'
      : currentStreak < 30
      ? 'On fire — keep it up 🚀'
      : 'Legendary focus streak!';

  const healthScore = stats?.focusHealthScore ?? 0;
  const healthColor =
    healthScore >= 80 ? '#22c55e' :
    healthScore >= 60 ? '#eab308' :
    healthScore >= 40 ? '#f97316' : '#ef4444';
  const healthLabel =
    healthScore >= 80 ? 'Excellent' :
    healthScore >= 60 ? 'Good' :
    healthScore >= 40 ? 'Fair' : 'Needs Work';

  const handleUnlockHeatmap = () =>
    presentPaywallOnce({ userId: user?.id, source: 'analytics_heatmap' });
  const handleUnlockHealth = () =>
    presentPaywallOnce({ userId: user?.id, source: 'analytics_health_score' });
  const handleUnlockLists = () =>
    presentPaywallOnce({ userId: user?.id, source: 'analytics_list_breakdown' });

  const [activeTab, setActiveTab] = useState<'overview' | 'insights'>('overview');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
        <Text className="text-2xl font-primary-bold text-white">Analytics</Text>
        <Text className="text-gray-500 font-primary-medium text-sm mt-1">
          Your focus journey at a glance
        </Text>

        {/* Tab bar */}
        <View
          className="flex-row rounded-2xl p-1 mt-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.8}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={activeTab === 'overview' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : undefined}
          >
            <Text
              className="font-primary-semibold text-sm"
              style={{ color: activeTab === 'overview' ? '#ffffff' : '#6b7280' }}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('insights')}
            activeOpacity={0.8}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={activeTab === 'insights' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : undefined}
          >
            <Text
              className="font-primary-semibold text-sm"
              style={{ color: activeTab === 'insights' ? '#ffffff' : '#6b7280' }}
            >
              Insights
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            {/* ── Streak Hero ──────────────────────────────────────────────────── */}
            <View
              className="rounded-3xl p-5 mb-4"
              style={{
                backgroundColor: 'rgba(249,115,22,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(249,115,22,0.22)',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-end gap-2 mb-1">
                    <Text style={{ fontSize: 30 }}>🔥</Text>
                    <Text
                      className="text-white font-primary-bold"
                      style={{ fontSize: 52, lineHeight: 58 }}
                    >
                      {currentStreak}
                    </Text>
                    <Text className="text-orange-400 font-primary-semibold text-lg mb-2">
                      day{currentStreak !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text className="text-orange-300 font-primary-semibold text-sm mb-0.5">
                    Current streak
                  </Text>
                  <Text className="text-gray-400 font-primary-medium text-xs">
                    {streakMessage}
                  </Text>
                </View>

                <View
                  className="items-center rounded-2xl px-4 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  <Text className="text-white font-primary-bold text-2xl">{bestStreak}</Text>
                  <Text className="text-gray-400 font-primary-medium mt-0.5" style={{ fontSize: 10 }}>
                    Best streak
                  </Text>
                </View>
              </View>
            </View>

            {/* ── This Week ────────────────────────────────────────────────────── */}
            <Text className="text-white font-primary-bold text-lg mb-3">This Week</Text>
            <View className="flex-row gap-3 mb-5">
              <MiniStatCard label="Focus Time" value={formatMinutes(thisWeekMinutes)} />
              <MiniStatCard label="Tasks Done" value={String(thisWeekTasks)} />
              <MiniStatCard label="Sessions" value={String(thisWeekSessions)} />
            </View>

            {/* ── 7-day Tasks Bar Chart ─────────────────────────────────────────── */}
            <View
              className="rounded-2xl p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text className="text-white font-primary-semibold text-sm">Tasks Completed</Text>
              <Text className="text-gray-500 font-primary-medium mt-0.5" style={{ fontSize: 11 }}>
                Last 7 days
              </Text>
              <BarChart
                data={last7Days.map((d) => ({ label: d.label, value: d.tasks }))}
                color="#a855f7"
                formatValue={(v) => String(v)}
              />
            </View>

            {/* ── 7-day Focus Time Bar Chart ────────────────────────────────────── */}
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text className="text-white font-primary-semibold text-sm">Focus Time</Text>
              <Text className="text-gray-500 font-primary-medium mt-0.5" style={{ fontSize: 11 }}>
                Last 7 days
              </Text>
              <BarChart
                data={last7Days.map((d) => ({ label: d.label, value: d.minutes }))}
                color="#38bdf8"
                formatValue={formatMinutes}
              />
            </View>
          </>
        )}

        {activeTab === 'insights' && (
          <>
            {/* ── 12-week Heatmap ───────────────────────────────────────────────── */}
            <View
              className="rounded-2xl p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1">
                  <Text className="text-white font-primary-semibold text-sm">🪐 Habit orbit</Text>
                  <Text className="text-gray-500 font-primary-regular" style={{ fontSize: 11 }}> Last 90 days</Text>
                </View>
                {!isPremium && (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-purple-400 font-primary-medium" style={{ fontSize: 11 }}>
                      Premium
                    </Text>
                  </View>
                )}
              </View>

              {isPremium ? (
                <Heatmap data={heatmapData} />
              ) : (
                <TouchableOpacity onPress={handleUnlockHeatmap} activeOpacity={0.9}>
                  <View style={{ position: 'relative' }}>
                    <View style={{ opacity: 0.01, pointerEvents: 'none' }}>
                      <Heatmap data={heatmapData} />
                    </View>
                    <View
                      className="absolute inset-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                    >
                      <Ionicons name="planet-outline" size={24} color="#a855f7" />
                      <Text className="text-white font-primary-semibold text-sm mt-2">
                        Unlock with Premium
                      </Text>
                      <Text
                        className="text-gray-400 font-primary-medium mt-1 text-center"
                        style={{ fontSize: 11 }}
                      >
                        See your last 90 days of focus habits.
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* ── All-time Stats ────────────────────────────────────────────────── */}
            <Text className="text-white font-primary-bold text-lg mb-3">All Time</Text>
            <View className="flex-row gap-3 mb-3">
              <BigStatCard
                label="Focus Time"
                value={formatMinutes(stats?.totalMinutes ?? 0)}
              />
              <BigStatCard label="Sessions" value={String(stats?.totalSessions ?? 0)} />
            </View>
            <View className="flex-row gap-3 mb-6">
              <BigStatCard label="Tasks Done" value={String(stats?.tasksCompleted ?? 0)} />
              <BigStatCard label="Best Streak" value={`${bestStreak}d`} />
            </View>

            {/* ── Focus Health Score ────────────────────────────────────────────── */}
            {isPremium ? (
              <View
                className="rounded-2xl p-4 mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <Text className="text-white font-primary-semibold text-sm mb-4">
                  Focus Health Score
                </Text>
                <View className="flex-row items-center gap-4">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center"
                    style={{ borderWidth: 3, borderColor: healthColor }}
                  >
                    <Text className="text-white font-primary-bold text-xl">{healthScore}</Text>
                    <Text className="text-gray-500 font-primary-medium" style={{ fontSize: 9 }}>
                      / 100
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-primary-bold text-base" style={{ color: healthColor }}>
                      {healthLabel}
                    </Text>
                    <Text className="text-gray-400 font-primary-medium text-xs mt-1.5 leading-5">
                      Based on your consistency, focus time, and tasks completed over the last 7 days.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mb-6">
                <PremiumLockBanner
                  title="Focus Health Score"
                  subtitle="Your 7-day consistency score"
                  onPress={handleUnlockHealth}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
