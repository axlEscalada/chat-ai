import React from "react"
import CodeFormatter from "./CodeFormatter"

interface MessageProps {
  text: string
  sender: "user" | "ai" | "system" // Update to match the union type
  tokenSize: string
  timestamp: string
  isError?: boolean
  isStreaming?: boolean
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
  isStreaming,
}) => {
  return (
    <div
      className={`message ${sender} ${isError ? "error" : ""} ${isStreaming ? "streaming" : ""}`}
    >
      <div className="message-content">
        <CodeFormatter text={text} />
        {isStreaming && <span className="streaming-cursor"></span>}
        <span className="timestamp">
          tokens: {isStreaming ? "calculating..." : tokenSize} |{" "}
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  )
}

export default MessageItem
