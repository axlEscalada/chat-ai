import React from "react"

interface StatusIndicatorProps {
  status: "checking" | "connected" | "disconnected"
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  return (
    <div className={`status-indicator ${status}`}>
      {status === "connected"
        ? "Online"
        : status === "checking"
          ? "Connecting..."
          : "Offline"}
    </div>
  )
}

export default StatusIndicator
