import axios from 'axios';
import { NEWS_BASE_URL } from '../constants/config';
import { NewsItem } from '../types';

interface RawNewsItem {
  id: number;
  text?: string;
  date: number;
  images?: string[];
  poll?: NewsItem['poll'];
}

const newsApi = axios.create({
  baseURL: NEWS_BASE_URL,
  timeout: 10000,
  headers: { 'Accept': 'application/json' },
});

export const getVkNews = async (): Promise<NewsItem[]> => {
  try {
    const { data } = await newsApi.get<RawNewsItem[]>('/news');
    if (!Array.isArray(data)) return [];
    return data
      .map((item): NewsItem => ({
        id:     item.id,
        text:   item.text || '',
        date:   item.date,
        images: Array.isArray(item.images) ? item.images : [],
        poll:   item.poll ?? undefined,
      }))
      .filter(item => item.text || item.images?.length || item.poll);
  } catch {
    return [];
  }
};
