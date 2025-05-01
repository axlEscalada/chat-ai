import { initializeApp, FirebaseApp } from "firebase/app"
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import * as dotenv from "dotenv"
import { LlmResponse } from "../services/llmService"

dotenv.config()

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

export enum MessageType {
  PROMPT = "prompt",
  RESPONSE = "response",
}

export interface Message {
  type: MessageType
  content: string
  tokenSize: number
  timestamp: number
}

export interface Chat {
  id: string
  sessionId: string
  title?: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export class FirebaseRepository {
  private app: FirebaseApp
  private db: Firestore
  private initialized: boolean = false

  constructor() {
    console.log(
      "Initializing Firebase with config:",
      JSON.stringify({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      }),
    )

    try {
      try {
        this.app = initializeApp(firebaseConfig)
      } catch (error: any) {
        if (error.code === "app/duplicate-app") {
          console.log("Firebase app already initialized, getting existing app")
          this.app = initializeApp(firebaseConfig, "default")
        } else {
          throw error
        }
      }

      this.db = getFirestore(this.app)
      this.initialized = true
      console.log("Firebase initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      this.app = {} as FirebaseApp
      this.db = {} as Firestore
    }
  }

  private ensureInitialized(): boolean {
    if (!this.initialized) {
      console.error("Firebase is not properly initialized")
      return false
    }
    return true
  }

  public getOrCreateSessionId(): string {
    if (typeof window === "undefined") {
      return uuidv4()
    }

    const sessionId = localStorage.getItem("chatSessionId")

    if (!sessionId) {
      const newSessionId = uuidv4()
      localStorage.setItem("chatSessionId", newSessionId)
      return newSessionId
    }

    return sessionId
  }

  public async createChat(
    sessionId: string,
    initialPrompt?: string,
    response?: LlmResponse,
  ): Promise<string> {
    if (!this.ensureInitialized()) {
      throw new Error("Firebase not initialized")
    }

    try {
      const now = Date.now()
      const chatId = uuidv4()

      const messages: Message[] = []

      if (initialPrompt) {
        messages.push({
          type: MessageType.PROMPT,
          content: initialPrompt,
          tokenSize: response?.promptTokenSize || 0,
          timestamp: now,
        })

        if (response) {
          messages.push({
            type: MessageType.RESPONSE,
            content: response.text,
            tokenSize: response.responseTokenSize || 0,
            timestamp: now + 1,
          })
        }
      }

      const chatData: Chat = {
        id: chatId,
        sessionId: sessionId,
        title: initialPrompt
          ? initialPrompt.substring(0, 30) + "..."
          : "New Chat",
        createdAt: now,
        updatedAt: now,
        messages: messages,
      }

      console.log("Creating new chat:", chatId)

      const chatRef = doc(this.db, "chats", chatId)
      await setDoc(chatRef, chatData)

      console.log("Chat created successfully:", chatId)
      return chatId
    } catch (error) {
      console.error("Error creating chat:", error)
      throw error
    }
  }

  public async addMessagePair(
    chatId: string,
    prompt: string,
    response: LlmResponse,
  ): Promise<void> {
    if (!this.ensureInitialized()) {
      throw new Error("Firebase not initialized")
    }

    try {
      const now = Date.now()
      const promptMessage: Message = {
        type: MessageType.PROMPT,
        content: prompt,
        tokenSize: response.promptTokenSize || 0,
        timestamp: now,
      }

      const responseMessage: Message = {
        type: MessageType.RESPONSE,
        content: response.text,
        tokenSize: response.responseTokenSize || 0,
        timestamp: now + 1,
      }

      console.log(`Adding message pair to chat ${chatId}`)

      const chatRef = doc(this.db, "chats", chatId)

      await updateDoc(chatRef, {
        messages: arrayUnion(promptMessage, responseMessage),
        updatedAt: now,
      })

      console.log("Message pair added successfully")
    } catch (error) {
      console.error("Error adding message pair:", error)
      throw error
    }
  }

  public async getChat(chatId: string): Promise<Chat | null> {
    if (!this.ensureInitialized()) {
      return null
    }

    try {
      console.log(`Fetching chat: ${chatId}`)

      const chatRef = doc(this.db, "chats", chatId)
      const chatSnap = await getDoc(chatRef)

      if (!chatSnap.exists()) {
        console.log(`Chat ${chatId} not found`)
        return null
      }

      const chatData = chatSnap.data() as Chat
      console.log(
        `Retrieved chat ${chatId} with ${chatData.messages.length} messages`,
      )

      return chatData
    } catch (error) {
      console.error("Error retrieving chat:", error)
      return null
    }
  }

  public async getUserChats(sessionId: string): Promise<Chat[]> {
    if (!this.ensureInitialized()) {
      return []
    }

    try {
      console.log(`Fetching chats for session: ${sessionId}`)

      const chatsRef = collection(this.db, "chats")
      const q = query(
        chatsRef,
        where("sessionId", "==", sessionId),
        orderBy("updatedAt", "desc"),
      )

      const querySnapshot = await getDocs(q)
      const chats: Chat[] = []

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as Chat
        chats.push(data)
      })

      console.log(`Retrieved ${chats.length} chats for session ${sessionId}`)
      return chats
    } catch (error) {
      console.error("Error retrieving chats:", error)
      return []
    }
  }
}

export const firebaseRepository = new FirebaseRepository()
