import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import type { ZoneLayout } from '../types/backend';
import type { MapPC, MapArea } from '../types';

export interface LocalBooking {
  id: string;
  cafeId: string;
  cafeAddress: string;
  pcName: string;
  startDate: string;
  startTime: string;
  mins: number;
  password?: string;
  timestamp: number;
  account?: string;
}

// ─── Кеш схемы зала ──────────────────────────────────────────────────────────
interface MapCache {
  zoneLayouts: ZoneLayout[];
  mapData: MapPC[];
  mapAreas: MapArea[];
}

interface BookingState {
  bookings: LocalBooking[];
  recentBooking: LocalBooking | null;
  isInitialLoaded: boolean;
  hasJustBooked: boolean;

  // ─── Кеш схемы зала (ключ — icafeId) ──────────────────────────────────────
  mapCache: Record<string, MapCache>;

  setIsInitialLoaded: (value: boolean) => void;
  setHasJustBooked: (value: boolean) => void;
  clearJustBookedFlag: () => void;
  resetSession: () => void;
  addBooking: (booking: Omit<LocalBooking, 'id'>) => void;
  removeBooking: (id: string) => void;
  loadLocalBookings: () => Promise<void>;

  // ─── Методы кеша схемы ────────────────────────────────────────────────────
  getMapCache: (icafeId: string) => MapCache | null;
  setMapCache: (icafeId: string, data: MapCache) => void;
  clearMapCache: (icafeId: string) => void;
}

const STORAGE_KEY = 'local_bookings';

const persist = (bookings: LocalBooking[]) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
    .catch(e => logger.error('useBookingStore', 'persist failed', e));

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings:        [],
  recentBooking:   null,
  isInitialLoaded: false,
  hasJustBooked:   false,
  mapCache:        {},

  setIsInitialLoaded: (value) => set({ isInitialLoaded: value }),

  setHasJustBooked: (value) => set({ hasJustBooked: value }),

  clearJustBookedFlag: () => set({ hasJustBooked: false }),

  resetSession: () => set({
    isInitialLoaded: false,
    bookings:        [],
    recentBooking:   null,
    hasJustBooked:   false,
    // mapCache намеренно НЕ сбрасываем — данные схемы зала не зависят от сессии
  }),

  addBooking: (booking) => {
    const id  = `${booking.cafeId}_${booking.pcName}_${booking.startDate}_${booking.startTime}`;
    const newBooking: LocalBooking = { ...booking, id };
    const now    = Date.now();
    const fresh  = get().bookings.filter(b => b.timestamp + b.mins * 60000 > now && b.id !== id);
    const updated = [newBooking, ...fresh];
    set({ bookings: updated, recentBooking: newBooking, hasJustBooked: true });
    persist(updated);
  },

  removeBooking: (id) => {
    const updated = get().bookings.filter(b => b.id !== id);
    set({ bookings: updated, recentBooking: updated[0] ?? null });
    persist(updated);
  },

  loadLocalBookings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all: LocalBooking[] = JSON.parse(raw);
      const now   = Date.now();
      const fresh = all.filter(b => b.timestamp + b.mins * 60000 > now);
      set({ bookings: fresh, recentBooking: fresh[0] ?? null });
      if (fresh.length !== all.length) persist(fresh);
    } catch (e) {
      logger.error('useBookingStore', 'loadLocalBookings failed', e);
    }
  },

  // ─── Кеш схемы ────────────────────────────────────────────────────────────
  getMapCache: (icafeId) => get().mapCache[icafeId] ?? null,

  setMapCache: (icafeId, data) =>
    set(state => ({ mapCache: { ...state.mapCache, [icafeId]: data } })),

  clearMapCache: (icafeId) =>
    set(state => {
      const next = { ...state.mapCache };
      delete next[icafeId];
      return { mapCache: next };
    }),
}));