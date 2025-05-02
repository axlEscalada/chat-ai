import request from "supertest"
import { app } from "../api/index"
import { chatService } from "../api/services/chatService"

jest.mock("../api/services/chatService", () => ({
  chatService: {
    createChat: jest.fn(),
    sendMessage: jest.fn(),
    streamMessage: jest.fn(),
    getChat: jest.fn(),
    getUserChats: jest.fn(),
    countPromptTokens: jest.fn(),
  },
}))

describe("ChatController Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST /chats", () => {
    test("should create a new chat successfully", async () => {
      const mockSessionId = "test-session-id"
      const mockInitialPrompt = "Hello, AI!"
      const mockChatId = "chat-123"
      const mockResponse = { text: "Initial prompt" }

      ;(chatService.createChat as jest.Mock).mockResolvedValue([
        mockChatId,
        mockResponse,
      ])

      const response = await request(app).post("/chats").send({
        sessionId: mockSessionId,
        initialPrompt: mockInitialPrompt,
      })

      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        chatId: mockChatId,
        response: mockResponse,
      })
      expect(chatService.createChat).toHaveBeenCalledWith(
        mockSessionId,
        mockInitialPrompt,
      )
    })

    test("should return 400 if sessionId is missing", async () => {
      const response = await request(app).post("/chats").send({
        initialPrompt: "Initial prompt",
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: "Session ID is required" })
      expect(chatService.createChat).not.toHaveBeenCalled()
    })

    test("should return 500 if service throws an error", async () => {
      ;(chatService.createChat as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      )

      const response = await request(app).post("/chats").send({
        sessionId: "test-session-id",
        initialPrompt: "Initial prompt",
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: "Failed to create chat" })
    })
  })

  describe("POST /prompt", () => {
    test("should send a message successfully", async () => {
      const mockChatId = "chat-123"
      const mockPrompt = "How are you?"
      const mockResponse = { text: "I'm doing well!" }

      ;(chatService.sendMessage as jest.Mock).mockResolvedValue(mockResponse)

      const response = await request(app).post("/prompt").send({
        chatId: mockChatId,
        prompt: mockPrompt,
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ response: mockResponse })
      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockChatId,
        mockPrompt,
      )
    })

    test("should return 400 if chatId or prompt is missing", async () => {
      const response = await request(app).post("/prompt").send({
        chatId: "chat-123",
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: "Chat ID and prompt are required",
      })
      expect(chatService.sendMessage).not.toHaveBeenCalled()
    })

    test("should return 500 if service throws an error", async () => {
      ;(chatService.sendMessage as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      )

      const response = await request(app).post("/prompt").send({
        chatId: "chat-123",
        prompt: "Initial prompt",
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: "Failed to send message" })
    })
  })

  describe("POST /prompt/stream", () => {
    test("should set up streaming correctly", async () => {
      const mockPrompt = "Stream me a response"
      const mockSessionId = "test-session-id"
      const mockCreateChat = true

      ;(chatService.streamMessage as jest.Mock).mockImplementation(
        (prompt, createChat, sessionId, callbacks, chatId) => {
          callbacks.onChunk("Hello")
          callbacks.onChunk(" World")

          callbacks.onComplete({
            chatId: "chat-stream-123",
            promptTokenSize: 10,
            responseTokenSize: 15,
          })

          return Promise.resolve()
        },
      )

      await request(app).post("/prompt/stream").send({
        prompt: mockPrompt,
        createChat: mockCreateChat,
        sessionId: mockSessionId,
      })

      expect(chatService.streamMessage).toHaveBeenCalledWith(
        mockPrompt,
        mockCreateChat,
        mockSessionId,
        expect.any(Object),
        undefined,
      )
    })

    test("should handle streaming with existing chatId", async () => {
      const mockPrompt = "Stream me a response"
      const mockChatId = "existing-chat-123"

      ;(chatService.streamMessage as jest.Mock).mockImplementation(
        (prompt, createChat, sessionId, callbacks, chatId) => {
          expect(chatId).toBe(mockChatId)
          callbacks.onComplete({
            chatId: mockChatId,
            promptTokenSize: 5,
            responseTokenSize: 10,
          })
          return Promise.resolve()
        },
      )

      await request(app).post("/prompt/stream").send({
        prompt: mockPrompt,
        chatId: mockChatId,
      })

      expect(chatService.streamMessage).toHaveBeenCalledWith(
        mockPrompt,
        undefined,
        undefined,
        expect.any(Object),
        mockChatId,
      )
    })

    test("should return 400 if required parameters are missing", async () => {
      const response = await request(app).post("/prompt/stream").send({
        sessionId: "test-session-id",
      })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: "Chat ID and prompt are required",
      })
      expect(chatService.streamMessage).not.toHaveBeenCalled()
    })
  })

  describe("GET /chats/:chatId", () => {
    test("should return chat data successfully", async () => {
      const mockChatId = "chat-123"
      const mockChatData = {
        id: mockChatId,
        messages: [
          { role: "user", content: "Say Hello" },
          { role: "assistant", content: "Hello" },
        ],
      }

      ;(chatService.getChat as jest.Mock).mockResolvedValue(mockChatData)

      const response = await request(app).get(`/chats/${mockChatId}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockChatData)
      expect(chatService.getChat).toHaveBeenCalledWith(mockChatId)
    })

    test("should return 404 if chat not found", async () => {
      const mockChatId = "nonexistent-chat"

      ;(chatService.getChat as jest.Mock).mockResolvedValue(null)

      const response = await request(app).get(`/chats/${mockChatId}`)

      expect(response.status).toBe(404)
      expect(response.body).toEqual({ error: "Chat not found" })
    })

    test("should return 500 if service throws an error", async () => {
      ;(chatService.getChat as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      )

      const response = await request(app).get(`/chats/chat-123`)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: "Failed to get chat" })
    })
  })

  describe("GET /session/:sessionId/chats", () => {
    test("should return user chats successfully", async () => {
      const mockSessionId = "test-session-id"
      const mockChats = [
        { id: "chat-1", title: "First Chat" },
        { id: "chat-2", title: "Second Chat" },
      ]

      ;(chatService.getUserChats as jest.Mock).mockResolvedValue(mockChats)

      const response = await request(app).get(
        `/sessions/${mockSessionId}/chats`,
      )

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockChats)
      expect(chatService.getUserChats).toHaveBeenCalledWith(mockSessionId)
    })

    test("should return 500 if service throws an error", async () => {
      ;(chatService.getUserChats as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      )

      const response = await request(app).get(`/sessions/test-session-id/chats`)

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: "Failed to get user chats" })
    })
  })

  describe("POST /prompt/tokens", () => {
    test("should count tokens successfully", async () => {
      const mockPrompt = "Count my tokens please"
      const mockTokenCount = 5

      ;(chatService.countPromptTokens as jest.Mock).mockResolvedValue(
        mockTokenCount,
      )

      const response = await request(app).post("/prompt/tokens").send({
        prompt: mockPrompt,
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockTokenCount)
      expect(chatService.countPromptTokens).toHaveBeenCalledWith(mockPrompt)
    })

    test("should return 500 if service throws an error", async () => {
      ;(chatService.countPromptTokens as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      )

      const response = await request(app).post("/prompt/tokens").send({
        prompt: "Test prompt",
      })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({ error: "Failed to get token size" })
    })
  })
})
