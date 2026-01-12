import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/userStore';
import { formatDistance as formatDistanceKm } from '@/components/focus/PlanetTrips';

export type DistanceUnit = 'km' | 'mi';

export const DISTANCE_UNIT_STORAGE_KEY = 'focusroom_distance_unit';

export function useDistanceUnit() {
  const distanceUnit = useUserStore((s) => s.distanceUnit);
  return distanceUnit;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function formatDistanceWithUnit(km: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    const miles = kmToMiles(km);
    if (miles >= 1_000_000) {
      return `${(miles / 1_000_000).toFixed(1)}M mi`;
    }
    if (miles >= 1000) {
      return `${Math.round(miles / 1000)}K mi`;
    }
    return `${Math.round(miles)} mi`;
  }

  // default km formatting reuses existing helper
  return formatDistanceKm(km);
}

export async function loadDistanceUnitPreference() {
  try {
    const stored = await AsyncStorage.getItem(DISTANCE_UNIT_STORAGE_KEY);
    if (stored === 'km' || stored === 'mi') {
      useUserStore.getState().setDistanceUnit(stored);
    }
  } catch {
    // ignore
  }
}

export async function saveDistanceUnitPreference(unit: DistanceUnit) {
  try {
    await AsyncStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, unit);
    useUserStore.getState().setDistanceUnit(unit);
  } catch {
    // ignore
  }
}

