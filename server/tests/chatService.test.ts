import { ChatServiceImpl, StreamCallbacks } from "../api/services/chatService"
import { LlmResponse, llmService } from "../api/services/llmService"

jest.mock("../api/services/llmService", () => ({
  llmService: {
    generateResponse: jest.fn(),
    generateStreamingResponse: jest.fn(),
    countPromptToken: jest.fn(),
  },
}))

const mockRepository = {
  createChat: jest.fn(),
  addMessagePair: jest.fn(),
  getChat: jest.fn(),
  getUserChats: jest.fn(),
  getOrCreateSessionId: jest.fn(),
}

describe("ChatService", () => {
  let chatService: ChatServiceImpl

  beforeEach(() => {
    jest.clearAllMocks()

    chatService = new ChatServiceImpl(mockRepository)
  })

  describe("createChat", () => {
    it("should create a chat without initial prompt", async () => {
      const sessionId = "test-session-id"
      const expectedChatId = "new-chat-id"
      mockRepository.createChat.mockResolvedValue(expectedChatId)

      const [chatId, response] = await chatService.createChat(sessionId)

      expect(mockRepository.createChat).toHaveBeenCalledWith(sessionId)
      expect(chatId).toBe(expectedChatId)
      expect(response).toEqual({ text: "" })
    })

    it("should create a chat with initial prompt", async () => {
      const sessionId = "test-session-id"
      const initialPrompt = "Initial prompt"
      const expectedChatId = "new-chat-id"
      const expectedResponse: LlmResponse = {
        text: "Hello, human!",
        promptTokenSize: 3,
        responseTokenSize: 3,
      }

      mockRepository.createChat.mockResolvedValue(expectedChatId)
      ;(llmService.generateResponse as jest.Mock).mockResolvedValue(
        expectedResponse,
      )

      const [chatId, response] = await chatService.createChat(
        sessionId,
        initialPrompt,
      )

      expect(llmService.generateResponse).toHaveBeenCalledWith(initialPrompt)
      expect(mockRepository.createChat).toHaveBeenCalledWith(
        sessionId,
        initialPrompt,
        expectedResponse,
      )
      expect(chatId).toBe(expectedChatId)
      expect(response).toEqual(expectedResponse)
    })

    it("should handle errors when creating a chat", async () => {
      const sessionId = "test-session-id"
      const initialPrompt = "Initial prompt"
      const error = new Error("Repository error")

      mockRepository.createChat.mockRejectedValue(error)

      await expect(
        chatService.createChat(sessionId, initialPrompt),
      ).rejects.toThrow("Repository error")
    })
  })

  describe("sendMessage", () => {
    it("should send a message and return the response", async () => {
      const chatId = "existing-chat-id"
      const prompt = "Initial prompt"
      const expectedResponse: LlmResponse = {
        text: "some response",
        promptTokenSize: 4,
        responseTokenSize: 5,
      }

      ;(llmService.generateResponse as jest.Mock).mockResolvedValue(
        expectedResponse,
      )

      const response = await chatService.sendMessage(chatId, prompt)

      expect(llmService.generateResponse).toHaveBeenCalledWith(prompt)
      expect(mockRepository.addMessagePair).toHaveBeenCalledWith(
        chatId,
        prompt,
        expectedResponse,
      )
      expect(response).toEqual(expectedResponse)
    })

    it("should handle errors when sending a message", async () => {
      const chatId = "existing-chat-id"
      const prompt = "Initial prompt"
      const error = new Error("LLM service error")

      ;(llmService.generateResponse as jest.Mock).mockRejectedValue(error)

      await expect(chatService.sendMessage(chatId, prompt)).rejects.toThrow(
        "LLM service error",
      )
    })
  })

  describe("streamMessage", () => {
    it("should handle streaming for a new chat", async () => {
      const prompt = "Stream this message"
      const createChat = true
      const sessionId = "test-session-id"
      const newChatId = "new-stream-chat-id"
      const finalResponse: LlmResponse = {
        text: "prompt streaming",
        promptTokenSize: 3,
        responseTokenSize: 4,
      }

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      }

      mockRepository.createChat.mockResolvedValue(newChatId)
      ;(llmService.generateStreamingResponse as jest.Mock).mockImplementation(
        (prompt, onChunk, onComplete, onError) => {
          onChunk("Hello")
          onChunk(", I am ")
          onChunk("streaming")

          onComplete(finalResponse)

          return Promise.resolve()
        },
      )

      await chatService.streamMessage(prompt, createChat, sessionId, callbacks)

      expect(llmService.generateStreamingResponse).toHaveBeenCalled()
      expect(mockRepository.createChat).toHaveBeenCalledWith(sessionId)
      expect(mockRepository.addMessagePair).toHaveBeenCalledWith(
        newChatId,
        prompt,
        expect.objectContaining({ text: "Hello, I am streaming" }),
      )

      expect(callbacks.onChunk).toHaveBeenCalledTimes(3)
      expect(callbacks.onComplete).toHaveBeenCalledWith({
        text: "Hello, I am streaming",
        chatId: newChatId,
        promptTokenSize: finalResponse.promptTokenSize,
        responseTokenSize: finalResponse.responseTokenSize,
      })
      expect(callbacks.onError).not.toHaveBeenCalled()
    })

    it("should handle streaming for an existing chat", async () => {
      const prompt = "Stream this message"
      const createChat = false
      const sessionId = "test-session-id"
      const existingChatId = "existing-chat-id"
      const finalResponse: LlmResponse = {
        text: "Hello from chat",
        promptTokenSize: 3,
        responseTokenSize: 4,
      }

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      }

      ;(llmService.generateStreamingResponse as jest.Mock).mockImplementation(
        (prompt, onChunk, onComplete, onError) => {
          onChunk("Hello ")
          onChunk("from ")
          onChunk("chat")

          onComplete(finalResponse)

          return Promise.resolve()
        },
      )

      await chatService.streamMessage(
        prompt,
        createChat,
        sessionId,
        callbacks,
        existingChatId,
      )

      expect(llmService.generateStreamingResponse).toHaveBeenCalled()
      expect(mockRepository.createChat).not.toHaveBeenCalled()
      expect(mockRepository.addMessagePair).toHaveBeenCalledWith(
        existingChatId,
        prompt,
        expect.objectContaining({ text: "Hello from chat" }),
      )

      expect(callbacks.onChunk).toHaveBeenCalledTimes(3)
      expect(callbacks.onComplete).toHaveBeenCalledWith({
        text: "Hello from chat",
        chatId: existingChatId,
        promptTokenSize: finalResponse.promptTokenSize,
        responseTokenSize: finalResponse.responseTokenSize,
      })
      expect(callbacks.onError).not.toHaveBeenCalled()
    })

    it("should handle streaming errors from the LLM service", async () => {
      const prompt = "Stream this message"
      const createChat = true
      const sessionId = "test-session-id"
      const streamingError = new Error("Streaming error")

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      }

      ;(llmService.generateStreamingResponse as jest.Mock).mockImplementation(
        (prompt, onChunk, onComplete, onError) => {
          onError(streamingError)
          return Promise.resolve()
        },
      )

      await chatService.streamMessage(prompt, createChat, sessionId, callbacks)

      expect(llmService.generateStreamingResponse).toHaveBeenCalled()
      expect(callbacks.onError).toHaveBeenCalledWith(streamingError)
      expect(mockRepository.createChat).not.toHaveBeenCalled()
      expect(mockRepository.addMessagePair).not.toHaveBeenCalled()
    })

    it("should handle error when chatId is undefined", async () => {
      const prompt = "Stream this message"
      const createChat = false
      const sessionId = "test-session-id"

      const callbacks: StreamCallbacks = {
        onChunk: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      }

      ;(llmService.generateStreamingResponse as jest.Mock).mockImplementation(
        (prompt, onChunk, onComplete, onError) => {
          onChunk("Some response")
          onComplete({ text: "Some response" })
          return Promise.resolve()
        },
      )

      await chatService.streamMessage(prompt, createChat, sessionId, callbacks)

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Chat id not provided"),
        }),
      )
    })
  })

  describe("getChat", () => {
    it("should retrieve a chat by id", async () => {
      const chatId = "existing-chat-id"
      const expectedChat = {
        id: chatId,
        sessionId: "test-session-id",
        messages: [{ prompt: "Hello", response: { text: "Hi there" } }],
      }

      mockRepository.getChat.mockResolvedValue(expectedChat)

      const result = await chatService.getChat(chatId)

      expect(mockRepository.getChat).toHaveBeenCalledWith(chatId)
      expect(result).toEqual(expectedChat)
    })
  })

  describe("getUserChats", () => {
    it("should retrieve all chats for a user", async () => {
      const sessionId = "test-session-id"
      const expectedChats = [
        { id: "chat-1", sessionId },
        { id: "chat-2", sessionId },
      ]

      mockRepository.getUserChats.mockResolvedValue(expectedChats)

      const result = await chatService.getUserChats(sessionId)

      expect(mockRepository.getUserChats).toHaveBeenCalledWith(sessionId)
      expect(result).toEqual(expectedChats)
    })
  })

  describe("countPromptTokens", () => {
    it("should count tokens in a prompt", async () => {
      const prompt = "Count my tokens"
      const expectedTokenCount = 3

      ;(llmService.countPromptToken as jest.Mock).mockResolvedValue(
        expectedTokenCount,
      )

      const result = await chatService.countPromptTokens(prompt)

      expect(llmService.countPromptToken).toHaveBeenCalledWith(prompt)
      expect(result).toBe(expectedTokenCount)
    })
  })
})
