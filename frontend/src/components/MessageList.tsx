import React, { useRef, useEffect } from "react"
import MessageItem from "./MessageItem"
import { Message } from "./ChatManager"

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="messages">
      {messages.length === 0 && !isLoading && (
        <div className="welcome-message">
          <div className="welcome-icon">✨</div>
          <h2>How can I help you today?</h2>
          <p>Type a message below to start a conversation</p>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageItem
          key={index}
          text={message.text}
          sender={message.sender}
          tokenSize={message.tokenSize}
          timestamp={message.timestamp}
          isError={message.isError}
        />
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
  )
}

export default MessageList
