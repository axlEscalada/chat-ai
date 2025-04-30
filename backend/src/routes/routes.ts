import express, { Request, Response, NextFunction } from "express"
import { chatController } from "./chatController"

const router = express.Router()

const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`)

  console.log(`[DEBUG] Headers:`, req.headers)

  if (req.method !== "GET") {
    console.log(`[DEBUG] Body:`, req.body)
  }

  res.on("finish", () => {
    console.log(`[DEBUG] Response sent: Status ${res.statusCode}`)
  })

  next()
}

router.use(debugMiddleware)

router.post("/chats", chatController.createChat)
router.post("/chats/message", chatController.sendMessage)
router.get("/chats/:chatId", chatController.getChat)
router.get("/sessions/:sessionId/chats", chatController.getUserChats)

router.get("/api-debug", (req: Request, res: Response) => {
  res.json({
    message: "API debug endpoint",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
  })
})

router.options("*", (_: Request, res: Response) => {
  res.status(200).end()
})

export default router
