// ─── Колесо фортуны ───────────────────────────────────────────────────────────
export type PrizeType = 'free_mins' | 'topup_bonus' | 'booking_discount' | 'nothing';

export interface WheelSector {
  label: string;
  emoji: string;
  type:  PrizeType;
  value: number;
}

export interface WheelStatus {
  canSpin:    boolean;
  nextSpinAt: string | null;
  lastPrize:  { type: PrizeType; value: number; code: string | null } | null;
  sectors:    WheelSector[];
}

export interface SpinResult {
  prizeType:   PrizeType;
  prizeValue:  number;
  prizeLabel:  string;
  prizeEmoji:  string;
  promoCode:   string | null;
  sectorIndex: number;
}

// ─── Стрик ────────────────────────────────────────────────────────────────────
export interface StreakTier {
  days:     number;
  discount: number;
}

export interface StreakInfo {
  currentStreak:    number;
  longestStreak:    number;
  discountPct:      number;
  nextTierDays:     number | null;
  nextTierDiscount: number | null;
  lastBookingDate:  string | null;
  tiers:            StreakTier[];
}

// ─── Промокоды ────────────────────────────────────────────────────────────────
export interface PromoCode {
  id:         number;
  code:       string;
  prizeType:  PrizeType;
  prizeValue: number;
  prizeLabel: string;
  prizeUnit:  string;
  expiresAt:  string;
  createdAt:  string;
}

// ─── Статистика ───────────────────────────────────────────────────────────────
export interface BookingStats {
  totalBookings:     number;
  totalHours:        string;
  totalSpent:        string;
  favoriteZone:      string;
  favoritePc:        string;
  bookingsThisMonth: number;
  memberSince:       string | null;
}

// ─── История броней ───────────────────────────────────────────────────────────
export interface BookingHistoryItem {
  id:            number;
  memberId:      string;
  memberAccount: string | null;
  icafeId:       string;
  cafeAddress:   string | null;
  pcName:        string;
  zone:          string | null;
  startDate:     string;
  startTime:     string;
  durationMins:  number;
  cost:          string | null;
  bookedAt:      string;
}

// ─── Зоны ─────────────────────────────────────────────────────────────────────
export interface ZoneLayout {
  zoneName:    string;
  x:           number;
  y:           number;
  w:           number;
  h:           number;
  perRow:      number;
  colorBorder: string | null;
  colorFill:   string | null;
  colorText:   string | null;
}