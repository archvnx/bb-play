// ─── Окружение ────────────────────────────────────────────────────────────────
/** Базовый URL основного API (iCafe) */
export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_VIBE ?? '';

/** Базовый URL бэкенда новостей/VK */
export const NEWS_BASE_URL: string = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

if (__DEV__ && !API_BASE_URL)  console.warn('[config] EXPO_PUBLIC_API_VIBE не задан');
if (__DEV__ && !NEWS_BASE_URL) console.warn('[config] EXPO_PUBLIC_BACKEND_URL не задан');

// ─── VK ───────────────────────────────────────────────────────────────────────
/** ID группы ВКонтакте — используется для формирования ссылок на посты */
export const VK_GROUP_ID = 221562447;

// ─── Зоны ПК ──────────────────────────────────────────────────────────────────
/** Маппинг названия зоны из API → внутренний код зоны */
export const ZONE_MAP: Record<string, string> = {
  GameZone: 'GZ',
  BootCamp: 'BC',
  VIP:      'VP',
};

/** Стили зон для экрана бронирования */
export const PKG_ZONE_STYLES: Record<string, { accent: string }> = {
  BC:      { accent: '#9333EA' },
  GZ:      { accent: '#22C55E' },
  VP:      { accent: '#F59E0B' },
  default: { accent: '#FFCC00' },
};

/** Отображаемые названия зон */
export const PKG_ZONE_NAMES: Record<string, string> = {
  BC: 'BC',
  GZ: 'GZ',
  VP: 'VIP',
};

/** Акцентные цвета зон для главного экрана */
export const HOME_ZONE_STYLES: Record<string, { accent: string }> = {
  BC:      { accent: '#ffffff' },
  GZ:      { accent: '#ffffff' },
  VP:      { accent: '#ffffff' },
  default: { accent: '#FFCC00' },
};
