export interface Message {
  text: string
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

interface ChatResponse {
  chatId: string
  response?: string
  [key: string]: any
}

const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:3001'

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
      `${API_URL}/chats/message`,
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

export const clearMessageHistory = (): boolean => {
  try {
    localStorage.removeItem("activeChatId")
    console.log("Cleared active chat ID")
    return true
  } catch (error) {
    console.error("Error clearing message history:", error)
    return false
  }
}
