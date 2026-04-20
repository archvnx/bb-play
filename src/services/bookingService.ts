import { get, post } from '../api/apiClient';

export interface BookingPayload {
  icafe_id: number;
  pc_name: string;
  member_account: string;
  member_id: string;
  start_date: string;
  start_time: string;
  mins: number;
  rand_key: string;
  key: string;
  is_check_booking_pc?: boolean;
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

export const createBooking = async (payload: BookingPayload) => {
  return post('/booking', payload);
};

export const getActiveBookings = async (memberAccount: string): Promise<ActiveBooking[]> => {
  const data = await get<any>('/all-books-cafes');

  const all: ActiveBooking[] = [];
  if (typeof data === 'object' && !Array.isArray(data)) {
    Object.values(data).forEach((arr: any) => {
      if (Array.isArray(arr)) all.push(...arr);
    });
  } else if (Array.isArray(data)) {
    all.push(...data);
  }

  const now = new Date();
  return all.filter((b) => {
    if (b.member_account !== memberAccount) return false;
    const end = b.product_available_date_local_to
      ? new Date(b.product_available_date_local_to.replace(' ', 'T'))
      : null;
    return end ? end > now : true;
  });
};
