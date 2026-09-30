import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/start', '/privacy', '/terms'].map((p) => ({ url: `${APP_URL}${p}`, changeFrequency: 'monthly', priority: p ? 0.5 : 1 }));
}
