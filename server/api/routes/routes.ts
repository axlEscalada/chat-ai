import express from "express"
import { chatController } from "./chatController"

const router = express.Router()

router.post("/chats", chatController.createChat)
router.post("/chats/message", chatController.sendMessage)
router.post("/chat/countTokens", chatController.countPromptTokens)
router.get("/chats/:chatId", chatController.getChat)
router.get("/sessions/:sessionId/chats", chatController.getUserChats)

export default router
