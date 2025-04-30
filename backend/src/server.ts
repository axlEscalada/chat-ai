import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { GeminiLlmService } from "./services/geminiLlmService"
import { PromptService } from "./services/promptService"
import apiRoutes from "./routes/routes"

dotenv.config()

const llmService = new GeminiLlmService()

const app = express()

const corsOptions = {
  origin:
    process.env.NODE_ENV === "production" ? true : "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
}

app.use(express.json())
app.use(cors(corsOptions))

app.use(apiRoutes)

app.get("/health", (_, res) => {
  res.json({ status: "ok", message: "Welcome to the AI API" })
})

app.get("/debug", (req, res) => {
  res.json({
    message: "Debug endpoint is working",
    method: req.method,
    path: req.path,
    url: req.url,
    headers: req.headers,
    env: process.env.NODE_ENV || "development",
  })
})

if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.log(`AI API server listening on port ${port}`)
  })
} else {
  console.log("Running in production mode - no server started (serverless)")
}

export default app
