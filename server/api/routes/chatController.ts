import { Request, Response } from "express"
import { chatService, PromptResponse } from "../services/chatService"

const setupSSEHeaders = (res: Response): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
}

const sendSSEEvent = (
  res: Response,
  type: string,
  data: Record<string, any> = {},
): void => {
  res.write(
    `data: ${JSON.stringify({
      type,
      ...data,
    })}\n\n`,
  )
}

const handleStreamError = (
  res: Response,
  error: any,
  logPrefix: string,
): void => {
  console.error(logPrefix, error)

  if (!res.headersSent) {
    res.status(500).json({ error: "Failed to setup streaming" })
  } else {
    sendSSEEvent(res, "error", {
      message: "Error processing stream",
    })
    res.end()
  }
}

export class ChatController {
  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, initialPrompt } = req.body

      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" })
        return
      }

      const [chatId, response] = await chatService.createChat(
        sessionId,
        initialPrompt,
      )

      res.status(201).json({ chatId, response })
    } catch (error) {
      console.error("Error creating chat:", error)
      res.status(500).json({ error: "Failed to create chat" })
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, prompt } = req.body

      if (!chatId || !prompt) {
        res.status(400).json({ error: "Chat ID and prompt are required" })
        return
      }

      const response = await chatService.sendMessage(chatId, prompt)

      res.status(200).json({ response })
    } catch (error) {
      console.error("Error sending message:", error)
      res.status(500).json({ error: "Failed to send message" })
    }
  }

  async streamMessage(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, createChat, sessionId, chatId = undefined } = req.body

      if (!chatId && !prompt) {
        res.status(400).json({ error: "Chat ID and prompt are required" })
        return
      }

      setupSSEHeaders(res)
      sendSSEEvent(res, "connection_established")

      const streamCallbacks = {
        onChunk: (text: string) => {
          sendSSEEvent(res, "content_chunk", { text })
        },

        onComplete: (response: PromptResponse) => {
          sendSSEEvent(res, "content_complete", {
            promptTokenSize: response.promptTokenSize,
            responseTokenSize: response.responseTokenSize,
            chatId: response.chatId,
          })

          res.end()
        },

        onError: (error: any) => {
          console.error("Streaming error:", error)

          sendSSEEvent(res, "error", {
            message: error.message || "Unknown error occurred",
          })

          res.end()
        },
      }

      await chatService.streamMessage(
        prompt,
        createChat,
        sessionId,
        streamCallbacks,
        chatId,
      )
    } catch (error) {
      handleStreamError(res, error, "Error in streamMessage controller:")
    }
  }

  async getChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params

      if (!chatId) {
        res.status(400).json({ error: "Chat ID is required" })
        return
      }

      const chat = await chatService.getChat(chatId)

      if (!chat) {
        res.status(404).json({ error: "Chat not found" })
        return
      }

      res.status(200).json(chat)
    } catch (error) {
      console.error("Error getting chat:", error)
      res.status(500).json({ error: "Failed to get chat" })
    }
  }

  async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params

      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" })
        return
      }

      const chats = await chatService.getUserChats(sessionId)

      res.status(200).json(chats)
    } catch (error) {
      console.error("Error getting user chats:", error)
      res.status(500).json({ error: "Failed to get user chats" })
    }
  }

  async countPromptTokens(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body

      const tokenSize = await chatService.countPromptTokens(prompt)

      res.status(200).json(tokenSize)
    } catch (error) {
      console.error("Error getting token size:", error)
      res.status(500).json({ error: "Failed to get token size" })
    }
  }
}

export const chatController = new ChatController()
