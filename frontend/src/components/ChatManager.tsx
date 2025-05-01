import { useState, useEffect, useCallback } from "react"
import { getUserChats, getChat } from "../api"

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
}

interface ChatManagerProps {
  activeChatId: string | null
  onChatsLoaded: (chats: Chat[]) => void
  onChatMessagesLoaded: (messages: Message[]) => void
  onError: (error: { message: string }) => void
  isNewChat?: boolean
}

const ChatManager = ({
  activeChatId,
  onChatsLoaded,
  onChatMessagesLoaded,
  onError,
  isNewChat = false,
}: ChatManagerProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastLoadedChatId, setLastLoadedChatId] = useState<string | null>(null)

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
    if (isNewChat) {
      console.log("ChatManager: In NEW CHAT mode, clearing messages")
      onChatMessagesLoaded([])
      setLastLoadedChatId(null)
      return
    }

    if (!activeChatId) {
      console.log("ChatManager: activeChatId is null, not loading any chat")
      return
    }

    if (activeChatId === lastLoadedChatId) {
      console.log(`ChatManager: Chat ${activeChatId} already loaded, skipping`)
      return
    }

    console.log(`ChatManager: Loading chat ${activeChatId}`)
    loadChatMessages(activeChatId).catch((err) => {
      console.error("Failed to load chat messages:", err)
    })
  }, [
    activeChatId,
    isNewChat,
    lastLoadedChatId,
    loadChatMessages,
    onChatMessagesLoaded,
  ])

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return null
}

export { ChatManager }
export type { Chat, Message }
