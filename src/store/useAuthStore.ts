import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';
import { User } from '../types';

const AUTH_KEY          = 'bbplay_auth_user';
const FAVORITE_CLUB_KEY = 'bbplay_favorite_club';
const SECURE_PASS_KEY   = 'bbplay_auth_pass';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  favoriteClubId: string | null;
  setAuth: (user: User, password?: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  getPassword: () => Promise<string | null>;
  setFavoriteClub: (clubId: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isRestoring: true,
  favoriteClubId: null,

  setAuth: (user, password) => {
    AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user))
      .catch(e => logger.error('useAuthStore', 'setItem AUTH_KEY failed', e));
    if (password) {
      SecureStore.setItemAsync(SECURE_PASS_KEY, password)
        .catch(e => logger.error('useAuthStore', 'setItemAsync SECURE_PASS_KEY failed', e));
    }
    // Сброс буфера бронирований делается в RootNavigator через подписку на isLoggedIn
    set({ user, isLoggedIn: true });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...partial };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated))
        .catch(e => logger.error('useAuthStore', 'setItem AUTH_KEY (updateUser) failed', e));
      set({ user: updated });
    }
  },

  logout: () => {
    AsyncStorage.removeItem(AUTH_KEY)
      .catch(e => logger.error('useAuthStore', 'removeItem AUTH_KEY failed', e));
    SecureStore.deleteItemAsync(SECURE_PASS_KEY)
      .catch(e => logger.error('useAuthStore', 'deleteItemAsync SECURE_PASS_KEY failed', e));
    // Сброс буфера бронирований делается в RootNavigator через подписку на isLoggedIn
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    try {
      const raw    = await AsyncStorage.getItem(AUTH_KEY);
      const favRaw = await AsyncStorage.getItem(FAVORITE_CLUB_KEY);
      if (raw) {
        const user: User = JSON.parse(raw);
        set({ user, isLoggedIn: true, favoriteClubId: favRaw ?? null });
      }
    } catch (e) {
      logger.error('useAuthStore', 'restoreSession failed', e);
    } finally {
      set({ isRestoring: false });
    }
  },

  getPassword: async () => {
    try {
      return await SecureStore.getItemAsync(SECURE_PASS_KEY);
    } catch {
      return null;
    }
  },

  setFavoriteClub: (clubId) => {
    if (clubId) {
      AsyncStorage.setItem(FAVORITE_CLUB_KEY, clubId)
        .catch(e => logger.error('useAuthStore', 'setItem FAVORITE_CLUB_KEY failed', e));
    } else {
      AsyncStorage.removeItem(FAVORITE_CLUB_KEY)
        .catch(e => logger.error('useAuthStore', 'removeItem FAVORITE_CLUB_KEY failed', e));
    }
    set({ favoriteClubId: clubId });
  },
}));
