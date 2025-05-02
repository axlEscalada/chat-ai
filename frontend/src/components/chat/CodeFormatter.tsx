import React, { useEffect } from "react"
import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.css"
import "prismjs/components/prism-python"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-java"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-zig"
import "../../CodeFormatter.css"

interface CodeFormatterProps {
  text: string
}

const CodeFormatter: React.FC<CodeFormatterProps> = ({ text }) => {
  useEffect(() => {
    Prism.highlightAll()
  }, [text])

  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g

  const parts: {
    type: "text" | "code"
    language?: string
    content: string
  }[] = []

  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      })
    }

    const language = match[1] || "text"
    const code = match[2].trim()

    parts.push({
      type: "code",
      language,
      content: code,
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    })
  }

  if (parts.length === 0) {
    return <p>{text}</p>
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        console.log("Code copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy code: ", err)
      })
  }

  const formatText = (content: string) => {
    const paragraphs = content.split(/\n\n+/)

    return (
      <>
        {paragraphs.map((paragraph, i) => {
          const lines = paragraph.split(/\n/)

          return (
            <p key={i} className="text-paragraph">
              {lines.map((line, j) => (
                <React.Fragment key={j}>
                  {line}
                  {j < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          )
        })}
      </>
    )
  }

  return (
    <div className="formatted-message">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div key={index} className="text-content">
              {formatText(part.content)}
            </div>
          )
        } else if (part.type === "code") {
          return (
            <div className="code-block-container" key={index}>
              <div className="code-header">
                <span className="code-language">{part.language}</span>
                <button
                  className="copy-button"
                  onClick={() => handleCopyCode(part.content)}
                  aria-label="Copy code to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <pre className="language-wrapper">
                <code className={`language-${part.language}`}>
                  {part.content}
                </code>
              </pre>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

export default CodeFormatter
