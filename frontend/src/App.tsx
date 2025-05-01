import { useState, useRef, useEffect, useCallback, FormEvent } from "react"
import {
  sendMessage,
  checkServerHealth,
  createChat,
  LlmResponse
} from "./api"
import CodeFormatter from "./CodeFormatter"
import { ChatManager, Chat, Message } from "./ChatManager"
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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) return

    setError(null)

    const userMessage: Message = {
      text: input,
      sender: "user",
      tokenSize: "0",
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

        const llmResponse: LlmResponse = newChatData.response || { text: "I received your message, but couldn't formulate a response." }
        
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: llmResponse.text,
            tokenSize: llmResponse.responseTokenSize ? String(llmResponse.responseTokenSize) : "0",
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      } else {
        console.log(
          `Sending message to existing chat ${activeChatId}:`,
          currentInput.substring(0, 30),
        )
        const response = await sendMessage(currentInput, activeChatId)

        // Extract the LlmResponse from the API response
        const llmResponse: LlmResponse = typeof response.response === 'object' 
          ? response.response 
          : { text: response.response || "I received your message, but couldn't formulate a response." }

        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: llmResponse.text,
            tokenSize: llmResponse.responseTokenSize ? String(llmResponse.responseTokenSize) : "0",
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong"
      setError({ message: errorMessage })

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text:
            "Sorry, there was an error processing your request: " +
            errorMessage,
          tokenSize: "0",
          sender: "system",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
    }
  }

  const handleNewChat = () => {
    console.log("Starting new chat")
    setActiveChatId(null)
    setMessages([])
    setIsChatSidebarOpen(false)

    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSelectChat = (chatId: string) => {
    console.log("Selecting chat:", chatId)
    setActiveChatId(chatId)
    setIsChatSidebarOpen(false)
  }

  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleChatsLoaded = useCallback(
    (loadedChats: Chat[]) => {
      setChats(loadedChats)

      // Check if current active chat still exists
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

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  return (
    <div className="app">
      <ChatManager
        activeChatId={activeChatId}
        onChatsLoaded={handleChatsLoaded}
        onChatMessagesLoaded={handleChatMessagesLoaded}
        onError={setError}
      />

      <div className={`chat-sidebar ${isChatSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>Chat History</h2>
          <button
            className="close-sidebar"
            onClick={() => setIsChatSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <button className="new-chat-button" onClick={handleNewChat}>
          + New Chat
        </button>

        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="no-chats">No previous chats</div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${activeChatId === chat.id ? "active" : ""}`}
                onClick={() => handleSelectChat(chat.id)}
              >
                <div className="chat-item-title">{chat.title}</div>
                <div className="chat-item-date">
                  {formatDate(chat.updatedAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="header">
          <div className="title-area">
            <button
              className="menu-button"
              onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
            >
              ☰
            </button>
            <h1>AI Chat</h1>
            <div className={`status-indicator ${backendStatus}`}>
              {backendStatus === "connected"
                ? "Online"
                : backendStatus === "checking"
                  ? "Connecting..."
                  : "Offline"}
            </div>
          </div>
        </div>

        <div className="messages">
          {messages.length === 0 && !isLoading && (
            <div className="welcome-message">
              <div className="welcome-icon">✨</div>
              <h2>How can I help you today?</h2>
              <p>Type a message below to start a conversation</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="message-content">
                <CodeFormatter text={message.text} />
                <span className="timestamp">
                  tokens: {message.tokenSize} | {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message ai">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-message">
            <p>{error.message}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-container" onClick={handleInputClick}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || backendStatus !== "connected"}
            />
          </div>
          <button
            type="submit"
            disabled={
              isLoading || !input.trim() || backendStatus !== "connected"
            }
            className={isLoading ? "loading" : ""}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
