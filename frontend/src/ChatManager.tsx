import { useState, useEffect, useCallback } from "react"
import { getUserChats, getChat } from "./api"

interface Chat {
  id: string
  title: string
  updatedAt: number
}

interface Message {
  text: string
  tokenSize: string
  sender: string
  timestamp: string
  isError?: boolean
  // Add a formatted display string for tokens and time
  timeDisplay?: string
}

interface ChatManagerProps {
  activeChatId: string | null
  onChatsLoaded: (chats: Chat[]) => void
  onChatMessagesLoaded: (messages: Message[]) => void
  onError: (error: { message: string }) => void
}

const ChatManager = ({
  activeChatId,
  onChatsLoaded,
  onChatMessagesLoaded,
  onError,
}: ChatManagerProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const createTimeDisplay = (tokenSize: string, timestamp: string): string => {
    return `tokens: ${tokenSize} | ${formatTime(timestamp)}`
  }

  const loadUserChats = useCallback(async () => {
    console.log("Loading user chats")
    setIsLoading(true)

    try {
      const userChats = await getUserChats()
      onChatsLoaded(userChats)

      if (activeChatId && userChats.length > 0) {
        const chatExists = userChats.some((chat) => chat.id === activeChatId)
        if (!chatExists) {
          console.warn(
            `Active chat ID ${activeChatId} not found in user chats.`,
          )
        }
      }

      return userChats
    } catch (error) {
      console.error("Error loading chats:", error)
      onError({ message: "Failed to load chat history" })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [activeChatId, onChatsLoaded, onError])

  const loadChatMessages = useCallback(
    async (chatId: string) => {
      console.log(`Loading messages for chat: ${chatId}`)
      setIsLoading(true)

      try {
        const chatData = await getChat(chatId)

        if (chatData && chatData.messages) {
          const formattedMessages = chatData.messages.map((msg: any) => {
            const timestamp = new Date(msg.timestamp).toISOString()
            const tokenSize = msg.tokenSize || "0"
            
            return {
              text: msg.content,
              tokenSize: tokenSize,
              sender: msg.type === "prompt" ? "user" : "ai",
              timestamp: timestamp,
              timeDisplay: createTimeDisplay(tokenSize, timestamp)
            }
          })

          onChatMessagesLoaded(formattedMessages)
        }
        return true
      } catch (error) {
        console.error(`Error loading chat messages for ${chatId}:`, error)
        onError({ message: "Failed to load chat messages" })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [onChatMessagesLoaded, onError],
  )

  useEffect(() => {
    loadUserChats()
  }, [loadUserChats])

  useEffect(() => {
    if (activeChatId) {
      loadChatMessages(activeChatId).catch((err) => {
        console.error("Failed to load chat messages:", err)
      })
    }
  }, [activeChatId, loadChatMessages])

  return null
}

export { ChatManager }
export type { Chat, Message }
