import express from "express"
import { GeminiLlmService } from "../services/geminiLlmService"
import { PromptService } from "../services/promptService"

const router = express.Router()
const llmService = new GeminiLlmService()
const promptService = new PromptService(llmService)

router.post("/prompt", async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== "string") {
      res
        .status(400)
        .json({ error: "Please provide a valid prompt in the request body" })
      return
    }

    const response = await promptService.generatePromptResponse(prompt)

    res.json({ response })
  } catch (error: any) {
    console.error("Error processing request:", error)
    res.status(500).json({
      error: "Failed to generate response",
      message: error.message,
    })
  }
})

export default router
