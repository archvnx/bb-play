import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../services/authService';

const AUTH_KEY      = 'bbplay_auth_user';
const AUTH_PASS_KEY = 'bbplay_auth_pass';
const FAVORITE_CLUB_KEY = 'bbplay_favorite_club';

const encodePass = (p: string): string => {
  try { return btoa(unescape(encodeURIComponent(p))); }
  catch { return p; }
};
const decodePass = (p: string): string => {
  try { return decodeURIComponent(escape(atob(p))); }
  catch { return p; }
};

const getBookingStore = () => require('./useBookingStore').useBookingStore.getState();

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  _encodedPass: string | null;
  favoriteClubId: string | null;
  setAuth: (user: User, password?: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  getPassword: () => string | null;
  setFavoriteClub: (clubId: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isRestoring: true,
  _encodedPass: null,
  favoriteClubId: null,

  setAuth: (user, password) => {
    AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user)).catch(() => {});
    const encoded = password ? encodePass(password) : null;
    if (encoded) AsyncStorage.setItem(AUTH_PASS_KEY, encoded).catch(() => {});
    getBookingStore().resetSession();
    set({ user, isLoggedIn: true, _encodedPass: encoded ?? get()._encodedPass });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...partial };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated)).catch(() => {});
      set({ user: updated });
    }
  },

  logout: () => {
    AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
    AsyncStorage.removeItem(AUTH_PASS_KEY).catch(() => {});
    getBookingStore().resetSession();
    set({ user: null, isLoggedIn: false, _encodedPass: null });
  },

  restoreSession: async () => {
    try {
      const raw     = await AsyncStorage.getItem(AUTH_KEY);
      const passRaw = await AsyncStorage.getItem(AUTH_PASS_KEY);
      const favRaw  = await AsyncStorage.getItem(FAVORITE_CLUB_KEY);
      if (raw) {
        const user: User = JSON.parse(raw);
        set({ user, isLoggedIn: true, _encodedPass: passRaw ?? null, favoriteClubId: favRaw ?? null });
      }
    } catch (e) {
    }
    set({ isRestoring: false });
  },

  getPassword: () => {
    const enc = get()._encodedPass;
    if (!enc) return null;
    try { return decodePass(enc); } catch { return null; }
  },

  setFavoriteClub: (clubId) => {
    if (clubId) {
      AsyncStorage.setItem(FAVORITE_CLUB_KEY, clubId).catch(() => {});
    } else {
      AsyncStorage.removeItem(FAVORITE_CLUB_KEY).catch(() => {});
    }
    set({ favoriteClubId: clubId });
  },
}));