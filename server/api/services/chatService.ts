import { firebaseRepository } from "../repositories/firebaseRepository"
import { LlmResponse, llmService } from "./llmService"

export interface ChatService {
  createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, LlmResponse]>
  sendMessage(chatId: string, prompt: string): Promise<LlmResponse>
  getChat(chatId: string): Promise<any>
  getUserChats(sessionId: string): Promise<any[]>
  countPromptTokens(prompt: string): Promise<number>
}

export class ChatServiceImpl implements ChatService {
  async createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, LlmResponse]> {
    try {
      let response: LlmResponse = { text: "" }
      let chatId: string

      if (initialPrompt) {
        response = await llmService.generateResponse(initialPrompt)
        chatId = await firebaseRepository.createChat(
          sessionId,
          initialPrompt,
          response,
        )
      } else {
        chatId = await firebaseRepository.createChat(sessionId)
      }

      console.log(`Response create chat ${response}`)

      return [chatId, response]
    } catch (error) {
      console.error("Error creating chat:", error)
      throw error
    }
  }

  async sendMessage(chatId: string, prompt: string): Promise<LlmResponse> {
    try {
      const response = await llmService.generateResponse(prompt)

      await firebaseRepository.addMessagePair(chatId, prompt, response)

      console.log(`Message pair added to chat ${chatId}`)
      console.log(`Prompt: ${prompt}`)
      console.log(`Response: ${response}`)

      return response
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  async getChat(chatId: string): Promise<any> {
    return firebaseRepository.getChat(chatId)
  }

  async getUserChats(sessionId: string): Promise<any[]> {
    return firebaseRepository.getUserChats(sessionId)
  }

  async countPromptTokens(prompt: string): Promise<number> {
    return llmService.countPromptToken(prompt)
  }
}

export const chatService = new ChatServiceImpl()
