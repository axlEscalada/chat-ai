import express from "express"
import dotenv from "dotenv"
import { GeminiLlmService } from "./services/geminiLlmService"
import { PromptService } from "./services/promptService"
import cors from "cors"

dotenv.config()

const app = express()
const port = 3001

app.use(express.json())

const llmService = new GeminiLlmService()
const promptService = new PromptService(llmService)

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies if needed
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.get("/health", (req, res) => {
  res.send("Welcome to the AI API")
})

app.post("/prompt", async (req, res) => {
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

app.listen(port, () => {
  console.log(`AI API server listening on port ${port}`)
})
