export interface User {
  id: number;
  email: string;
  niche?: string;
  products?: string;
  problems?: string;
  audience?: string;
  tone?: string;
  contentType?: string;
}

export interface SeriesConcept {
  title: string;
  description: string;
  targetAudience: string;
  theme: string;
}

export interface ContentSeries extends SeriesConcept {
  days: ContentDay[];
}

export interface ContentDay {
  day: number;
  hooks: string[];
  scripts: string[];
  selectedHookIndex?: number;
  value: string;
  cta: string;
  caption: string;
  visuals: string;
}

export interface UserProfile {
  niche: string;
  products: string;
  problems: string;
  audience: string;
  tone: string;
  contentType: string;
  startDate?: string;
}

export interface Achievement {
  id: number;
  code: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  unlocked_at?: string;
}
