import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  setRecentBooking: (booking: Omit<LocalBooking, 'id'>) => void;
  loadLocalBooking: () => Promise<void>;
}

const STORAGE_KEY = 'local_bookings';

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  recentBooking: null,
  isInitialLoaded: false,

  setIsInitialLoaded: (value) => {
    set({ isInitialLoaded: value });
  },

  resetSession: () => {
    set({ isInitialLoaded: false, bookings: [], recentBooking: null });
  },

  addBooking: (booking) => {
    const id = `${booking.cafeId}_${booking.pcName}_${booking.startDate}_${booking.startTime}`;
    const newBooking: LocalBooking = { ...booking, id };

    const now = Date.now();
    const fresh = get().bookings.filter(
      (b) => b.timestamp + b.mins * 60000 > now && b.id !== id
    );
    const updated = [newBooking, ...fresh];

    set({ bookings: updated, recentBooking: newBooking });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  removeBooking: (id) => {
    const updated = get().bookings.filter((b) => b.id !== id);
    const recent = updated[0] ?? null;
    set({ bookings: updated, recentBooking: recent });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  loadLocalBookings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all: LocalBooking[] = JSON.parse(raw);
        const now = Date.now();
        const fresh = all.filter((b) => b.timestamp + b.mins * 60000 > now);
        set({ bookings: fresh, recentBooking: fresh[0] ?? null });
        if (fresh.length !== all.length) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
        }
      }
    } catch {}
  },

  setRecentBooking: (booking) => {
    get().addBooking(booking);
  },
  loadLocalBooking: async () => {
    await get().loadLocalBookings();
  },
}));