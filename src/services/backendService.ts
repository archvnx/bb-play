import axios from 'axios';
import { NEWS_BASE_URL } from '../constants/config';
import type {
  BookingHistoryItem, BookingStats, PromoCode, SpinResult,
  StreakInfo, WheelStatus, ZoneLayout,
} from '../types/backend';

const backend = axios.create({
  baseURL: NEWS_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Колесо фортуны ───────────────────────────────────────────────────────────
export const getWheelStatus = (memberId: string) =>
  backend.get<WheelStatus>('/wheel/status', { params: { member_id: memberId } }).then(r => r.data);

export const spinWheel = (memberId: string) =>
  backend.post<SpinResult>('/wheel/spin', { member_id: memberId }).then(r => r.data);

// ─── Стрик ────────────────────────────────────────────────────────────────────
export const getStreak = (memberId: string) =>
  backend.get<StreakInfo>('/streak', { params: { member_id: memberId } }).then(r => r.data);

// ─── Промокоды ────────────────────────────────────────────────────────────────
export const getMyPromoCodes = (memberId: string) =>
  backend.get<PromoCode[]>('/promo/my', { params: { member_id: memberId } }).then(r => r.data);

export const validatePromoCode = (code: string, memberId: string) =>
  backend.post('/promo/validate', { code, member_id: memberId }).then(r => r.data);

// ─── История / статистика ─────────────────────────────────────────────────────
/** Вызывается из useBookingFlow после успешного createBooking */
export const saveBookingToHistory = (payload: {
  member_id:       string;
  member_account?: string;
  icafe_id:        string;
  cafe_address?:   string;
  pc_name:         string;
  start_date:      string;
  start_time:      string;
  duration_mins:   number;
  cost?:           number;
}): Promise<void> =>
  backend.post('/history', payload).then(() => undefined).catch(e => {
    console.warn('[backendService] saveBookingToHistory:', e?.message);
  });

export const getBookingHistory = (memberId: string, page = 1, limit = 20) =>
  backend
    .get<BookingHistoryItem[]>(`/history/${memberId}`, { params: { page, limit } })
    .then(r => r.data);

export const getBookingStats = (memberId: string) =>
  backend.get<BookingStats>(`/history/${memberId}/stats`).then(r => r.data);

// ─── Зоны ─────────────────────────────────────────────────────────────────────
export const getZoneLayouts = (icafeId: string) =>
  backend.get<ZoneLayout[]>(`/zones/${icafeId}`).then(r => r.data);