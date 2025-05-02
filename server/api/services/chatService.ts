import { createChatRepository } from "../repositories/repositoryFactory"
import { ChatRepository } from "../repositories/chatRepository"
import { LlmResponse, llmService } from "./llmService"

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete: (response: PromptResponse) => void
  onError: (error: any) => void
}

export interface PromptResponse {
  text: string
  chatId: string
  promptTokenSize?: number
  responseTokenSize?: number
}

export interface ChatService {
  createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, LlmResponse]>
  sendMessage(chatId: string, prompt: string): Promise<LlmResponse>
  streamMessage(
    prompt: string,
    createChat: boolean,
    sessionId: string,
    callbacks: StreamCallbacks,
    chatId?: string,
  ): Promise<void>
  getChat(chatId: string): Promise<any>
  getUserChats(sessionId: string): Promise<any[]>
  countPromptTokens(prompt: string): Promise<number>
}

export class ChatServiceImpl implements ChatService {
  private repository: ChatRepository

  constructor(repository: ChatRepository) {
    this.repository = repository
  }

  async createChat(
    sessionId: string,
    initialPrompt?: string,
  ): Promise<[string, LlmResponse]> {
    try {
      let response: LlmResponse = { text: "" }
      let chatId: string

      if (!initialPrompt) {
        chatId = await this.repository.createChat(sessionId)

        return [chatId, response]
      }

      response = await llmService.generateResponse(initialPrompt)
      chatId = await this.repository.createChat(
        sessionId,
        initialPrompt,
        response,
      )

      return [chatId, response]
    } catch (error) {
      console.error("Error creating chat:", error)
      throw error
    }
  }

  async sendMessage(chatId: string, prompt: string): Promise<LlmResponse> {
    try {
      const response = await llmService.generateResponse(prompt)

      await this.repository.addMessagePair(chatId, prompt, response)

      return response
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  async streamMessage(
    prompt: string,
    createChat: boolean,
    sessionId: string,
    callbacks: StreamCallbacks,
    chatId?: string,
  ): Promise<void> {
    try {
      let accumulatedText = ""

      await llmService.generateStreamingResponse(
        prompt,
        (chunk) => {
          accumulatedText += chunk
          callbacks.onChunk(chunk)
        },
        async (finalResponse) => {
          try {
            finalResponse.text = accumulatedText

            if (createChat) {
              chatId = await this.repository.createChat(
                sessionId,
                prompt,
                finalResponse,
              )
            } else {
              if (chatId === undefined) {
                throw new Error(`Chat id not provided`)
              }

              await this.repository.addMessagePair(
                chatId || "",
                prompt,
                finalResponse,
              )
            }

            callbacks.onComplete({
              text: accumulatedText,
              promptTokenSize: finalResponse.promptTokenSize,
              responseTokenSize: finalResponse.responseTokenSize,
              chatId: chatId,
            })
          } catch (error) {
            console.error("Error saving streamed message:", error)
            callbacks.onError(error)
          }
        },
        (error: Error) => {
          console.error("Error in streaming generation:", error)
          callbacks.onError(error)
        },
      )
    } catch (error) {
      console.error("Error setting up streaming:", error)
      callbacks.onError(error)
    }
  }

  async getChat(chatId: string): Promise<any> {
    return this.repository.getChat(chatId)
  }

  async getUserChats(sessionId: string): Promise<any[]> {
    return this.repository.getUserChats(sessionId)
  }

  async countPromptTokens(prompt: string): Promise<number> {
    return llmService.countPromptToken(prompt)
  }
}

export const createChatService = (): ChatService => {
  const repository = createChatRepository()
  return new ChatServiceImpl(repository)
}

export const chatService = createChatService()
