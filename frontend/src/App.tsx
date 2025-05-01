import { useState, useCallback, FormEvent, useEffect } from "react"
import { sendMessage, checkServerHealth, createChat, LlmResponse } from "./api"
import { ChatManager, Chat, Message } from "./components/ChatManager"

import MessageList from "./components/MessageList"
import MessageForm from "./components/MessageForm"
import ChatSidebar from "./components/ChatSidebar"
import Header from "./components/Header"
import ErrorMessage from "./components/ErrorMessage"
import "./App.css"

interface ApiError {
  message: string
  shownInChat?: boolean
}

function App() {
  const [input, setInput] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking")
  const [chats, setChats] = useState<Chat[]>([])

  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const savedChatId = localStorage.getItem("activeChatId")
    console.log("Initial activeChatId from localStorage:", savedChatId)
    return savedChatId
  })

  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState<boolean>(false)

  useEffect(() => {
    console.log("activeChatId changed to:", activeChatId)
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId)
    } else {
      localStorage.removeItem("activeChatId")
    }
  }, [activeChatId])

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerHealth()
        setBackendStatus(isConnected ? "connected" : "disconnected")
      } catch (error) {
        setBackendStatus("disconnected")
        console.error("Backend connection error:", error)
      }
    }

    checkConnection()
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) return

    setError(null)

    const userMessage: Message = {
      text: input,
      sender: "user",
      tokenSize: "calculating...",
      timestamp: new Date().toISOString(),
    }
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setIsLoading(true)

    const currentInput = input
    setInput("")

    try {
      if (!activeChatId) {
        console.log(
          "Creating a new chat with message:",
          currentInput.substring(0, 30),
        )
        const newChatData = await createChat(currentInput)

        if (!newChatData.chatId) {
          throw new Error("Server did not return a valid chat ID")
        }

        console.log("New chat created with ID:", newChatData.chatId)

        setActiveChatId(newChatData.chatId)

        const llmResponse: LlmResponse = newChatData.response || {
          text: "I received your message, but couldn't formulate a response.",
        }

        const promptTokenSize = llmResponse.promptTokenSize
          ? String(llmResponse.promptTokenSize)
          : "?"
        const responseTokenSize = llmResponse.responseTokenSize
          ? String(llmResponse.responseTokenSize)
          : "?"

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages]

          if (updatedMessages.length > 0) {
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              if (updatedMessages[i].sender === "user") {
                updatedMessages[i] = {
                  ...updatedMessages[i],
                  tokenSize: promptTokenSize,
                }
                break
              }
            }
          }

          return [
            ...updatedMessages,
            {
              text: llmResponse.text,
              tokenSize: responseTokenSize,
              sender: "ai",
              timestamp: new Date().toISOString(),
            },
          ]
        })
      } else {
        console.log(
          `Sending message to existing chat ${activeChatId}:`,
          currentInput.substring(0, 30),
        )
        const response = await sendMessage(currentInput, activeChatId)

        const llmResponse: LlmResponse =
          typeof response.response === "object"
            ? response.response
            : {
                text:
                  response.response ||
                  "I received your message, but couldn't formulate a response.",
              }

        const promptTokenSize = llmResponse.promptTokenSize
          ? String(llmResponse.promptTokenSize)
          : "?"
        const responseTokenSize = llmResponse.responseTokenSize
          ? String(llmResponse.responseTokenSize)
          : "?"

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages]

          if (updatedMessages.length > 0) {
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              if (updatedMessages[i].sender === "user") {
                updatedMessages[i] = {
                  ...updatedMessages[i],
                  tokenSize: promptTokenSize,
                }
                break
              }
            }
          }

          return [
            ...updatedMessages,
            {
              text: llmResponse.text,
              tokenSize: responseTokenSize,
              sender: "ai",
              timestamp: new Date().toISOString(),
            },
          ]
        })
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong"
      setError({ message: errorMessage })

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages]

        if (updatedMessages.length > 0) {
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].sender === "user") {
              updatedMessages[i] = {
                ...updatedMessages[i],
                tokenSize: "?",
              }
              break
            }
          }
        }

        return [
          ...updatedMessages,
          {
            text:
              "Sorry, there was an error processing your request: " +
              errorMessage,
            tokenSize: "0",
            sender: "system",
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    console.log("Starting new chat")
    setActiveChatId(null)
    setMessages([])
    setIsChatSidebarOpen(false)
  }

  const handleSelectChat = (chatId: string) => {
    console.log("Selecting chat:", chatId)
    setActiveChatId(chatId)
    setIsChatSidebarOpen(false)
  }

  const handleChatsLoaded = useCallback(
    (loadedChats: Chat[]) => {
      setChats(loadedChats)

      if (activeChatId && loadedChats.length > 0) {
        const chatExists = loadedChats.some((chat) => chat.id === activeChatId)
        if (!chatExists) {
          console.warn(
            `Active chat ID ${activeChatId} not found in user chats, resetting.`,
          )
          setActiveChatId(null)
        }
      }
    },
    [activeChatId],
  )

  const handleChatMessagesLoaded = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages)
  }, [])

  const toggleSidebar = () => {
    setIsChatSidebarOpen(!isChatSidebarOpen)
  }

  return (
    <div className="app">
      <ChatManager
        activeChatId={activeChatId}
        onChatsLoaded={handleChatsLoaded}
        onChatMessagesLoaded={handleChatMessagesLoaded}
        onError={setError}
      />

      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      <div className="chat-main">
        <Header onMenuClick={toggleSidebar} backendStatus={backendStatus} />

        <MessageList messages={messages} isLoading={isLoading} />

        {error && (
          <ErrorMessage
            message={error.message}
            onDismiss={() => setError(null)}
          />
        )}

        <MessageForm
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          backendStatus={backendStatus}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

export default App
