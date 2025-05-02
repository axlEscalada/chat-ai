export interface Message {
  text: string
  tokenSize: string
  sender: "user" | "ai" | "system"
  timestamp: string
  isError?: boolean
}

interface ApiResponse {
  response: string
  [key: string]: any
}

interface ErrorResponse {
  error: string
  [key: string]: any
}

export interface LlmResponse {
  text: string
  promptTokenSize?: number
  responseTokenSize?: number
}

interface ChatResponse {
  chatId: string
  response?: LlmResponse
  [key: string]: any
}

export interface StreamEventHandler {
  onChunk: (text: string) => void
  onComplete: (metadata: {
    promptTokenSize?: number
    responseTokenSize?: number
    chatId: string
  }) => void
  onError: (error: string) => void
}

const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://chat-ai-server-axlescalada-axlescaladas-projects.vercel.app"
    : "http://localhost:5000"

const API_TIMEOUT = 60000 // 60 seconds timeout

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT,
): Promise<Response> => {
  const controller = new AbortController()
  const { signal } = controller

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

const safeJsonParse = async (response: Response): Promise<any> => {
  try {
    return await response.json()
  } catch (error) {
    console.error("Error parsing JSON response:", error)
    throw new Error("Failed to parse server response")
  }
}

const getSessionId = (): string => {
  let sessionId = localStorage.getItem("sessionId")
  if (!sessionId) {
    sessionId =
      "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9)
    localStorage.setItem("sessionId", sessionId)
  }
  return sessionId
}

export const createChat = async (
  initialPrompt?: string,
): Promise<ChatResponse> => {
  try {
    console.log(
      "Creating new chat with initial prompt:",
      initialPrompt?.substring(0, 30) +
        (initialPrompt && initialPrompt.length > 30 ? "..." : ""),
    )
    const sessionId = getSessionId()

    const response = await fetchWithTimeout(`${API_URL}/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        sessionId,
        initialPrompt,
      }),
    })

    if (!response.ok) {
      let errorMessage = `Server responded with status: ${response.status}`

      try {
        const errorData = await safeJsonParse(response)
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {}

      throw new Error(errorMessage)
    }

    const data = await safeJsonParse(response)

    console.log("Create chat response full data:", data)

    if (!data.chatId) {
      console.error("Error: API response missing chatId property", data)
      throw new Error("Server response missing chat ID")
    }

    console.log("Using chat ID from server response:", data.chatId)

    return data
  } catch (error) {
    console.error("API Error during chat creation:", error)
    throw error
  }
}

export const sendMessage = async (
  prompt: string,
  chatId: string,
): Promise<ApiResponse> => {
  try {
    console.log(
      `Sending message to chat ${chatId}: "${prompt.substring(0, 30)}${prompt.length > 30 ? "..." : ""}"`,
    )

    if (!chatId) {
      throw new Error("No chat ID provided to sendMessage")
    }

    const response = await fetchWithTimeout(
      `${API_URL}/prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          chatId,
          prompt,
        }),
      },
      API_TIMEOUT,
    )

    if (!response.ok) {
      let errorMessage = `Server responded with status: ${response.status}`

      try {
        const errorData = await safeJsonParse(response)
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {}

      throw new Error(errorMessage)
    }

    const data = await safeJsonParse(response)
    console.log("Message response full data:", data)

    if (!data.hasOwnProperty("response")) {
      console.warn("Response data missing 'response' property:", data)
      return {
        response:
          "I received your message, but the response format was unexpected.",
      }
    }

    return data
  } catch (error: any) {
    console.error("API Error during message sending:", error)

    if (error.message.includes("timed out")) {
      throw new Error(
        "The request took too long to complete. Please try again or ask a simpler question.",
      )
    }

    if (
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network error. Please check your internet connection and try again.",
      )
    }

    throw error
  }
}

export const sendStreamingMessage = async (
  prompt: string,
  createChat: boolean,
  eventHandler: StreamEventHandler,
  chatId?: string,
): Promise<void> => {
  try {
    const sessionId = getSessionId()
    const response = await fetch(`${API_URL}/prompt/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        prompt,
        createChat,
        sessionId,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Server responded with status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let boundaryIndex
      while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
        const message = buffer.substring(0, boundaryIndex)
        buffer = buffer.substring(boundaryIndex + 2)

        if (message.startsWith("data: ")) {
          try {
            const data = JSON.parse(message.substring(6))

            switch (data.type) {
              case "connection_established":
                console.log("Streaming connection established")
                break

              case "content_chunk":
                eventHandler.onChunk(data.text)
                break

              case "content_complete":
                eventHandler.onComplete({
                  promptTokenSize: data.promptTokenSize,
                  responseTokenSize: data.responseTokenSize,
                  chatId: data.chatId,
                })
                return

              case "error":
                eventHandler.onError(data.message || "Unknown streaming error")
                return

              default:
                console.warn("Unknown event type:", data.type)
            }
          } catch (parseError) {
            console.error("Error parsing SSE message:", parseError, message)
            eventHandler.onError("Failed to parse streaming message")
            return
          }
        }
      }
    }

    eventHandler.onError("Stream ended unexpectedly")
  } catch (error: any) {
    console.error("API Error during streaming message:", error)

    if (error.message.includes("timed out")) {
      eventHandler.onError(
        "The request took too long to complete. Please try again or ask a simpler question.",
      )
    } else if (
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    ) {
      eventHandler.onError(
        "Network error. Please check your internet connection and try again.",
      )
    } else {
      eventHandler.onError(error.message || "Unknown error occurred")
    }
  }
}

export const getChat = async (chatId: string): Promise<any> => {
  try {
    console.log(`Fetching chat: ${chatId}`)

    const response = await fetchWithTimeout(`${API_URL}/chats/${chatId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
    })

    if (!response.ok) {
      throw new Error(`Failed to load chat: ${response.status}`)
    }

    const data = await safeJsonParse(response)
    console.log(`Retrieved chat with ${data.messages?.length || 0} messages`)
    return data
  } catch (error) {
    console.error("Error loading chat:", error)
    throw error
  }
}

export const getUserChats = async (): Promise<any[]> => {
  try {
    const sessionId = getSessionId()
    console.log(`Fetching chats for session: ${sessionId}`)

    const response = await fetchWithTimeout(
      `${API_URL}/sessions/${sessionId}/chats`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to load chats: ${response.status}`)
    }

    const chats = await safeJsonParse(response)
    console.log(`Retrieved ${chats.length} chats`)

    if (chats.length > 0) {
      console.log(
        "Chat IDs in getUserChats:",
        chats.map((chat: { id: string }) => chat.id),
      )
    }

    return chats
  } catch (error) {
    console.error("Error loading chats:", error)
    return []
  }
}

export const getTokenCount = async (prompt: string): Promise<string> => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/prompt/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        prompt,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to count tokens")
    }

    return safeJsonParse(response)
  } catch (error) {
    console.error("Error counting tokens:", error)
    return ""
  }
}

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    console.log("Checking server health...")

    const response = await fetchWithTimeout(
      `${API_URL}/health`,
      {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      },
      5000,
    )

    const isHealthy = response.ok
    console.log(`Server health check: ${isHealthy ? "OK" : "Failed"}`)
    return isHealthy
  } catch (error) {
    console.error("Health check failed:", error)
    return false
  }
}
