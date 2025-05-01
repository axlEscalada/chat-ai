import React from "react"
import { Chat } from "./ChatManager"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  chats: Chat[]
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat
}) => {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  return (
    <div className={`chat-sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h2>Chat History</h2>
        <button className="close-sidebar" onClick={onClose}>
          ×
        </button>
      </div>

      <button className="new-chat-button" onClick={onNewChat}>
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
              onClick={() => onSelectChat(chat.id)}
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
  )
}

export default ChatSidebar
