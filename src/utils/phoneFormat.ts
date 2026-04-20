/**
 * Форматирует ввод телефона — ВСЕГДА даёт +7(...)
 * Фикс тряски: возвращает точно такую же строку, если цифры не изменились.
 */
export function formatPhone(input: string): string {
  // Оставляем только цифры
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  // Нормализуем к 7xxxxxxxxxx:
  //   8... → 7...
  //   7... → без изменений
  //   всё остальное (9,1,2...) → 7 + то что есть
  if (digits[0] === '8') {
    digits = '7' + digits.slice(1);
  } else if (digits[0] !== '7') {
    digits = '7' + digits;
  }

  // Ограничиваем 11 символами (7 + 10 цифр)
  digits = digits.slice(0, 11);

  // Строим отформатированную строку
  let out = '';
  if (digits.length > 0)  out = '+' + digits[0];
  if (digits.length > 1)  out += ' (' + digits.slice(1, 4);
  if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
  if (digits.length >= 8) out += '-' + digits.slice(7, 9);
  if (digits.length >= 10) out += '-' + digits.slice(9, 11);

  return out;
}

/** Убирает всё кроме цифр и +, для API */
export function cleanPhone(formatted: string): string {
  return formatted.replace(/[^\d+]/g, '');
}

/** Проверяет что номер полный: +7 и 10 цифр = 12 символов с + */
export function isPhoneValid(formatted: string): boolean {
  return cleanPhone(formatted).length === 12;
}
