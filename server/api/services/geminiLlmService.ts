import { GoogleGenAI } from "@google/genai"
import { LlmResponse, LlmService } from "./llmService"

export class GeminiLlmService implements LlmService {
  private ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })

  async generateResponse(prompt: string): Promise<LlmResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
      console.log(response)

      return {
        text: response.text || "",
        promptTokenSize: response.usageMetadata?.promptTokenCount,
        responseTokenSize: response.usageMetadata?.candidatesTokenCount,
      }
    } catch (error) {
      console.error("Error generating content: ", error)
      throw error
    }
  }

  async generateStreamingResponse(
    prompt: string,
    onChunk: (text: string) => void,
    onComplete: (finalResponse: LlmResponse) => void,
    onError: (error: any) => void,
  ): Promise<void> {
    try {
      console.log("Starting streaming response generation")

      const streamingResponse = await this.ai.models.generateContentStream({
        model: "gemini-2.0-flash",
        contents: prompt,
      })

      let completeText = ""

      try {
        for await (const chunk of streamingResponse) {
          if (chunk.text) {
            completeText += chunk.text
            onChunk(chunk.text)
          }
        }

        console.log("Streaming complete, getting token counts")

        try {
          const tokenResponse = await this.ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
          })

          const finalResponse: LlmResponse = {
            text: completeText,
            promptTokenSize: tokenResponse.usageMetadata?.promptTokenCount,
            responseTokenSize:
              tokenResponse.usageMetadata?.candidatesTokenCount,
          }

          console.log("Final response with token counts:", {
            textLength: finalResponse.text.length,
            promptTokenSize: finalResponse.promptTokenSize,
            responseTokenSize: finalResponse.responseTokenSize,
          })

          onComplete(finalResponse)
        } catch (tokenError) {
          console.error("Error getting token counts:", tokenError)

          onComplete({
            text: completeText,
            promptTokenSize: 0,
            responseTokenSize: 0,
          })
        }
      } catch (streamError) {
        console.error("Error processing stream:", streamError)
        onError(streamError)
      }
    } catch (error) {
      console.error("Error initiating stream:", error)
      onError(error)
    }
  }

  async countPromptToken(prompt: string): Promise<number> {
    try {
      console.log(`Prompt for counting ${prompt}`)
      const countTokensResponse = await this.ai.models.countTokens({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
      console.log(countTokensResponse.totalTokens)

      return countTokensResponse.totalTokens || 0
    } catch (error) {
      console.error("Error generating content: ", error)
      throw error
    }
  }
}

export const geminiService = new GeminiLlmService()
