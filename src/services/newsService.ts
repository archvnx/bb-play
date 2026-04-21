import axios from 'axios';
import { NEWS_BASE_URL } from '../constants/config';
import { NewsItem } from '../types';

export const getVkNews = async (): Promise<NewsItem[]> => {
  try {
    const response = await axios.get(`${NEWS_BASE_URL}/news`);
    const rawData = response.data;

    if (!Array.isArray(rawData)) {
      if (__DEV__) console.warn('[newsService] Backend returned not an array:', rawData);
      return [];
    }

    return rawData
      .map((item: any): NewsItem => ({
        id: item.id,
        text: item.text || '',
        date: item.date,
        images: Array.isArray(item.images) ? item.images : [],
        poll: item.poll ?? undefined,
      }))
      .filter(item => item.text || item.images?.length || item.poll);

  } catch (error: any) {
    if (__DEV__) console.error('[newsService] News fetch error:', error.message);
    return [];
  }
};