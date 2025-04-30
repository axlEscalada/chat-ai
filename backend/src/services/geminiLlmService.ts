import { GoogleGenAI } from "@google/genai"
import { LlmService } from "./llmService"

export class GeminiLlmService implements LlmService {
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY })

  async generateResponse(prompt: string): Promise<string> {
    console.log(`API KEY ${process.env.API_KEY}`)
    try {
      console.log(`PROMPT ${prompt}`)
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
      console.log(response.text)

      return response.text || ""
    } catch (error) {
      console.error("Error generating content: ", error)
      throw error
    }
  }
}
