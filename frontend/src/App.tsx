import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react"
import {
  sendMessage,
  loadMessageHistory,
  clearMessageHistory,
  checkServerHealth,
  createChat,
  getUserChats,
  getChat,
  Message,
} from "./api"
import CodeFormatter from "./CodeFormatter"
import "./App.css"

interface ApiError {
  message: string
  shownInChat?: boolean
}

interface Chat {
  id: string
  title: string
  updatedAt: number
}

interface ApiResponse {
  response: string
  chatId?: string
  [key: string]: any
}

function App() {
  const [input, setInput] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>(() =>
    loadMessageHistory(),
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking")
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(
    localStorage.getItem("activeChatId"),
  )
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerHealth()
        setBackendStatus(isConnected ? "connected" : "disconnected")

        if (isConnected) {
          loadUserChats()
        }
      } catch (error) {
        setBackendStatus("disconnected")
        console.error("Backend connection error:", error)
      }
    }

    checkConnection()
  }, [])

  useEffect(() => {
    if (activeChatId) {
      loadActiveChatMessages()
    } else {
      setMessages([])
    }
  }, [activeChatId])

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId)
    }
  }, [activeChatId])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages))
    }
  }, [messages])

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

  const loadUserChats = async () => {
    try {
      const userChats = await getUserChats()
      setChats(userChats)
    } catch (error) {
      console.error("Error loading chats:", error)
    }
  }

  const loadActiveChatMessages = async () => {
    if (!activeChatId) return

    try {
      const chatData = await getChat(activeChatId)

      // Convert chat messages to app format
      if (chatData && chatData.messages) {
        const formattedMessages = chatData.messages.map((msg: any) => ({
          text: msg.content,
          sender: msg.type === "prompt" ? "user" : "ai",
          timestamp: new Date(msg.timestamp).toISOString(),
        }))

        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error("Error loading chat messages:", error)
      setError({ message: "Failed to load chat messages" })
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) return

    setError(null)

    const userMessage: Message = {
      text: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    }
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setIsLoading(true)
    setInput("")

    try {
      let response: ApiResponse

      if (!activeChatId) {
        const newChatData = await createChat(input)
        setActiveChatId(newChatData.chatId)
        response = { response: newChatData.response || "" }

        loadUserChats()
      } else {
        response = await sendMessage(input)
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text:
            response.response ||
            "I received your message, but couldn't formulate a response.",
          sender: "ai",
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong"
      setError({ message: errorMessage })

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text:
            "Sorry, there was an error processing your request: " +
            errorMessage,
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

  const handleNewChat = async () => {
    setActiveChatId(null)
    setMessages([])
    localStorage.removeItem("activeChatId")
    setIsChatSidebarOpen(false)

    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setIsChatSidebarOpen(false)
  }

  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleClearChat = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all messages?")) {
      setMessages([])
      clearMessageHistory()
      setActiveChatId(null)
    }
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

      {/* Main chat area */}
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
          <button className="clear-button" onClick={handleClearChat}>
            Clear Chat
          </button>
        </div>

        <div className="messages">
          {messages.length === 0 && (
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
                  {formatTime(message.timestamp)}
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
