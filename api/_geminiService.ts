import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, SeriesConcept, ContentSeries } from "../src/types.js";

// Initialize Gemini with the platform-provided API key
const getAI = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isRetryable = errorStr.includes('503') || 
                         errorStr.includes('high demand') ||
                         error?.status === 503 || 
                         error?.code === 503 ||
                         error?.message?.includes('503') ||
                         error?.message?.includes('high demand');
      
      if (!isRetryable || i === maxRetries) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, i);
      console.warn(`Gemini API Error (likely 503/High Demand). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

export const generateOptions = async (profile: UserProfile, language: string = 'en'): Promise<SeriesConcept[]> => {
  const ai = getAI();
  const languageInstruction = language === 'es' ? 'Respond completely in Spanish.' : 'Respond in English.';
  
  const prompt = `Generate 3 distinct, highly-specialized Instagram Reels strategy options.
  
  STRICT USER Niche/Topic: "${profile.niche}"
  
  STRICT FOCUS PARAMETERS (MUST INHERIT ALL):
  - Target Audience: ${profile.audience}
  - Products/Offers: ${profile.products}
  - Specific Problems to Solve: ${profile.problems}
  - Required Tone: ${profile.tone}
  - Format/Style: ${profile.contentType}
  - Ultimate CTA: ${profile.primaryCTA}
 
  NEGATIVE CONSTRAINTS:
  - DO NOT provide generic content strategies.
  - DO NOT deviate from the topic: "${profile.niche}".
  - DO NOT suggest hooks or themes that work for "any business".
  - If the niche is "Dog Training", every option MUST be about dogs, trainers, and pet owners.

  OUTPUT REQUIREMENTS:
  1. Each option must have a unique, niche-specific angle.
  2. The "Title" should be catchy but relevant.
  3. The "Description" must clearly detail how this strategy builds authority (MAXIMUM 3 short paragraphs). CRITICAL: You MUST format this field using markdown. Use explicit newline characters (\\n\\n) to separate paragraphs. Use bullet points and bold text for readability instead of a single wall of text. KEEP IT CONCISE.
  4. The "Theme" must be a concise 3-5 word summary of the content pillar.

  ${languageInstruction}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a world-class Instagram Content Architect. Your expertise is in creating hyper-relevant, niche-specific 30-day challenges that convert views into authority.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            theme: { type: Type.STRING },
          },
          required: ["title", "description", "targetAudience", "theme"],
        },
      },
    },
  }));

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text);
};

export const generateSeries = async (concept: SeriesConcept, profile: UserProfile, language: string = 'en'): Promise<ContentSeries> => {
  const ai = getAI();
  const languageInstruction = language === 'es' 
    ? 'Respond completely in Spanish. All hooks, scripts, CTAs, captions, and descriptions must be in Spanish.' 
    : 'Respond in English.';
    
  const prompt = `Create a high-level 30-day Instagram Reel series skeleton plan. 
  
  SELECTED CONCEPT:
  Title: ${concept.title}
  Description: ${concept.description}
  Core Theme: ${concept.theme}

  STRICT USER PARAMETERS:
  Niche/Topic: ${profile.niche}
  Target Audience: ${profile.audience}
  Primary Sales CTA: ${profile.primaryCTA}
  Brand Tone: ${profile.tone}

  REQUIREMENTS:
  1. EVERY SINGLE DAY must provide a unique value proposition for the niche: "${profile.niche}".
  2. For EACH of the 30 days, generate:
     - EXACTLY 3 distinct, high-impact hooks.
     - A concise 1-sentence value statement for the day.
     - A specific CTA for the day.
     - 3 research search terms.
  3. DO NOT generate full scripts or storyboards in this request. This is a skeleton plan.

  ${languageInstruction}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 8192,
      systemInstruction: `You are a world-class Instagram Content Architect. Generate EXACTLY 30 days of high-level plan metadata (Hooks, Value, CTA, SearchTerms). DO NOT generate scripts yet.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          theme: { type: Type.STRING },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                value: { type: Type.STRING },
                cta: { type: Type.STRING },
                searchTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["day", "hooks", "value", "cta", "searchTerms"],
            },
          },
        },
        required: ["title", "description", "targetAudience", "theme", "days"],
      },
    },
  }));

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  
  const skeleton = JSON.parse(text);
  skeleton.days = skeleton.days.map((day: any) => ({
    ...day,
    scripts: ["", "", ""],
    captions: ["", "", ""],
    visuals_list: ["", "", ""],
    caption: "", 
    visuals: "" 
  }));
  
  return skeleton;
};

