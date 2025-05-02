import React, { useRef, useEffect, FormEvent, useState } from "react"
import { getTokenCount } from "../../api"
import { BiHash } from "react-icons/bi"
import { BsLightningChargeFill } from "react-icons/bs"

interface MessageFormProps {
  input: string
  setInput: (input: string) => void
  isLoading: boolean
  backendStatus: "checking" | "connected" | "disconnected"
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  useStreaming: boolean
  onToggleStreaming: () => void // Added toggle function prop
}

const MessageForm: React.FC<MessageFormProps> = ({
  input,
  setInput,
  isLoading,
  backendStatus,
  onSubmit,
  useStreaming = true,
  onToggleStreaming,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showTokenCount, setShowTokenCount] = useState(false)
  const [tokenCount, setTokenCount] = useState<string | null>(null)
  const [isCountingTokens, setIsCountingTokens] = useState(false)

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

  const handleTokenCount = async () => {
    if (!input.trim() || isCountingTokens) return

    setIsCountingTokens(true)
    try {
      const count = await getTokenCount(input)
      setTokenCount(count)
      setShowTokenCount(true)

      setTimeout(() => {
        setShowTokenCount(false)
      }, 3000)
    } catch (error) {
      console.error("Error counting tokens:", error)
      setTokenCount("Error")
      setShowTokenCount(true)

      setTimeout(() => {
        setShowTokenCount(false)
      }, 2000)
    } finally {
      setIsCountingTokens(false)
    }
  }

  return (
    <form className="input-form" onSubmit={onSubmit}>
      <button
        type="button"
        className={`streaming-indicator ${useStreaming ? "active" : ""}`}
        title={useStreaming ? "Streaming enabled" : "Streaming disabled"}
        onClick={onToggleStreaming}
        style={{ cursor: "pointer" }}
      >
        <BsLightningChargeFill size={18} />
      </button>

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
        type="button"
        onClick={handleTokenCount}
        disabled={
          isLoading ||
          !input.trim() ||
          backendStatus !== "connected" ||
          isCountingTokens
        }
        className="token-button"
        title="Count prompt tokens"
      >
        <BiHash size={20} />
      </button>

      {showTokenCount && (
        <div className="token-popup">
          {isCountingTokens ? "Counting..." : `Tokens: ${tokenCount}`}
        </div>
      )}

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
