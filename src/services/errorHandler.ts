import { Alert } from 'react-native';

// Защита от дублирующихся алертов
// Флаг сбрасывается как при нажатии ОК, так и через таймаут (на случай закрытия
// алерта системным жестом на iOS без нажатия кнопки).
const ALERT_TIMEOUT_MS = 5000;
let isAlertShowing = false;
let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;

function setAlertShowing(value: boolean) {
  isAlertShowing = value;
  if (alertTimeoutId) clearTimeout(alertTimeoutId);
  if (value) {
    alertTimeoutId = setTimeout(() => { isAlertShowing = false; }, ALERT_TIMEOUT_MS);
  }
}

export function handleApiError(code: number, message?: string) {
  let userMessage = '';

  switch (code) {
    // ─── Успех ────────────────────────────────────────────────────────────────
    case 0:
      return;

    // ─── Общие ошибки ─────────────────────────────────────────────────────────
    case 1:
      userMessage = 'Произошла ошибка на стороне сервера. Попробуйте позже.';
      break;
    case 2:
      userMessage = 'Сервис временно недоступен. Ведутся технические работы.';
      break;

    // ─── 41x — Пустые параметры ───────────────────────────────────────────────
    case 411:
      userMessage = 'Не указан номер телефона.';
      break;
    // Примечание: код 412 намеренно исключён отсюда — он используется как сигнал
    // верификации SMS в apiClient.ts и обрабатывается в authService напрямую.
    // Если 412 всё же попадёт сюда, он уйдёт в default с оригинальным message.
    case 413:
      userMessage = 'Отсутствует ID клиента.';
      break;
    case 414:
      userMessage = 'Не указано значение параметра.';
      break;
    case 415:
      userMessage = 'Не указана валюта.';
      break;
    case 416:
      userMessage = 'Не выбран клуб.';
      break;
    case 417:
      userMessage = 'Не выбрана дата начала бронирования.';
      break;
    case 418:
      userMessage = 'Не выбрано время начала бронирования.';
      break;
    case 419:
      userMessage = 'Не указана длительность бронирования.';
      break;

    // ─── 45x — Некорректные параметры ─────────────────────────────────────────
    case 451:
      userMessage = 'Некорректный номер телефона.';
      break;
    case 452:
      userMessage = 'Некорректный адрес электронной почты.';
      break;
    case 453:
      userMessage = 'Некорректный ID клиента.';
      break;
    case 454:
      userMessage = 'Некорректное значение параметра.';
      break;
    case 455:
      userMessage = 'Некорректная валюта.';
      break;

    // ─── Бронирование ─────────────────────────────────────────────────────────
    case 600:
      userMessage = 'Выбранное место уже занято на это время. Выберите другой ПК или время.';
      break;

    // ─── Неизвестная ошибка ───────────────────────────────────────────────────
    default:
      userMessage = message || `Произошла системная ошибка (Код: ${code})`;
      break;
  }

  if (isAlertShowing) return;
  setAlertShowing(true);

  Alert.alert('Внимание', userMessage, [
    { text: 'ОК', onPress: () => { setAlertShowing(false); } },
  ]);
}