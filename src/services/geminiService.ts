import { UserProfile, SeriesConcept, ContentSeries } from "../types";

const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const fetchGemini = async (endpoint: string, payload: any) => {
  const token = getAuthToken();
  const res = await fetch(`/api/gemini/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errorMsg = 'Failed to fetch from Gemini API';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return res.json();
};

export const generateOptions = async (profile: UserProfile, language: string = 'en'): Promise<SeriesConcept[]> => {
  return fetchGemini('options', { profile, language });
};

export const generateSeries = async (concept: SeriesConcept, profile: UserProfile, language: string = 'en'): Promise<ContentSeries> => {
  return fetchGemini('series', { concept, profile, language });
};

export const generateSeriesChunk = async (
  skeletonDays: any[], 
  profile: UserProfile,
  concept: SeriesConcept,
  language: string = 'en'
): Promise<any[]> => {
  return fetchGemini('series-chunk', { skeletonDays, profile, concept, language });
};

export const generateDayContent = async (
  dayTitle: string, 
  dayDescription: string, 
  profile: UserProfile, 
  seriesHook?: string,
  language: string = 'en'
): Promise<any> => {
  return fetchGemini('day-content', { dayTitle, dayDescription, profile, seriesHook, language });
};

export const refineScript = async (
  baseScript: string, 
  newHook: string, 
  audience?: string, 
  niche?: string,
  language: string = 'en'
): Promise<string> => {
  return fetchGemini('refine-script', { baseScript, newHook, audience, niche, language });
};

export const regenerateDayContentWithIdea = async (
  dayTitle: string,
  dayDescription: string,
  idea: string,
  profile: UserProfile,
  seriesHook?: string,
  language: string = 'en'
): Promise<any> => {
  return fetchGemini('regenerate-day', { dayTitle, dayDescription, idea, profile, seriesHook, language });
};
