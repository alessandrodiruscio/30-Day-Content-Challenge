import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, ContentSeries, SeriesConcept } from "../types";

// Initialize the GoogleGenAI client lazily to ensure it uses the latest API key
const getAI = () => {
  const win = window as any;
  const placeholders = ['MY_GEMINI_API_KEY', 'YOUR_API_KEY', 'undefined', 'null', ''];
  
  const candidates = [
    win.process?.env?.GEMINI_API_KEY,
    win.process?.env?.AI_KEY,
    win.GEMINI_API_KEY,
    win.API_KEY,
    (import.meta as any).env?.VITE_GEMINI_API_KEY,
    (import.meta as any).env?.VITE_API_KEY,
    "AIzaSyDjOhDL8Ickqu-8vkCN0HrlT0ELFPF3-mU"
  ];

  let apiKey = '';
  for (const cand of candidates) {
    if (!cand || typeof cand !== 'string') continue;
    const clean = cand.trim().replace(/^["']|["']$/g, '');
    if (!placeholders.includes(clean)) {
      apiKey = clean;
      break;
    }
  }
  
  if (!apiKey) {
    console.error("Gemini API Key Missing or Invalid in all candidates");
    throw new Error("API_KEY_MISSING");
  }

  return new GoogleGenAI({ apiKey });
};

async function handleGeminiError(err: any): Promise<never> {
  console.error("Gemini Service Error Details:", err);
  
  let errString = "";
  try {
    errString = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  } catch (e) {
    errString = String(err);
  }
  
  const isInvalidKeyError = 
    errString.includes("API key not valid") || 
    errString.includes("API_KEY_INVALID") ||
    errString.includes("INVALID_ARGUMENT") && errString.includes("API key");

  if (isInvalidKeyError) {
    throw new Error("API_KEY_INVALID");
  }
  
  throw err;
}

export async function generateSeriesOptions(profile: UserProfile): Promise<SeriesConcept[]> {
  try {
    const ai = getAI();
    const prompt = `
      You are an expert Instagram Growth Strategist. 
      Create 3 distinct high-level concepts for a 30-day Instagram Reel series for a creator with the following profile:
      - Niche: ${profile.niche}
      - Products/Services: ${profile.products}
      - Client Problems they solve: ${profile.problems}
      - Target Audience: ${profile.audience}
      - Desired Tone: ${profile.tone}
      - Preferred Content Style: ${profile.contentType}

      IMPORTANT: Each of the 3 options should explore a DIFFERENT "Angle" or "Challenge Type" even within the preferred style. 

      Return only the high-level concepts (Title, Description, Target Audience, and Theme).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a professional content strategist. Always respond with valid JSON matching the requested schema.",
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
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  } catch (err) {
    return handleGeminiError(err);
  }
}

export async function generateFullSeries(concept: SeriesConcept, profile: UserProfile): Promise<ContentSeries> {
  try {
    const ai = getAI();
    const prompt = `
      You are an expert Instagram Growth Strategist. 
      Research the current market trends for the niche "${profile.niche}" and create a detailed 30-day script for the following series concept:
      
      Series Title: ${concept.title}
      Series Theme: ${concept.theme}
      Target Audience: ${profile.audience}
      Tone: ${profile.tone}
      Content Style: ${profile.contentType}

      For EACH of the 30 days, provide:
      1. Three distinct Hooks (First 3 seconds) - different angles (e.g., controversial, question, result-oriented).
      2. Three corresponding Scripts (Exactly what to say, word-for-word) - each script should follow its respective hook.
      3. Visuals/Structure (What should be happening on screen, e.g., "B-roll of coffee", "Text overlay pops up")
      4. A Call to Action (CTA)
      5. A suggested Caption with relevant hashtags.

      Ensure the content is highly engaging, research-backed, and designed to convert.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a professional content strategist. Always respond with valid JSON matching the requested schema. Ensure you generate all 30 days. For each day, provide 3 distinct hooks and 3 corresponding scripts.",
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
                  hooks: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "3 distinct hooks for the day"
                  },
                  scripts: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "3 distinct scripts corresponding to each hook"
                  },
                  value: { type: Type.STRING, description: "A summary of the day's value" },
                  cta: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  visuals: { type: Type.STRING, description: "Visual structure and storyboard" },
                },
                required: ["day", "hooks", "scripts", "value", "cta", "caption", "visuals"],
              },
            },
          },
          required: ["title", "description", "targetAudience", "theme", "days"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  } catch (err) {
    return handleGeminiError(err);
  }
}
