import { response } from "express"
import { firebaseRepository } from "../repositories/firebaseRepository"
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
            if(createChat) {
              chatId = await firebaseRepository.createChat(sessionId)
            }
            finalResponse.text = accumulatedText

            if (chatId === undefined) {
              throw new Error(`Chat id not provided`)
            }

            await firebaseRepository.addMessagePair(
              chatId || "",
              prompt,
              finalResponse,
            )

            console.log(`Streaming message pair added to chat ${chatId}`)
            console.log(`Prompt: ${prompt}`)
            console.log(
              `Final response: ${finalResponse.text.substring(0, 100)}...`,
            )

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
