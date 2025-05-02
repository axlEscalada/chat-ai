import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import "./LLMFormatter.css"

interface LLMResponseFormatterProps {
  text: string
}

const LLMResponseFormatter: React.FC<LLMResponseFormatterProps> = ({
  text,
}) => {
  const processFunctionCalls = (content: string): string => {
    const functionCallRegex =
      /<function_calls>([\s\S]*?)<\/antml:function_calls>/g
    let processedContent = content.replace(
      functionCallRegex,
      '<div class="function-call">$1</div>',
    )

    const functionResultRegex =
      /<function_results>([\s\S]*?)<\/function_results>/g
    processedContent = processedContent.replace(
      functionResultRegex,
      '<div class="function-result">$1</div>',
    )

    return processedContent
  }

  const processCitations = (content: string): string => {
    const citationRegex = /([\s\S]*?)<\/antml:cite>/g
    return content.replace(
      citationRegex,
      '<span class="citation" data-citation-index="$1">$2<sup>[$1]</sup></span>',
    )
  }

  const preprocessedText = processCitations(processFunctionCalls(text))

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

  return (
    <div className="llm-formatted-response">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code(props: any) {
            const { children, className, inline, node, ...rest } = props
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : "text"
            const codeString = String(children).replace(/\n$/, "")

            const isInline =
              inline === true ||
              (node &&
                node.position &&
                node.position.start.line === node.position.end.line)

            if (isInline) {
              return (
                <code {...rest} className={className || "inline-code"}>
                  {children}
                </code>
              )
            }

            return (
              <div className="code-block-container">
                <div className="code-header">
                  <span className="code-language">
                    {language.toUpperCase()}
                  </span>
                  <button
                    className="copy-button"
                    onClick={() => handleCopyCode(codeString)}
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
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={language}
                    PreTag="div"
                    {...rest}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </pre>
              </div>
            )
          },
        }}
      >
        {preprocessedText}
      </ReactMarkdown>
    </div>
  )
}

export default LLMResponseFormatter
