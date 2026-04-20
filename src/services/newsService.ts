import axios from "axios";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface NewsItem {
  id: number;
  text: string;
  date: number;
  images?: string[];
  poll?: {
    question: string;
    answers: Array<{
      text: string;
      rate: number;
    }>;
  };
}

export const getVkNews = async (): Promise<NewsItem[]> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/news`);
    const rawData = response.data;

    if (!Array.isArray(rawData)) {
      console.warn('[newsService] Backend returned not an array:', rawData);
      return [];
    }

    return rawData
      .map((item: any): NewsItem => ({
        id: item.id,
        text: item.text || "",
        date: item.date,
        images: Array.isArray(item.images) ? item.images : [],
        poll: item.poll ?? undefined,
      }))
      .filter(item => item.text || item.images?.length || item.poll);

  } catch (error: any) {
    console.error('[newsService] News fetch error:', error.message);
    return [];
  }
};