export const generateSeriesChunk = async (
  skeletonDays: any[], 
  profile: UserProfile, 
  concept: SeriesConcept,
  language: string = 'en'
): Promise<any[]> => {
  const ai = getAI();
  const languageInstruction = language === 'es' ? 'All content must be in Spanish.' : 'All content must be in English.';
  
  const dayStr = skeletonDays.map(d => `Day ${d.day}: ${d.value}`).join(', ');

  const prompt = `Generate 30-day Instagram Reel content.
  FOR EACH DAY, generate content for the 3 hooks provided.
  
  CONTEXT:
  Series: ${concept.theme}
  Niche: ${profile.niche}
  Target: ${profile.audience}
  Days to generate: [${dayStr}]

  STRUCTURE FOR EACH DAY:
  For each of the 3 hooks, you MUST provide:
  1. A SCRIPT with EXACTLY 7 paragraphs. 
     LENGTH: 160-200 words per script (ensure high detail and deep value).
     MANDATORY: Separate paragraphs with a DOUBLE NEWLINE (\\n\\n). 
     STRUCTURE: Hook, Relate, Transition, Struggle, Lesson, Result, CTA.
     CRITICAL INSTRUCTION FOR RESULT VS CTA: The "Result" paragraph (paragraph 6) MUST ONLY describe the outcome/transformation and MUST NOT contain any questions, invitations, or calls to action. The Call To Action (CTA, paragraph 7) must ONLY be in the 7th and final paragraph. Ensure there is absolutely no overlap between the Result and the CTA.
     The CTA MUST be conversational and natural. e.g., "And if you're interested in [Offer Context], comment the word [KEYWORD] to get the link to [Resource/Offer]." (Offer: ${profile.primaryCTA || "your resource"}).
     CRITICAL INSTRUCTION FOR CTA KEYWORD: You must invent ONE single, simple, uppercase keyword (e.g., "JOIN", "GROWTH", "LINKS", "MASTERCLASS") related to the offer and use this EXACT SAME keyword consistently in the CTA of EVERY single script you generate. Do not change the keyword across different days or hooks.
     NO LABELS (like "Hook:" or "1."). Just the raw text.
  2. A STORYBOARD with EXACTLY 7 lines (one creator action per script section). 
     MANDATORY: Separate with a SINGLE NEWLINE.
  3. A CAPTION for the post.

  Return an array where each object has:
  {
    "day": number,
    "scripts": ["script1", "script2", "script3"],
    "visuals": ["storyboard1", "storyboard2", "storyboard3"],
    "captions": ["caption1", "caption2", "caption3"]
  }

  ${languageInstruction}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a Content Strategist. For every day, you MUST return 3 scripts (each with 7 paragraphs separated by \\n\\n) and 3 storyboard strings (each with 7 lines).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER },
            scripts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 scripts (matched to hooks)" },
            visuals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 storyboards (matched to hooks)" },
            captions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 3 captions (matched to hooks)" }
          },
          required: ["day", "scripts", "visuals", "captions"]
        }
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("Empty response chunk");
  return JSON.parse(text);
};

export const generateDayContent = async (
  day: any, 
  profile: UserProfile, 
  concept: SeriesConcept,
  hookIndex: number = 0,
  language: string = 'en'
): Promise<{ script: string; visuals: string; caption: string }> => {
  const ai = getAI();
  const languageInstruction = language === 'es' ? 'All content must be in Spanish.' : 'All content must be in English.';
  const selectedHook = day.hooks[hookIndex] || day.hooks[0];

  const prompt = `Create the full Plan (Script, Storyboard, and Caption) for Day ${day.day} of a 30-day challenge.
  
  CONTEXT:
  Series Theme: ${concept.theme}
  Niche: ${profile.niche}
  Target: ${profile.audience}
  Day Goal: ${day.value}
  SELECTED HOOK: "${selectedHook}"

  REQUIREMENTS:
  1. SCRIPT: 7-part structure (Hook, Relate, Transition, Struggle, Lesson, Result, CTA).
     LENGTH: 160-200 words (deep dive into the topic).
     MANDATORY: Separate paragraphs with a DOUBLE NEWLINE (\\n\\n). 
     CRITICAL INSTRUCTION FOR RESULT VS CTA: The "Result" paragraph (paragraph 6) MUST ONLY describe the outcome/transformation and MUST NOT contain any questions, invitations, or calls to action. The Call To Action (CTA, paragraph 7) must ONLY be in the 7th and final paragraph. Ensure there is absolutely no overlap between the Result and the CTA.
     The CTA MUST be conversational and natural. e.g., "And if you're interested in [Offer Context], comment the word [KEYWORD] to get the link to [Resource/Offer]." (Offer: ${profile.primaryCTA || "your resource"}).
     CRITICAL INSTRUCTION FOR CTA KEYWORD: You must invent ONE single, simple, uppercase keyword (e.g., "JOIN", "GROWTH", "LINKS", "MASTERCLASS") related to the offer and use this EXACT SAME keyword consistently in the CTA of EVERY single script you generate. Do not change the keyword across different days or hooks.
     DO NOT include labels like 'Hook:'. Just the content.
  2. STORYBOARD: EXACTLY 7 creator actions, separated by single newlines (\\n).
  3. CAPTION: Engaging Instagram caption.

  ${languageInstruction}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a Content Creator. Scripts MUST have 7 paragraphs separated by double newlines. Storyboards MUST have 7 lines.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          visuals: { type: Type.STRING, description: "6 lines of visual directions" },
          caption: { type: Type.STRING }
        },
        required: ["script", "visuals", "caption"]
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text);
};

