import { firebaseRepository } from "../repositories/firebaseRepository"
import { geminiService } from "./geminiLlmService"

export interface ChatService {
  createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, string]>
  sendMessage(chatId: string, prompt: string): Promise<string>
  getChat(chatId: string): Promise<any>
  getUserChats(sessionId: string): Promise<any[]>
}

export class ChatServiceImpl implements ChatService {
  async createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, string]> {
    try {
      let response = ""
      let chatId: string

      if (initialPrompt) {
        response = await geminiService.generateResponse(initialPrompt)
        chatId = await firebaseRepository.createChat(
          sessionId,
          initialPrompt,
          response,
        )
      } else {
        chatId = await firebaseRepository.createChat(sessionId)
      }

      return [chatId, response]
    } catch (error) {
      console.error("Error creating chat:", error)
      throw error
    }
  }

  async sendMessage(chatId: string, prompt: string): Promise<string> {
    try {
      const response = await geminiService.generateResponse(prompt)

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
}

export const chatService = new ChatServiceImpl()
