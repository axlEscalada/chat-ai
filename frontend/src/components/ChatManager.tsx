import { useState, useEffect, useCallback } from "react"
import { getUserChats, getChat } from "../api"
import { useNavigate } from "react-router-dom"

export interface Message {
  text: string
  sender: "user" | "ai" | "system"
  tokenSize: string
  timestamp: string
  isError?: boolean
  isStreaming?: boolean
}

export interface Chat {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

interface ChatManagerProps {
  activeChatId: string | null
  onChatsLoaded: (chats: Chat[]) => void
  onChatMessagesLoaded: (messages: Message[]) => void
  onError: (error: { message: string }) => void
  isNewChat?: boolean
  skipMessageLoading?: boolean
}

const ChatManager = ({
  activeChatId,
  onChatsLoaded,
  onChatMessagesLoaded,
  onError,
  isNewChat = false,
  skipMessageLoading = false,
}: ChatManagerProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastLoadedChatId, setLastLoadedChatId] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadUserChats = useCallback(async () => {
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
      if (skipMessageLoading) {
        return true
      }

      setIsLoading(true)

      try {
        const chatData = await getChat(chatId)

        if (chatData && chatData.messages) {
          const formattedMessages = chatData.messages.map((msg: any) => ({
            text: msg.content,
            tokenSize: msg.tokenSize || "0",
            sender: msg.type === "prompt" ? "user" : "ai",
            timestamp: new Date(msg.timestamp).toISOString(),
          }))

          onChatMessagesLoaded(formattedMessages)
          setLastLoadedChatId(chatId)
        }
        return true
      } catch (error: any) {
        console.error(`Error loading chat messages for ${chatId}:`, error)

        if (
          error.status === 404 ||
          error.message?.includes("404") ||
          (error.response && error.response.status === 404)
        ) {
          console.log("Chat not found (404), redirecting to home")
          navigate("/", { replace: true })
          return false
        }

        onError({ message: "Failed to load chat messages" })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [onChatMessagesLoaded, onError, navigate, skipMessageLoading],
  )

  useEffect(() => {
    loadUserChats()
  }, [loadUserChats])

  useEffect(() => {
    if (isNewChat) {
      onChatMessagesLoaded([])
      setLastLoadedChatId(null)
      return
    }

    if (!activeChatId || skipMessageLoading) {
      return
    }

    if (activeChatId !== lastLoadedChatId) {
      loadChatMessages(activeChatId).catch((err) => {
        console.error("Failed to load chat messages:", err)
      })
    } else {
      console.log(`ChatManager: Chat ${activeChatId} already loaded, skipping`)
    }
  }, [
    activeChatId,
    isNewChat,
    lastLoadedChatId,
    loadChatMessages,
    onChatMessagesLoaded,
    skipMessageLoading,
  ])

  return null
}

export { ChatManager }
export type { Chat as ChatType, Message as MessageType }
