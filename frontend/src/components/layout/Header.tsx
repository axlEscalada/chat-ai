import React from "react"
import StatusIndicator from "./StatusIndicator"

interface HeaderProps {
  onMenuClick: () => void
  backendStatus: "checking" | "connected" | "disconnected"
  useStreaming?: boolean
  onToggleStreaming?: () => void
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  backendStatus,
  useStreaming = true,
  onToggleStreaming,
}) => {
  return (
    <div className="header">
      <div className="title-area">
        <button className="menu-button" onClick={onMenuClick}>
          ☰
        </button>
        <h1>AI Chat</h1>
        <StatusIndicator status={backendStatus} />
      </div>

      {onToggleStreaming && (
        <div className="header-options">
          <label className="streaming-toggle">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={onToggleStreaming}
            />
            <span className="toggle-label">Streaming</span>
          </label>
        </div>
      )}
    </div>
  )
}

export default Header
