import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

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

interface BookingState {
  bookings: LocalBooking[];
  recentBooking: LocalBooking | null;
  isInitialLoaded: boolean;
  setIsInitialLoaded: (value: boolean) => void;
  resetSession: () => void;
  addBooking: (booking: Omit<LocalBooking, 'id'>) => void;
  removeBooking: (id: string) => void;
  loadLocalBookings: () => Promise<void>;
}

const STORAGE_KEY = 'local_bookings';

const persist = (bookings: LocalBooking[]) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
    .catch(e => logger.error('useBookingStore', 'persist failed', e));

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings:        [],
  recentBooking:   null,
  isInitialLoaded: false,

  setIsInitialLoaded: (value) => set({ isInitialLoaded: value }),

  resetSession: () => set({ isInitialLoaded: false, bookings: [], recentBooking: null }),

  addBooking: (booking) => {
    const id  = `${booking.cafeId}_${booking.pcName}_${booking.startDate}_${booking.startTime}`;
    const newBooking: LocalBooking = { ...booking, id };
    const now    = Date.now();
    const fresh  = get().bookings.filter(b => b.timestamp + b.mins * 60000 > now && b.id !== id);
    const updated = [newBooking, ...fresh];
    set({ bookings: updated, recentBooking: newBooking });
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
}));
