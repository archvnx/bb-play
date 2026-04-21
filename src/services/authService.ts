import { get, post, put } from '../api/apiClient';
import { User, CafeBooking } from '../types';
import { logger } from '../utils/logger';

// ─── Внутренние типы API ───────────────────────────────────────────────────────
interface MemberRaw {
  member_id: string | number;
  member_account?: string;
  member_icafe_id?: string | number;
  member_balance?: string;
  member_balance_bonus?: string;
  member_first_name?: string;
  member_phone?: string;
  member_email?: string;
  member_birthday?: string;
  member_photo?: string;
  member_points?: string;
  member_group_discount_rate?: number;
}

interface LoginResponse {
  code?: number;
  message?: string;
  member?: MemberRaw;
}

interface MemberResponse {
  member?: MemberRaw;
  member_id?: string | number;
}

interface RegisterResponse {
  code?: number;
  message?: string;
  member_id?: string | number;
  data?: { member_id?: string | number };
}

// ─── Маппинг ──────────────────────────────────────────────────────────────────
const mapMember = (m: MemberRaw, icafe_id: string): User => ({
  id:             String(m.member_id),
  member_id:      String(m.member_id),
  account:        m.member_account || '',
  member_account: m.member_account || '',
  icafe_id:       String(m.member_icafe_id || icafe_id),
  balance:        String(parseFloat(m.member_balance  ?? '0') || 0),
  bonus:          String(parseFloat(m.member_balance_bonus ?? '0') || 0),
  first_name:     m.member_first_name || '',
  phone:          m.member_phone      || '',
  email:          m.member_email      || '',
  birthday:       m.member_birthday   || '',
  photo:          m.member_photo      || '',
  points:         String(m.member_points ?? '0'),
  discount:       String(m.member_group_discount_rate ?? '0'),
});

// ─── Авторизация ──────────────────────────────────────────────────────────────
export const loginUser = async (username: string, password: string): Promise<User> => {
  const login    = username.toLowerCase().trim();
  const loginRes = await post<LoginResponse>('/login', { member_name: login, password });

  // Коды 3 и 412 с member — успешный вход
  if ((loginRes?.code === 3 || loginRes?.code === 412) && loginRes?.member) {
    const icafeId = String(loginRes.member?.member_icafe_id || '');
    if (!icafeId) throw new Error('Не удалось определить клуб пользователя');
    return mapMember(loginRes.member, icafeId);
  }

  const msg = loginRes?.message ?? '';
  if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid')) {
    throw new Error('Неверный логин или пароль');
  }
  throw new Error(msg || 'Ошибка входа');
};

// ─── Обновление профиля из API ────────────────────────────────────────────────
export const refreshUser = async (memberId: string, cafeId: string): Promise<User> => {
  const response = await get<MemberResponse>(`/api/v2/cafe/${cafeId}/members/${memberId}`);

  const userData: MemberRaw | null =
    response?.member ?? (response?.member_id ? (response as unknown as MemberRaw) : null);
  if (userData) return mapMember(userData, cafeId);

  // Запасной вариант — повторный запрос того же endpoint через логин
  // (не загружаем весь список участников во избежание утечки данных)
  logger.warn('authService', `refreshUser: endpoint returned no member for id=${memberId}, cafeId=${cafeId}`);
  throw new Error(`Пользователь ${memberId} не найден`);
};

// ─── Регистрация ──────────────────────────────────────────────────────────────
export const registerUser = async (
  username: string, password: string, phone: string, email: string, firstName?: string,
): Promise<{ member_id: string; needsVerification: boolean }> => {
  const login = username.toLowerCase().trim();
  let icafe_id = '';
  try {
    const cafes = await get<CafeBooking[]>('/cafes');
    if (Array.isArray(cafes) && cafes.length > 0) icafe_id = String(cafes[0].icafe_id);
  } catch (e) {
    logger.error('authService', 'registerUser: failed to fetch cafes', e);
  }
  if (!icafe_id) throw new Error('Не удалось получить список клубов для регистрации');

  const body: Record<string, unknown> = {
    member_account:    login,
    member_password:   password,
    member_phone:      phone.trim(),
    member_email:      email.trim(),
    member_first_name: firstName?.trim() || login,
  };

  const res        = await post<RegisterResponse>(`/api/v2/cafe/${icafe_id}/members`, body);
  const memberId   = res?.member_id ?? res?.data?.member_id ?? null;
  const needsVerification =
    String(res?.code) === '412' ||
    (res?.message ?? '').toLowerCase().includes('verification');

  return { member_id: memberId ? String(memberId) : '', needsVerification };
};

// ─── SMS верификация ──────────────────────────────────────────────────────────
export const requestSms = async (member_id: string): Promise<void> => {
  await post('/request-sms', { member_id });
};

/** @param code — код из SMS (опционально, зависит от API) */
export const verifySms = async (member_id: string, code?: string): Promise<void> => {
  await post('/verify', { member_id, ...(code ? { code } : {}) });
};

// ─── Обновление профиля ───────────────────────────────────────────────────────
export const updateProfile = async (
  user: User,
  fields: { first_name?: string; phone?: string; email?: string; password?: string; birthday?: string; photo?: string },
): Promise<void> => {
  const body: Record<string, unknown> = {
    member_oauth_platform: 'vibe',
    member_phone:          fields.phone      ?? user.phone,
    member_email:          fields.email      ?? user.email,
    member_first_name:     fields.first_name ?? user.first_name,
    member_birthday:       fields.birthday   ?? user.birthday,
  };
  if (fields.password) body.member_password = fields.password;
  if (fields.photo)    body.member_photo    = fields.photo;
  await put(`/api/v2/cafe/${user.icafe_id}/members/${user.member_id}`, body);
};

// ─── Проверка пароля ──────────────────────────────────────────────────────────
export const verifyPassword = async (username: string, password: string): Promise<boolean> => {
  try { await loginUser(username, password); return true; }
  catch { return false; }
};

// ─── Пополнение баланса (отключено) ──────────────────────────────────────────
/**
 * @deprecated Используйте пополнение через кассу клуба.
 */
export const topupBalance = async (
  _user: User,
  _amount: number,
): Promise<{ newBalance: number; newBonus: number }> => {
  throw new Error('Пополнение баланса через приложение временно недоступно');
};
