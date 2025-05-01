import express from "express"
import { chatController } from "./chatController"

const router = express.Router()

router.post("/chats", chatController.createChat)
router.post("/chats/message", chatController.sendMessage)
router.get("/chats/:chatId", chatController.getChat)
router.get("/sessions/:sessionId/chats", chatController.getUserChats)
router.get("/chat/countTokens", chatController.countPromptTokens)

export default router
