import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
const SLIDE_INTERVAL = 2800;
const TRANSITION_MS = 360;

// ── Illustrations ─────────────────────────────────────────────────────────────

function RecurringIllustration() {
  const lists = [
    {
      listName: 'Fitness',
      color: '#F97316',
      tasks: [
        { label: 'Morning run — 5km',    recurrence: 'Daily · 6:30 AM',    icon: 'walk-outline'     },
        { label: 'Gym session',           recurrence: 'Mon, Wed, Fri',      icon: 'barbell-outline'  },
      ],
    },
    {
      listName: 'Work',
      color: '#3B82F6',
      tasks: [
        { label: 'Check emails & Slack',  recurrence: 'Weekdays · 9:00 AM', icon: 'mail-outline'     },
        { label: 'Weekly team sync',      recurrence: 'Every Monday · 10AM',icon: 'people-outline'   },
      ],
    },
    {
      listName: 'Personal',
      color: '#10B981',
      tasks: [
        { label: 'Read 20 pages',         recurrence: 'Daily · 9:00 PM',    icon: 'book-outline'     },
      ],
    },
  ];

  return (
    <View style={{ gap: 14 }}>
      {lists.map((list) => (
        <View key={list.listName}>
          {/* List header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: list.color }} />
            <Text style={{ color: list.color, fontSize: 11, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.5 }}>
              {list.listName.toUpperCase()}
            </Text>
          </View>
          <View style={{ gap: 7 }}>
            {list.tasks.map((t) => (
              <View
                key={t.label}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
                  paddingVertical: 10, paddingHorizontal: 12,
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${list.color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={t.icon as any} size={15} color={list.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' }}>{t.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MaterialCommunityIcons name="repeat" size={11} color={list.color} />
                    <Text style={{ color: list.color, fontSize: 10, fontFamily: 'Poppins_500Medium', opacity: 0.85 }}>{t.recurrence}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CockpitIllustration() {
  const videoRef = useRef<Video>(null);
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  // iPhone proportions (~71mm × 154mm scaled down)
  const PHONE_W = 155;
  const PHONE_H = 310;
  const CORNER  = 40;
  const BEZEL   = 3;

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY }] }}>
      {/* ── Outer chassis (titanium-ish frame) ── */}
      <View style={{ position: 'relative', width: PHONE_W, height: PHONE_H }}>

        {/* Left side buttons */}
        {/* Silent switch */}
        <View style={{
          position: 'absolute', left: -4, top: 68,
          width: 4, height: 18, borderRadius: 2,
          backgroundColor: '#2a2a2e',
          shadowColor: '#000', shadowOffset: { width: -1, height: 0 }, shadowOpacity: 0.5, shadowRadius: 1,
        }} />
        {/* Volume up */}
        <View style={{
          position: 'absolute', left: -4, top: 98,
          width: 4, height: 30, borderRadius: 2,
          backgroundColor: '#2a2a2e',
          shadowColor: '#000', shadowOffset: { width: -1, height: 0 }, shadowOpacity: 0.5, shadowRadius: 1,
        }} />
        {/* Volume down */}
        <View style={{
          position: 'absolute', left: -4, top: 136,
          width: 4, height: 30, borderRadius: 2,
          backgroundColor: '#2a2a2e',
          shadowColor: '#000', shadowOffset: { width: -1, height: 0 }, shadowOpacity: 0.5, shadowRadius: 1,
        }} />

        {/* Right side — power button */}
        <View style={{
          position: 'absolute', right: -4, top: 110,
          width: 4, height: 44, borderRadius: 2,
          backgroundColor: '#2a2a2e',
          shadowColor: '#000', shadowOffset: { width: 1, height: 0 }, shadowOpacity: 0.5, shadowRadius: 1,
        }} />

        {/* Phone body */}
        <View
          style={{
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: CORNER,
            backgroundColor: '#111116',
            borderWidth: BEZEL,
            borderColor: '#3a3a40',
            overflow: 'hidden',
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
          }}
        >
          {/* Video screen */}
          <Video
            ref={videoRef}
            source={require('../../assets/videos/session-3d.mp4')}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Screen glare — subtle diagonal shine */}
          <View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: CORNER - BEZEL,
              // very subtle white gradient sheen on top-left corner
              backgroundColor: 'transparent',
              borderTopWidth: 60, borderLeftWidth: 60,
              borderTopColor: 'rgba(255,255,255,0.03)',
              borderLeftColor: 'transparent',
            }}
            pointerEvents="none"
          />

          {/* Dynamic Island */}
          <View
            style={{
              position: 'absolute', top: 12, alignSelf: 'center',
              width: 72, height: 22,
              borderRadius: 11,
              backgroundColor: '#000',
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 7,
              gap: 4,
            }}
          >
            {/* Front camera dot */}
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#111' }}>
              {/* Lens glint */}
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: '#2d2d2d', margin: 1.5 }} />
            </View>
            {/* Face ID sensor bar */}
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#1c1c1e' }} />
          </View>

          {/* Home indicator */}
          <View
            style={{
              position: 'absolute', bottom: 8, alignSelf: 'center',
              width: 50, height: 4, borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.25)',
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function AnalyticsIllustration() {
  const BARS = [
    { label: 'Mon', pct: 0.60 }, { label: 'Tue', pct: 0.85 }, { label: 'Wed', pct: 0.50 },
    { label: 'Thu', pct: 0.95 }, { label: 'Fri', pct: 0.70 }, { label: 'Sat', pct: 0.30 }, { label: 'Sun', pct: 0.20 },
  ];
  const CHART_H = 60;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { icon: <Ionicons name="flame-outline" size={13} color="#F97316" />,        value: '7-day',   sub: 'Streak'      },
          { icon: <Ionicons name="speedometer-outline" size={13} color="#10B981" />, value: '45 min',  sub: 'Avg Session' },
          { icon: <Ionicons name="planet-outline" size={13} color="#a855f7" />,      value: '4023 km', sub: 'Distance'    },
        ].map((s) => (
          <View key={s.sub} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12 }}>
            {s.icon}
            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold', marginTop: 5 }}>{s.value}</Text>
            <Text style={{ color: '#6b7280', fontSize: 9, fontFamily: 'Poppins_500Medium' }}>{s.sub}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14 }}>
        <Text style={{ color: '#4b5563', fontSize: 9, fontFamily: 'Poppins_500Medium', letterSpacing: 1, marginBottom: 10 }}>FOCUS HOURS THIS WEEK</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: CHART_H }}>
          {BARS.map((b) => (
            <View key={b.label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: '100%', height: CHART_H * b.pct, backgroundColor: b.pct >= 0.5 ? '#a855f7' : 'rgba(168,85,247,0.3)', borderRadius: 4 }} />
              <Text style={{ color: '#4b5563', fontSize: 9, fontFamily: 'Poppins_500Medium' }}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function WidgetsIllustration() {
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0.4)).current; // offset phase

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]),
      );
    makeLoop(floatA, 2000).start();
    makeLoop(floatB, 2400).start();
  }, []);

  const yA = floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const yB = floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <View style={{ gap: 10 }}>
      {/* Habit widget — full-width rectangle on top */}
      <Animated.View style={{ transform: [{ translateY: yA }] }}>
        <Image
          source={require('../../assets/images/habit-widget.jpeg')}
          style={{ width: '100%', height: 180, borderRadius: 18 }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Task + StandBy side by side on the bottom */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Animated.View style={{ transform: [{ translateY: yB }] }}>
          <Image
            source={require('../../assets/images/task-widget.jpeg')}
            style={{ width: 100, height: 100, borderRadius: 16 }}
            resizeMode="cover"
          />
        </Animated.View>
        <Animated.View style={{ flex: 1, transform: [{ translateY: yA }] }}>
          <Image
            source={require('../../assets/images/standBy-widget.png')}
            style={{ width: '100%', height: 100, borderRadius: 16 }}
            resizeMode="cover"
          />
        </Animated.View>
      </View>
    </View>
  );
}

