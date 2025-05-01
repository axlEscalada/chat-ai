import React from "react"
import CodeFormatter from "./CodeFormatter"

interface MessageProps {
  text: string
  sender: string
  tokenSize: string
  timestamp: string
  isError?: boolean
}

const formatTime = (timestamp: string): string => {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const MessageItem: React.FC<MessageProps> = ({
  text,
  sender,
  tokenSize,
  timestamp,
  isError,
}) => {
  return (
    <div className={`message ${sender} ${isError ? "error" : ""}`}>
      <div className="message-content">
        <CodeFormatter text={text} />
        <span className="timestamp">
          tokens: {tokenSize} | {formatTime(timestamp)}
        </span>
      </div>
    </div>
  )
}

export default MessageItem