export const refineScript = async (baseScript: string, newHook: string, audience?: string, niche?: string, language: string = 'en'): Promise<string> => {
  const ai = getAI();
  const languageInstruction = language === 'es' ? 'The refined script must be in Spanish.' : 'The refined script must be in English.';
  
  const prompt = `Rewrite this Instagram Reel script to perfectly align with a new hook while keeping the core value.
    
    BASE SCRIPT: "${baseScript}"
    NEW HOOK: "${newHook}"
    AUDIENCE: "${audience || 'Instagram user'}"
    NICHE/THEME: "${niche || 'General'}"
    
    Maintain 6-part structure: [HOOK] [RELATE] [TRANSITION] [STRUGGLE] [LESSON] [RESULT]. 
    Length: 160-200 words.
    ${languageInstruction}`;
    
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a professional scriptwriter. Provide ONLY the refined script text."
    }
  }));

  return response.text || baseScript;
};

export const regenerateDayContentWithIdea = async (
  dayNumber: number,
  idea: string,
  profile: UserProfile,
  concept: SeriesConcept,
  language: string = 'en'
): Promise<any> => {
  const ai = getAI();
  const languageInstruction = language === 'es' ? 'All content must be in Spanish.' : 'All content must be in English.';
  
  const prompt = `Completely REGENERATE Day ${dayNumber} content for an Instagram Reel challenge based on this SPECIFIC IDEA/PROMPT:
  
  MEMBER'S CORE IDEA: "${idea}"
  
  CONTEXT:
  Series Theme: ${concept.theme}
  Niche/Topic: ${profile.niche}
  Target Audience: ${profile.audience}
  Tone: ${profile.tone}

  REQUIREMENTS:
  1. Generate 3 COMPLETELY NEW HOOKS that align with the member's idea.
  2. For EACH hook, generate a HIGH-DETAIL SCRIPT (160-200 words).
     REQUIREMENTS: EXACTLY 7 paragraphs.
     STRUCTURE: Hook, Relate, Transition, Struggle, Lesson, Result, CTA.
     MANDATORY: Separate paragraphs with a DOUBLE NEWLINE (\\n\\n). 
     CRITICAL INSTRUCTION FOR RESULT VS CTA: The "Result" paragraph (paragraph 6) MUST ONLY describe the outcome/transformation and MUST NOT contain any questions, invitations, or calls to action. The Call To Action (CTA, paragraph 7) must ONLY be in the 7th and final paragraph. Ensure there is absolutely no overlap between the Result and the CTA.
     The CTA MUST be conversational and natural. e.g., "And if you're interested in [Offer Context], comment the word [KEYWORD] to get the link to [Resource/Offer]." (Offer: ${profile.primaryCTA || "your resource"}).
     CRITICAL INSTRUCTION FOR CTA KEYWORD: You must use the EXACT SAME keyword for the CTA consistently.
     NO LABELS (like "Hook:" or "1."). Just the raw text.
  3. For EACH hook, generate a STORYBOARD (exactly 7 lines, one creator action per script section).
     MANDATORY: Separate with a SINGLE NEWLINE.
  4. For EACH hook, generate a CAPTION.
  5. Generate a NEW Value statement, CTA, and Search Terms for the day.

  ${languageInstruction}`;

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a Content Strategist. For every day, you MUST return 3 scripts (each with exactly 7 paragraphs separated by \\n\\n) and 3 storyboard strings (each with exactly 7 lines).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          hooks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 new hooks" },
          value: { type: Type.STRING },
          cta: { type: Type.STRING },
          searchTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
          scripts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 full scripts (160-200 words each)" },
          visuals_list: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 storyboards (6 lines each)" },
          captions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 captions" }
        },
        required: ["day", "hooks", "value", "cta", "searchTerms", "scripts", "visuals_list", "captions"]
      }
    }
  }));

  const text = response.text;
  if (!text) throw new Error("Empty response from AI during regeneration");
  return JSON.parse(text);
};
