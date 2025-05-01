import { GoogleGenAI } from "@google/genai"
import { LlmService } from "./llmService"

export class GeminiLlmService implements LlmService {
  private ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error) {
      console.error("Error generating content: ", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiLlmService();
