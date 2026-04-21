export interface TimeOption {
  label: string;
  value: string;
}

export interface LabelValueOption<T = string> {
  label: string;
  value: T;
}

// ─── Форматирование ───────────────────────────────────────────────────────────
/** «2024-06-15 18:30» → «15.06.2024» */
export function formatDate(dateStr: string): string {
  const d = dateStr.slice(0, 10).split('-');
  return `${d[2]}.${d[1]}.${d[0]}`;
}

/** «2024-06-15 18:30» → «18:30» */
export function formatTime(dateStr: string): string {
  return dateStr.slice(11, 16);
}

/** Вычисляет время конца брони по startDate + startTime + mins */
export function calcLocalEndTime(startDate: string, startTime: string, mins: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(
    `${startDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
  );
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + mins * 60000);
  const dd   = String(end.getDate()).padStart(2, '0');
  const mo   = String(end.getMonth() + 1).padStart(2, '0');
  const yyyy = end.getFullYear();
  return `${dd}.${mo}.${yyyy} ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

// ─── Текущая дата ─────────────────────────────────────────────────────────────
export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ближайший получасовой слот относительно текущего времени */
export function getNearestBookingTime(): { date: string; time: string } {
  const now      = new Date();
  const mins     = now.getMinutes();
  const nextMins = mins < 30 ? 30 : 60;
  const next     = new Date(now.getTime() + (nextMins - mins) * 60000);
  const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const time = `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

// ─── Варианты для пикеров ─────────────────────────────────────────────────────
export function buildTimeOptions(selectedDate: string): TimeOption[] {
  const options: TimeOption[] = [];
  const now         = new Date();
  const isToday     = selectedDate === getTodayString();
  const currentHour = now.getHours();
  const currentMin  = now.getMinutes();

  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      if (isToday && (h < currentHour || (h === currentHour && m < currentMin))) continue;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      options.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` });
    }
  }
  return options;
}

export function buildDateOptions(): LabelValueOption[] {
  const options: LabelValueOption[] = [];
  const today  = new Date();
  const days   = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label =
      i === 0 ? 'Сегодня'
      : i === 1 ? 'Завтра'
      : `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    options.push({
      label,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
  }
  return options;
}

export function buildDurationOptions(): LabelValueOption<number>[] {
  return [
    { label: '30 мин',   value: 30 },
    { label: '1 час',    value: 60 },
    { label: '2 часа',   value: 120 },
    { label: '3 часа',   value: 180 },
    { label: '4 часа',   value: 240 },
    { label: '5 часов',  value: 300 },
  ];
}
