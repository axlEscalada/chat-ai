import { GoogleGenAI } from "@google/genai"
import { LlmResponse, LlmService } from "./llmService"

export class GeminiLlmService implements LlmService {
  private ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })

  async generateResponse(prompt: string): Promise<LlmResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
      console.log(response)

      return {
        text: response.text || "",
        promptTokenSize: response.usageMetadata?.promptTokenCount,
        responseTokenSize: response.usageMetadata?.candidatesTokenCount,
      }
    } catch (error) {
      console.error("Error generating content: ", error)
      throw error
    }
  }

  async countPromptToken(prompt: string): Promise<number> {
    try {
      console.log(`Prompt for counting ${prompt}`)
      const countTokensResponse = await this.ai.models.countTokens({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      console.log(countTokensResponse.totalTokens);

      return countTokensResponse.totalTokens || 0
    } catch (error) {
      console.error("Error generating content: ", error)
      throw error
    }
  }
}

export const geminiService = new GeminiLlmService()
