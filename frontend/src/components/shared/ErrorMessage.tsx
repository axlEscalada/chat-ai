import React from "react"

interface ErrorMessageProps {
  message: string
  onDismiss: () => void
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <div className="error-message">
      <p>{message}</p>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}

export default ErrorMessage
