import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, ContentSeries, SeriesConcept } from "../types";

// Initialize the GoogleGenAI client lazily to ensure it uses the latest API key
const getAI = () => {
  // Try to get the selected API key first (for paid models)
  // Then fallback to the default GEMINI_API_KEY (for free models)
  // We use multiple ways to access the key to handle different environments
  let apiKey = '';
  
  try {
    // 1. Check window.process.env (platform injection)
    const win = window as any;
    if (win.process?.env?.API_KEY) apiKey = win.process.env.API_KEY;
    else if (win.process?.env?.GEMINI_API_KEY) apiKey = win.process.env.GEMINI_API_KEY;
    
    // 2. Check import.meta.env (Vite build-time)
    if (!apiKey) {
      const meta = import.meta as any;
      apiKey = meta.env?.VITE_GEMINI_API_KEY || '';
    }
    
    // 3. Last resort: direct process.env (if not replaced by Vite)
    if (!apiKey) {
      try {
        apiKey = (process as any).env?.API_KEY || (process as any).env?.GEMINI_API_KEY || '';
      } catch (e) {
        // process.env might not exist
      }
    }
  } catch (err) {
    console.warn("Error accessing environment variables:", err);
  }
  
  const isInvalid = !apiKey || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '';
  
  if (isInvalid) {
    console.error("Gemini API Key Missing or Invalid:", { apiKey });
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

async function handleGeminiError(err: any): Promise<never> {
  console.error("Gemini Service Error Details:", err);
  
  // The SDK often returns errors as objects or strings containing JSON
  const errString = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  
  if (
    errString.includes("API key not valid") || 
    errString.includes("API_KEY_INVALID") || 
    errString.includes("400") ||
    errString.includes("INVALID_ARGUMENT")
  ) {
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
