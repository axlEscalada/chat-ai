import { GeminiLlmService } from "./geminiLlmService"

export interface LlmResponse {
  text: string
  promptTokenSize?: number
  responseTokenSize?: number
}

export interface LlmService {
  generateResponse(prompt: string): Promise<LlmResponse>
}

export const llmService = new GeminiLlmService()
