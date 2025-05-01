import React, { useRef, useEffect, FormEvent } from "react"

interface MessageFormProps {
  input: string
  setInput: (input: string) => void
  isLoading: boolean
  backendStatus: "checking" | "connected" | "disconnected"
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
}

const MessageForm: React.FC<MessageFormProps> = ({
  input,
  setInput,
  isLoading,
  backendStatus,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <form className="input-form" onSubmit={onSubmit}>
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
        disabled={isLoading || !input.trim() || backendStatus !== "connected"}
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
  )
}

export default MessageForm
