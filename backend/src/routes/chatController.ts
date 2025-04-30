import { Request, Response } from "express"
import { chatService } from "../services/chatService"

export class ChatController {
  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, initialPrompt } = req.body

      if (!sessionId) {
        res.status(400).json({ error: "Session ID is required" })
        return
      }

      const [chatId, response] = await chatService.createChat(sessionId, initialPrompt)

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
}

export const chatController = new ChatController()
