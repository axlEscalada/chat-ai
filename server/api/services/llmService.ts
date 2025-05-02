import { GeminiLlmService } from "./providers/geminiLlmService"
export interface LlmResponse {
  text: string
  promptTokenSize?: number
  responseTokenSize?: number
}

export interface LlmService {
  generateResponse(prompt: string): Promise<LlmResponse>
  countPromptToken(prompt: string): Promise<number>
  generateStreamingResponse(
    prompt: string,
    onChunk: (text: string) => void,
    onComplete: (response: LlmResponse) => void,
    onError: (error: any) => void,
  ): Promise<void>
}

export const llmService = new GeminiLlmService()
