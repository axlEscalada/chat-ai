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

const API_URL = "http://localhost:3001"

export const sendMessage = async (prompt: string): Promise<ApiResponse> => {
  try {
    console.log(`Sending request to ${API_URL}/prompt`)

    const response = await fetch(`${API_URL}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "omit",
      body: JSON.stringify({ prompt }),
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      let errorMessage = `Server responded with status: ${response.status}`

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {
        console.error("Could not parse error response:", parseError)
      }

      throw new Error(errorMessage)
    }

    return (await response.json()) as ApiResponse
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
      },
    })

    return response.ok
  } catch (error) {
    console.error("Health check failed:", error)
    return false
  }
}

export const loadMessageHistory = (): Message[] => {
  try {
    const savedMessages = localStorage.getItem("chatMessages")
    return savedMessages ? JSON.parse(savedMessages) : []
  } catch (error) {
    console.error("Error loading message history:", error)
    return []
  }
}

export const saveMessageHistory = async (
  messages: Message[],
): Promise<{ success: boolean; error?: any }> => {
  try {
    localStorage.setItem("chatMessages", JSON.stringify(messages))
    return { success: true }
  } catch (error) {
    console.error("Error saving message history:", error)
    return { success: false, error }
  }
}

export const clearMessageHistory = (): boolean => {
  try {
    localStorage.removeItem("chatMessages")
    return true
  } catch (error) {
    console.error("Error clearing message history:", error)
    return false
  }
}
