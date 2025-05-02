import { LlmResponse } from "../services/llmService"

export enum MessageType {
  PROMPT = "prompt",
  RESPONSE = "response",
}

export interface Message {
  type: MessageType
  content: string
  tokenSize: number
  timestamp: number
}

export interface Chat {
  id: string
  sessionId: string
  title?: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface ChatRepository {
  getOrCreateSessionId(): string

  createChat(
    sessionId: string,
    initialPrompt?: string,
    response?: LlmResponse,
  ): Promise<string>
  getChat(chatId: string): Promise<Chat | null>
  getUserChats(sessionId: string): Promise<Chat[]>

  addMessagePair(
    chatId: string,
    prompt: string,
    response: LlmResponse,
  ): Promise<void>
}
