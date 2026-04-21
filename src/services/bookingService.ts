import { get, post } from '../api/apiClient';
import {
  ActiveBooking,
  AvailablePcsResponse,
  BookingPayload,
  BookingResult,
  CafeBooking,
  MapArea,
  MapPC,
  PC,
  Price,
  PricesResponse,
  ProductFromApi,
  RoomFromApi,
  RoomsResponse,
  ServerPackage,
  SpecialOffer,
} from '../types';
import { parseDurationFromName, parseName, parseZone } from '../utils/bookingUtils';

// ─── Клубы ────────────────────────────────────────────────────────────────────
export const fetchClubsForBooking = async (): Promise<CafeBooking[]> => {
  const data = await get<CafeBooking[]>('/cafes');
  const raw  = Array.isArray(data) ? data : [];
  return raw.map(c => ({ address: c.address, icafe_id: String(c.icafe_id) }));
};

// ─── Цены ─────────────────────────────────────────────────────────────────────
export const fetchPrices = async (cafeId: string | number, memberId: string): Promise<Price[]> => {
  const data = await get<PricesResponse>('/all-prices-icafe', { cafeId, memberId });
  return Array.isArray(data?.prices) ? data.prices : [];
};

// ─── Продукты (внутренняя функция) ────────────────────────────────────────────
const extractProducts = (data: unknown): ProductFromApi[] => {
  if (Array.isArray(data)) return data as ProductFromApi[];
  const d     = data as Record<string, unknown>;
  const items = d?.items ?? d?.products ?? d?.data;
  return Array.isArray(items) ? (items as ProductFromApi[]) : [];
};

/** Загружает сырые продукты для клуба, дедуплицируя по product_id */
const fetchRawProducts = async (cafeId: string | number): Promise<ProductFromApi[]> => {
  const data   = await get<unknown>(`/api/v2/cafe/${cafeId}/products`);
  const raw    = extractProducts(data);
  const seen   = new Set<string>();
  return raw.filter(p => {
    const id = String(p.product_id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).filter(p => p.product_enable_client !== 0);
};

/** Пакеты для экрана бронирования (шаг «параметры») */
export const fetchServerPackages = async (cafeId: string | number): Promise<ServerPackage[]> => {
  const unique = await fetchRawProducts(cafeId);

  const parsed: ServerPackage[] = unique
    .map(p => {
      const label        = parseName(p.product_name ?? '');
      const zone         = parseZone(p.product_name ?? '');
      const value        = parseDurationFromName(label);
      const price        = parseFloat(String(p.product_cost ?? p.product_price ?? '0'));
      const pricePerHour = value > 0 ? Math.round(price / (value / 60)) : 0;
      return { id: String(p.product_id), label, zone, value, price, pricePerHour, highlight: false };
    })
    .filter(p => p.value > 0 && p.price > 0)
    .sort((a, b) => a.value - b.value || a.zone.localeCompare(b.zone));

  if (parsed.length > 0) parsed[parsed.length - 1].highlight = true;
  return parsed;
};

/** Спецпредложения для главного экрана */
export const fetchSpecialOffers = async (cafeId: string | number): Promise<SpecialOffer[]> => {
  const unique = await fetchRawProducts(cafeId);

  return unique
    .map((p, idx) => {
      const rawName      = p.product_name ?? '';
      const name         = parseName(rawName);
      const zone         = parseZone(rawName);
      const durationMins = parseDurationFromName(name);
      const totalPrice   = parseFloat(String(p.product_cost ?? p.product_price ?? '0'));
      const pricePerHour = durationMins > 0 ? Math.round(totalPrice / (durationMins / 60)) : 0;
      return {
        product_id:    p.product_id != null ? String(p.product_id) : `idx_${idx}`,
        product_name:  name,
        total_price:   String(totalPrice),
        duration:      String(durationMins),
        group_name:    zone,
        price_per_hour: pricePerHour,
      } satisfies SpecialOffer;
    })
    .filter(p => Number(p.duration) > 0 && Number(p.total_price) > 0)
    .slice(0, 10);
};

// ─── Структура зала ───────────────────────────────────────────────────────────
export const fetchRooms = async (cafeId: string | number): Promise<RoomFromApi[]> => {
  const data = await get<RoomsResponse>('/struct-rooms-icafe', { cafeId });
  return Array.isArray(data?.rooms) ? data.rooms : [];
};

export const fetchMapData = async (
  cafeId: string | number,
): Promise<{ areas: MapArea[]; pcs: MapPC[] }> => {
  const rooms       = await fetchRooms(cafeId);
  const PC_BOX_SIZE = 50;

  const areas: MapArea[] = rooms.map(r => ({
    area_name:         r.area_name,
    area_frame_x:      r.area_frame_x      ?? 0,
    area_frame_y:      r.area_frame_y      ?? 0,
    area_frame_width:  r.area_frame_width  ?? 120,
    area_frame_height: r.area_frame_height ?? 120,
    color_border:      r.color_border      ?? '#FFFFFF33',
    color_text:        r.color_text        ?? '#FFFFFF99',
  }));

  const pcs: MapPC[] = rooms.flatMap(room =>
    (room.pcs_list ?? []).map(pc => {
      const relX     = pc.pc_box_left ?? 0;
      const relY     = pc.pc_box_top  ?? 0;
      const zoneW    = room.area_frame_width  ?? 120;
      const zoneH    = room.area_frame_height ?? 120;
      const clampedX = Math.max(0, Math.min(relX, zoneW - PC_BOX_SIZE));
      const clampedY = Math.max(0, Math.min(relY, zoneH - PC_BOX_SIZE));
      return {
        pc_name:   pc.pc_name,
        area_name: room.area_name,
        pos_x:     (room.area_frame_x ?? 0) + clampedX,
        pos_y:     (room.area_frame_y ?? 0) + clampedY,
      };
    }),
  );

  return { areas, pcs };
};

// ─── Доступные ПК ─────────────────────────────────────────────────────────────
export const fetchAvailablePcs = async (
  cafeId: string | number,
  date: string,
  time: string,
  mins: number,
  priceName?: string,
): Promise<PC[]> => {
  const params: Record<string, unknown> = {
    cafeId,
    dateStart:    date,
    timeStart:    time,
    mins,
    isFindWindow: true,
  };
  if (priceName) params.priceName = priceName;
  const data = await get<AvailablePcsResponse>('/available-pcs-for-booking', params);
  return Array.isArray(data?.pc_list) ? data.pc_list : [];
};

// ─── Создание брони ───────────────────────────────────────────────────────────
export const createBooking = async (payload: BookingPayload): Promise<BookingResult> =>
  post<BookingResult>('/booking', payload as unknown as Record<string, unknown>);

// ─── Активные брони ───────────────────────────────────────────────────────────
export const getActiveBookings = async (memberAccount: string): Promise<ActiveBooking[]> => {
  const data = await get<unknown>('/all-books-cafes', { memberAccount });

  const all: ActiveBooking[] = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.values(data as Record<string, unknown>).forEach(arr => {
      if (Array.isArray(arr)) all.push(...(arr as ActiveBooking[]));
    });
  } else if (Array.isArray(data)) {
    all.push(...(data as ActiveBooking[]));
  }

  const now = new Date();
  return all.filter(b => {
    const end = b.product_available_date_local_to
      ? new Date(b.product_available_date_local_to.replace(' ', 'T'))
      : null;
    return end ? end > now : true;
  });
};
