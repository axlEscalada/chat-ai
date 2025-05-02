import { ChatRepository } from "./chatRepository"
import { FirebaseRepository } from "./firebaseRepository"

export const createChatRepository = (): ChatRepository => {
  return new FirebaseRepository()
}
