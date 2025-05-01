import React from "react"
import StatusIndicator from "./StatusIndicator"

interface HeaderProps {
  onMenuClick: () => void
  backendStatus: "checking" | "connected" | "disconnected"
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, backendStatus }) => {
  return (
    <div className="header">
      <div className="title-area">
        <button
          className="menu-button"
          onClick={onMenuClick}
        >
          ☰
        </button>
        <h1>AI Chat</h1>
        <StatusIndicator status={backendStatus} />
      </div>
    </div>
  )
}

export default Header
