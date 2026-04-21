// ─── Пользователь ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  member_id: string;
  account: string;
  member_account: string;
  icafe_id: string;
  balance: string;
  bonus: string;
  first_name: string;
  phone: string;
  email: string;
  birthday: string;
  photo: string;
  points: string;
  discount: string;
}

// ─── Клуб ─────────────────────────────────────────────────────────────────────
export interface Club {
  icafe_id: number;
  address: string;
}

/** Клуб с icafe_id в виде строки (для экрана бронирования) */
export interface CafeBooking {
  icafe_id: string | number;
  address: string;
}

// ─── ПК ───────────────────────────────────────────────────────────────────────
export interface PC {
  pc_name: string;
  pc_area_name: string;
  pc_group_name: string;
  is_using: boolean;
  price_name: string;
}

// ─── Цены ─────────────────────────────────────────────────────────────────────
export interface Price {
  duration: number;
  total_price: string;
  price_name?: string;
  group_name?: string;
}

export interface PricesResponse {
  prices: Price[];
  products: ProductFromApi[];
}

// ─── Карта зала ───────────────────────────────────────────────────────────────
export interface MapPC {
  pc_name: string;
  pos_x: number;
  pos_y: number;
  area_name: string;
}

export interface MapArea {
  area_name: string;
  area_frame_x: number;
  area_frame_y: number;
  area_frame_width: number;
  area_frame_height: number;
  color_border: string;
  color_text: string;
}

export interface PcFromApi {
  pc_name: string;
  pc_box_left?: number;
  pc_box_top?: number;
}

export interface RoomFromApi {
  area_name: string;
  area_frame_x?: number;
  area_frame_y?: number;
  area_frame_width?: number;
  area_frame_height?: number;
  color_border?: string;
  color_text?: string;
  pcs_list?: PcFromApi[];
}

export interface RoomsResponse {
  rooms: RoomFromApi[];
}

export interface AvailablePcsResponse {
  pc_list: PC[];
}

// ─── Бронирование ─────────────────────────────────────────────────────────────
export interface BookingPayload {
  icafe_id: string;
  pc_name: string;
  member_account: string;
  member_id: string;
  start_date: string;
  start_time: string;
  mins: number;
  rand_key: string;
  key: string;
  is_check_booking_pc?: boolean;
  /** ID продукта-пакета; передаётся когда пользователь выбрал пакет вместо обычного тарифа */
  product_id?: string;
  /** Название пакета (product_name до <<<); именно по нему бэкенд определяет ветку пакетного бронирования */
  priceName?: string;
}

export interface BookingResult {
  booking_password?: string;
  booking_cost?: number;
  iCafe_response?: {
    data?: { booking_password?: string; cost?: number };
    message?: string;
  };
  message?: string;
  data?: { booking_password?: string };
}

export interface ActiveBooking {
  product_id: number;
  product_pc_name: string;
  product_available_date_local_from: string;
  product_available_date_local_to: string;
  product_mins: number;
  product_description: string;
  member_offer_id: number;
  member_account: string;
}

// ─── Продукты / пакеты ────────────────────────────────────────────────────────
export interface ProductFromApi {
  product_id: number | string;
  product_name: string;
  product_cost?: string;
  product_price?: string;
  product_enable_client: number;
  /** Длительность пакета в минутах (готовое поле API, не требует парсинга) */
  duration?: number;
  /** Дублирует duration — используем как fallback */
  duration_min?: number;
  /** Итоговая стоимость пакета (готовое поле API) */
  total_price?: string;
  /** Название зоны/группы (готовое поле API, напр. "VIP", "GameZone") */
  group_name?: string;
  /** Отображаемое имя продукта из API */
  show_product_name?: string;
}

export interface SpecialOffer {
  product_id: string;
  product_name: string;
  total_price: string;
  duration: string;
  group_name: string;
  price_per_hour?: number;
}

export interface ServerPackage {
  id: string;
  label: string;
  zone: string;
  value: number;
  price: number;
  pricePerHour: number;
  highlight: boolean;
}

// ─── Новости ──────────────────────────────────────────────────────────────────
export interface NewsItem {
  id: number;
  text: string;
  date: number;
  images?: string[];
  poll?: {
    question: string;
    answers: Array<{ text: string; rate: number }>;
  };
}
