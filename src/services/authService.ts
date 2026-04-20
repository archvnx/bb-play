import { get, post, put } from '../api/apiClient';

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

const mapMember = (m: any, icafe_id: string): User => ({
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

export const loginUser = async (username: string, password: string): Promise<User> => {
  const login = username.toLowerCase().trim();
  const loginRes: any = await post('/login', { member_name: login, password });
  
  if (loginRes?.code === 3 && loginRes?.member) {
  const icafeId = String(loginRes.member?.member_icafe_id || '');
  if (!icafeId) throw new Error('Не удалось определить клуб пользователя');
  return mapMember(loginRes.member, icafeId);
}
if (loginRes?.code === 412 && loginRes?.member) {
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

/**
 * ИСПРАВЛЕНО: Теперь запрашиваем конкретного пользователя по ID, 
 * а не ищем в общем списке (где срабатывает лимит 50 записей).
 */
export const refreshUser = async (memberId: string, cafeId: string): Promise<User> => {
  
  // Запрос конкретного ресурса /members/{id}
  const response: any = await get(`/api/v2/cafe/${cafeId}/members/${memberId}`);
  
  // API может вернуть объект пользователя сразу или обернутым в массив/поле member
  const userData = response?.member || (response?.member_id ? response : null);

  if (userData) {
    return mapMember(userData, cafeId);
  }
  
  // Если прямой запрос не удался, пробуем старый метод (поиск в списке), но логируем проблему
  console.warn(`[refreshUser] Прямой запрос не вернул данных, пробуем поиск в списке...`);
  const listResponse: any = await get(`/api/v2/cafe/${cafeId}/members`);
  const members: any[] = listResponse?.members || listResponse?.items || [];
  const found = members.find((m: any) => String(m.member_id) === String(memberId));
  
  if (found) return mapMember(found, cafeId);

  throw new Error(`Пользователь ${memberId} не найден в системе клуба`);
};

export const registerUser = async (
  username: string, password: string, phone: string, email: string, firstName?: string,
): Promise<{ member_id: string; needsVerification: boolean }> => {
  const login = username.toLowerCase().trim();
  let icafe_id = '';
  try {
    const cafes: any = await get('/cafes');
    if (Array.isArray(cafes) && cafes.length > 0) icafe_id = String(cafes[0].icafe_id);
  } catch {}
  if (!icafe_id) throw new Error('Не удалось получить список клубов для регистрации');

  const body = {
    member_account: login, member_password: password, member_phone: phone.trim(),
    member_email: email.trim(), member_first_name: firstName?.trim() || login,
  };

  const res: any = await post(`/api/v2/cafe/${icafe_id}/members`, body);
  const memberId = res?.member_id ?? res?.data?.member_id ?? null;
  const needsVerification = String(res?.code) === '412' || (res?.message ?? '').toLowerCase().includes('verification');

  return { member_id: memberId ? String(memberId) : '', needsVerification };
};

export const requestSms = async (member_id: string): Promise<void> => {
  await post('/request-sms', { member_id });
};

export const verifySms = async (member_id: string): Promise<void> => {
  await post('/verify', { member_id });
};

export const updateProfile = async (
  user: User, fields: { first_name?: string; phone?: string; email?: string; password?: string; birthday?: string; photo?: string },
): Promise<void> => {
  const body: Record<string, any> = {
    member_oauth_platform: 'vibe',
    member_phone:          fields.phone      ?? user.phone,
    member_email:          fields.email      ?? user.email,
    member_first_name:     fields.first_name ?? user.first_name,
    member_birthday:       fields.birthday   ?? user.birthday,
  };
  
  if (fields.password) body.member_password = fields.password;
  if (fields.photo) body.member_photo = fields.photo;

  await put(`/api/v2/cafe/${user.icafe_id}/members/${user.member_id}`, body);
};

export const verifyPassword = async (username: string, password: string): Promise<boolean> => {
  try { await loginUser(username, password); return true; } 
  catch { return false; }
};

export const topupBalance = async (
  user: User,
  amount: number,
): Promise<{ newBalance: number; newBonus: number }> => {
  try {
    await post(`/bbplay/api/proxy.php?endpoint=member-fetch-bonus`, { member_id: user.member_id });
  } catch {}

  await post(`/bbplay/api/proxy.php?endpoint=member-topup`, {
    icafe_id: user.icafe_id,
    member_id: user.member_id,
    amount: amount
  });

  const fresh = await refreshUser(user.member_id, user.icafe_id);
  return { newBalance: parseFloat(fresh.balance), newBonus: parseFloat(fresh.bonus) };
};