function UnlimitedListsIllustration() {
  const lists = [
    { label: 'Work',     icon: 'briefcase-outline',   color: '#3B82F6', tasks: 8  },
    { label: 'Personal', icon: 'person-outline',       color: '#10B981', tasks: 5  },
    { label: 'Fitness',  icon: 'barbell-outline',      color: '#F97316', tasks: 4  },
    { label: 'Learning', icon: 'book-outline',         color: '#a855f7', tasks: 6  },
    { label: 'Side Project', icon: 'rocket-outline',   color: '#EC4899', tasks: 3  },
  ];
  return (
    <View style={{ gap: 9 }}>
      {lists.map((l) => (
        <View
          key={l.label}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            paddingVertical: 11, paddingHorizontal: 14,
          }}
        >
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${l.color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name={l.icon as any} size={16} color={l.color} />
          </View>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold', flex: 1 }}>{l.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#4b5563', fontSize: 11, fontFamily: 'Poppins_500Medium' }}>{l.tasks} tasks</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    label: 'Recurring Tasks',
    description: 'Turn any mission into a daily, weekly, or custom task that auto-resets.',
    Illustration: RecurringIllustration,
  },
  {
    label: '3D Cockpit',
    description: 'Immersive mission control — watch your focus flight come to life in real time.',
    Illustration: CockpitIllustration,
  },
  {
    label: 'Deep Analytics',
    description: "Streaks, distance, session length — see if you're actually improving.",
    Illustration: AnalyticsIllustration,
  },
  {
    label: 'Home Widgets',
    description: 'Pin live mission status right on your home screen or lock screen.',
    Illustration: WidgetsIllustration,
  },
  {
    label: 'Unlimited Lists',
    description: 'Organize missions into as many lists as you need — work, personal, fitness and more.',
    Illustration: UnlimitedListsIllustration,
  },
] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function FreeTrialSlide() {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  // Measured by onLayout — avoids SCREEN_WIDTH guesswork that causes the peek
  const [slideWidth, setSlideWidth] = useState(0);
  const slideWidthRef = useRef(0);

  // useNativeDriver: false so the JS-thread overflow: 'hidden' clip works
  const translateX = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  const advance = useCallback(() => {
    const next = (activeRef.current + 1) % SLIDES.length;
    Animated.timing(translateX, {
      toValue: -next * slideWidthRef.current,
      duration: TRANSITION_MS,
      useNativeDriver: false,
    }).start(() => {
      activeRef.current = next;
      setActive(next);
    });
  }, [translateX]);

  useEffect(() => {
    const anim = progressAnims[active];
    anim.setValue(0);
    const fill = Animated.timing(anim, { toValue: 1, duration: SLIDE_INTERVAL, useNativeDriver: false });
    fill.start(({ finished }) => { if (finished) advance(); });
    return () => fill.stop();
  }, [active, advance]);

  return (
    <View style={{ flex: 1 }}>
      {/* Story-style progress segments */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 22 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            {i < active && <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.55)' }} />}
            {i === active && (
              <Animated.View
                style={{
                  height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  width: progressAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }}
              />
            )}
          </View>
        ))}
      </View>

      {/* Clip container — measured so translateX is pixel-perfect */}
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (slideWidthRef.current !== w) {
            slideWidthRef.current = w;
            setSlideWidth(w);
            // Reset position in case width changed
            translateX.setValue(-activeRef.current * w);
          }
        }}
      >
        {slideWidth > 0 && (
          <Animated.View
            style={{
              flexDirection: 'row',
              width: slideWidth * SLIDES.length,
              flex: 1,
              transform: [{ translateX }],
            }}
          >
            {SLIDES.map((slide) => (
              <View key={slide.label} style={{ width: slideWidth }}>
                <View style={{ marginBottom: 24 }}>
                  <slide.Illustration />
                </View>
                <View style={{ alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: '#ffffff', fontSize: 20, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 8 }}>
                    {slide.label}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center', lineHeight: 22 }}>
                    {slide.description}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}
