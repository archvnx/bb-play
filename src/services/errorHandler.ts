import { Alert } from 'react-native';


export function handleApiError(code: number, message?: string) {
  let userMessage = '';

  switch (code) {
    case 0:
      
      return;

    case 1:
      userMessage = 'Произошла ошибка на стороне сервера. Попробуйте позже.';
      break;

    case 2:
      userMessage = 'Сервис временно недоступен. Ведутся технические работы.';
      break;


    case 411:
      userMessage = 'Не указан номер телефона.';
      break;
    case 412:
      userMessage = 'Не указан email.';
      break;
    case 413:
      userMessage = 'Отсутствует ID клиента.';
      break;
    case 415:
      userMessage = 'Не указана валюта.';
      break;
    case 416:
      userMessage = 'Не выбран клуб (Empty cafeId).';
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

  
    case 451:
      userMessage = 'Некорректный номер телефона.';
      break;
    case 452:
      userMessage = 'Некорректный адрес электронной почты.';
      break;
    case 453:
      userMessage = 'Некорректный ID клиента.';
      break;
    case 455:
      userMessage = 'Некорректная валюта.';
      break;

    case 600:
      userMessage = 'Выбранное место уже занято на это время (учитывая время на доигровку).';
      break;

    default:
  
      userMessage = message || `Произошла системная ошибка (Код: ${code})`;
      break;
  }


  Alert.alert('Внимание', userMessage);
}