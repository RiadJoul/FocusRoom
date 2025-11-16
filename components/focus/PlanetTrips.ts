export interface PlanetTrip {
  id: string;
  from: string;
  to: string;
  duration: number; // in seconds
  distance_km: number; // distance in kilometers
  color: string;
  description: string;
}

export const PLANET_TRIPS: PlanetTrip[] = [
  {
    id: 'earth-moon',
    from: 'Earth',
    to: 'Moon',
    duration: 25 * 60, // 25 minutes
    distance_km: 384_400,
    color: '#A0AEC0', // soft lunar gray-blue
    description: 'Quick focus boost 🌙',
  },
  {
    id: 'earth-mars',
    from: 'Earth',
    to: 'Mars',
    duration: 45 * 60, // 45 minutes
    distance_km: 225_000_000,
    color: '#FF6B6B', // warm coral red
    description: 'Standard focus flight 🔥',
  },
  {
    id: 'earth-jupiter',
    from: 'Earth',
    to: 'Jupiter',
    duration: 80 * 60, // 1h20min
    distance_km: 628_000_000,
    color: '#F5A623', // golden amber
    description: 'Deep work orbit 🪐',
  },
  {
    id: 'earth-saturn',
    from: 'Earth',
    to: 'Saturn',
    duration: 120 * 60, // 2 hours
    distance_km: 1_200_000_000,
    color: '#00B7FF', // soft lilac ring color
    description: 'Extended flow mission 💫',
  },
];


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
