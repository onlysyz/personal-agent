import { GoogleGenAI, Type } from "@google/genai";
import { DecisionAnalysis, DecisionContext } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const analyzeDecision = async (
  query: string, 
  context: DecisionContext
): Promise<DecisionAnalysis> => {
  const prompt = `
    Analyze the following life decision based on the individual's personal context.
    
    Decision Query: "${query}"
    Core Values: ${context.coreValues.join(", ")}
    Current Goal: "${context.currentGoal}"
    
    Provide a balanced analysis with:
    1. Pros (how it aligns with values/goals)
    2. Cons (potential conflicts or trade-offs)
    3. An Alignment Score (0-100)
    4. A brief summary of the trade-off.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pros: { type: Type.ARRAY, items: { type: Type.STRING } },
          cons: { type: Type.ARRAY, items: { type: Type.STRING } },
          alignment: { type: Type.NUMBER },
          summary: { type: Type.STRING }
        },
        required: ["pros", "cons", "alignment", "summary"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as DecisionAnalysis;
};

export const chatWithAgent = async (
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages,
    config: {
      systemInstruction: "You are the digital representative of Zhang San, a Senior Cloud Architect & DevOps Engineer. You have access to his professional history. Be professional, technical, and helpful. Use his perspective to answer questions about his skills and availability."
    }
  });

  return response.text || "I'm sorry, I couldn't process that.";
};
