/** «15122000» → «15.12.2000» по мере ввода */
export function formatBirthday(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** «15.12.2000» → «2000-12-15» (формат сервера) */
export function birthdayToServer(display: string): string {
  const parts = display.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return display;
}

/** «2000-12-15» → «15.12.2000» (для отображения) */
export function birthdayToDisplay(server: string): string {
  if (!server || server === '0000-00-00') return '';
  const parts = server.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return server;
}

/** «+79001234567» → «+7900•••••••» */
export function maskPhone(phone: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return phone.slice(0, 6) + '•'.repeat(Math.max(0, phone.length - 6));
}
