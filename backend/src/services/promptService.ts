import { LlmService } from "./llmService"

export class PromptService {
  private llmService: LlmService

  constructor(llmService: LlmService) {
    this.llmService = llmService
  }

  async generatePromptResponse(prompt: string): Promise<string> {
    return this.llmService.generateResponse(prompt)
  }
}
