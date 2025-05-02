import express from "express"
import { chatController } from "./chatController"

const router = express.Router()

router.post("/chats", chatController.createChat)
router.get("/chats/:chatId", chatController.getChat)

router.post("/prompt", chatController.sendMessage)
router.post("/prompt/stream", chatController.streamMessage)
router.post("/prompt/tokens", chatController.countPromptTokens)

router.get("/sessions/:sessionId/chats", chatController.getUserChats)

export default router
