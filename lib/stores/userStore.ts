import { create } from 'zustand';

type User = any;

type UserStore = {
  user: User | null;
  setUser: (u: User | null) => void;
  clearUser: () => void;
  distanceUnit: 'km' | 'mi';
  setDistanceUnit: (unit: 'km' | 'mi') => void;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  clearUser: () => set({ user: null }),
  distanceUnit: 'km',
  setDistanceUnit: (unit) => set({ distanceUnit: unit }),
}));
