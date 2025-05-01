export interface LlmService {
  generateResponse(prompt: string): Promise<string>
}
