import { get } from '../api/apiClient';
import { Club } from '../types';

export const fetchClubs = async (): Promise<Club[]> => {
  return get<Club[]>('/cafes');
};
