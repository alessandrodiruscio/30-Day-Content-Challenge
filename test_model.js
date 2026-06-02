import { GoogleGenAI } from "@google/genai";

const testModel = async (modelName) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    });
    console.log(`Success with ${modelName}`);
  } catch (err) {
    console.error(`Failed with ${modelName}:`, err.message);
  }
};

(async () => {
  await testModel("gemini-3-flash-preview");
  await testModel("gemini-2.5-flash");
})();
