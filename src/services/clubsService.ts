import { get } from "../api/apiClient";

export interface Club {
  icafe_id: number;
  address: string;
}

export const fetchClubs = async (): Promise<Club[]> => {
  return get<Club[]>("/cafes");
};