export interface PlanetTrip {
  id: string;
  from: string;
  to: string;
  duration: number; // in seconds
  distance_km: number; // distance in kilometers
  color: string;
  description: string;
}

// Ordered by real-ish minimum distance from Earth (nearest → farthest)
export const PLANET_TRIPS: PlanetTrip[] = [
  {
    id: 'earth-venus',
    from: 'Earth',
    to: 'Venus',
    duration: 15 * 60, // 15 minutes
    // ~41 million km (closest approach)
    distance_km: 41_000_000,
    color: '#F97316', // warm orange
    description: 'Fast warm‑up mission 🟠',
  },
  {
    id: 'earth-mars',
    from: 'Earth',
    to: 'Mars',
    duration: 25 * 60, // 25 minutes
    // ~78 million km
    distance_km: 78_000_000,
    color: '#EF4444', // red
    description: 'Quick focus boost 🔴',
  },
  {
    id: 'earth-mercury',
    from: 'Earth',
    to: 'Mercury',
    duration: 45 * 60, // 45 minutes
    // ~91 million km
    distance_km: 91_000_000,
    color: '#FACC15', // yellow
    description: 'Standard focus flight 🟡',
  },
  {
    id: 'earth-jupiter',
    from: 'Earth',
    to: 'Jupiter',
    duration: 80 * 60, // 1h20min
    // ~588 million km
    distance_km: 588_000_000,
    color: '#A855F7', // purple
    description: 'Deep work orbit 🪐',
  },
  {
    id: 'earth-saturn',
    from: 'Earth',
    to: 'Saturn',
    duration: 120 * 60, // 2 hours
    // ~1.2 billion km
    distance_km: 1_200_000_000,
    color: '#38BDF8', // cyan
    description: 'Extended flow mission 💫',
  },
  {
    id: 'earth-uranus',
    from: 'Earth',
    to: 'Uranus',
    duration: 150 * 60, // 2h30min
    // ~2.6 billion km
    distance_km: 2_600_000_000,
    color: '#22C55E', // green
    description: 'Long‑haul deep focus 💚',
  },
  {
    id: 'earth-neptune',
    from: 'Earth',
    to: 'Neptune',
    duration: 180 * 60, // 3 hours
    // ~4.3 billion km
    distance_km: 4_300_000_000,
    color: '#0EA5E9', // deep blue
    description: 'Marathon focus voyage 🌊',
  },
];

if (__DEV__) {
  PLANET_TRIPS.unshift({
    id: 'test-flight',
    from: 'Earth',
    to: 'Mars (test)',
    duration: 1 * 60, // 1 minutes
    distance_km: 6_400,
    color: '#A0AEC0', // soft lunar gray-blue
    description: 'Quick focus test 🌙',
  })
}


export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  }
  return `${minutes}min`;
};

export const formatDistance = (km: number): string => {
  if (km >= 1000000) {
    const millions = (km / 1000000).toFixed(1);
    return `${millions}M km`;
  } else if (km >= 1000) {
    const thousands = Math.round(km / 1000);
    return `${thousands}K km`;
  }
  return `${km} km`;
};
