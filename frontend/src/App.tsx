import { useState, useRef, useEffect, useCallback, FormEvent } from "react"
import {
  sendMessage,
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
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking")
  const [chats, setChats] = useState<Chat[]>([])
  
  // Initialize activeChatId from localStorage, but after this point
  // we'll manage it purely through React state
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    // Only do this once on initial render
    const savedChatId = localStorage.getItem("activeChatId");
    console.log("Initial activeChatId from localStorage:", savedChatId);
    return savedChatId;
  })
  
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Whenever activeChatId changes, update localStorage
  useEffect(() => {
    console.log("activeChatId changed to:", activeChatId);
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId)
    } else {
      localStorage.removeItem("activeChatId")
    }
  }, [activeChatId])

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerHealth()
        setBackendStatus(isConnected ? "connected" : "disconnected")

        if (isConnected) {
          await loadUserChats()
          
          // If we have an active chat ID, try to load its messages
          if (activeChatId) {
            try {
              await loadActiveChatMessages(activeChatId)
            } catch (err) {
              console.error("Failed to load initial chat messages, clearing activeChatId")
              setActiveChatId(null)
            }
          }
        }
      } catch (error) {
        setBackendStatus("disconnected")
        console.error("Backend connection error:", error)
      }
    }

    checkConnection()
  }, []) // Only run on initial mount

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input on mount
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
      
      // Validate that our active chat ID exists in the returned chats
      if (activeChatId && userChats.length > 0) {
        const chatExists = userChats.some(chat => chat.id === activeChatId)
        if (!chatExists) {
          console.warn(`Active chat ID ${activeChatId} not found in user chats, resetting.`)
          setActiveChatId(null)
        }
      }
      
      return userChats
    } catch (error) {
      console.error("Error loading chats:", error)
      return []
    }
  }

  const loadActiveChatMessages = async (chatId: string) => {
    console.log(`Loading messages for chat: ${chatId}`)
    try {
      const chatData = await getChat(chatId)

      if (chatData && chatData.messages) {
        const formattedMessages = chatData.messages.map((msg: any) => ({
          text: msg.content,
          sender: msg.type === "prompt" ? "user" : "ai",
          timestamp: new Date(msg.timestamp).toISOString(),
        }))

        setMessages(formattedMessages)
      }
      return true
    } catch (error) {
      console.error(`Error loading chat messages for ${chatId}:`, error)
      setError({ message: "Failed to load chat messages" })
      throw error
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) return

    setError(null)

    // Always add the user message to the UI immediately
    const userMessage: Message = {
      text: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    }
    setMessages((prevMessages) => [...prevMessages, userMessage])
    setIsLoading(true)
    
    const currentInput = input
    setInput("")

    try {
      if (!activeChatId) {
        // Create a new chat
        console.log("Creating a new chat with message:", currentInput.substring(0, 30))
        const newChatData = await createChat(currentInput)
        
        // Validate that we got a chat ID back
        if (!newChatData.chatId) {
          throw new Error("Server did not return a valid chat ID")
        }
        
        console.log("New chat created with ID:", newChatData.chatId)
        
        // Set the new chat ID in state
        setActiveChatId(newChatData.chatId)
        
        // Add AI response directly to messages
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: newChatData.response || "I received your message, but couldn't formulate a response.",
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
        
        // Update chat list
        await loadUserChats()
      } else {
        // Using existing chat
        console.log(`Sending message to existing chat ${activeChatId}:`, currentInput.substring(0, 30))
        const response = await sendMessage(currentInput, activeChatId)
        
        // Add AI response to messages
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: response.response || "I received your message, but couldn't formulate a response.",
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"
      setError({ message: errorMessage })

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: "Sorry, there was an error processing your request: " + errorMessage,
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

  const handleSelectChat = async (chatId: string) => {
    console.log("Selecting chat:", chatId)
    
    // First clear messages and show loading state
    setMessages([])
    setIsLoading(true)
    
    try {
      // Load messages for this chat before updating active chat ID
      await loadActiveChatMessages(chatId)
      setActiveChatId(chatId)
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error)
      setError({ message: "Could not load selected chat" })
    } finally {
      setIsLoading(false)
      setIsChatSidebarOpen(false)
    }
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
