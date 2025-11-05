import { create } from 'zustand';

type User = any;

type UserStore = {
  user: User | null;
  setUser: (u: User | null) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  clearUser: () => set({ user: null }),
}));
