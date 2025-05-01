import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import apiRoutes from "./routes/routes"
import { Request, Response } from "express"

dotenv.config()

const app = express()
const port = 5000
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://chat-ai-frontend-amber.vercel.app"]
      : "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
}

app.use(express.json())
app.use(cors(corsOptions))

app.use(apiRoutes)

app.get("/health", (_: Request, res: Response) => {
  res.send("Welcome to the AI API")
})

app.listen(port, () => {
  console.log(`AI API server listening on port ${port}`)
})

module.exports = app
