import { useState, useCallback, FormEvent, useEffect, useRef } from "react"
import { useParams, useNavigate, Routes, Route, Navigate } from "react-router-dom"
import { sendMessage, checkServerHealth, createChat, LlmResponse } from "./api"
import { ChatManager, Chat, Message } from "./components/ChatManager"
import MessageList from "./components/chat/MessageList"
import MessageForm from "./components/chat/MessageForm"
import ChatSidebar from "./components/chat/ChatSidebar"
import Header from "./components/layout/Header"
import ErrorMessage from "./components/shared/ErrorMessage"
import "./App.css"

interface ApiError {
  message: string
  shownInChat?: boolean
}

function App() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={<ChatInterface isNewChat={true} />} 
      />
      
      <Route 
        path="/chat/:chatId" 
        element={<ChatInterface isNewChat={false} />} 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const ChatInterface = ({ isNewChat }: { isNewChat: boolean }) => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [chats, setChats] = useState<Chat[]>([]);
  
  const isInternalNavigation = useRef(false);
  const persistMessages = useRef<Message[]>([]);
  const isCreatingChat = useRef(false);
  const isSwitchingChat = useRef(false);
  
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    if (isNewChat) {
      console.log("NEW CHAT ROUTE - clearing localStorage");
      localStorage.removeItem("activeChatId");
      persistMessages.current = []; // Clear persisted messages for new chat
      return null;
    }
    
    if (chatId) {
      console.log("CHAT ROUTE - using chatId from URL:", chatId);
      return chatId;
    }
    
    return null;
  });
  
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (persistMessages.current.length > 0 && isInternalNavigation.current) {
      console.log("Restoring persisted messages after navigation");
      setMessages(persistMessages.current);
      isInternalNavigation.current = false;
    } else if (isNewChat && !isInternalNavigation.current) {
      console.log("On new chat route, clearing messages");
      setMessages([]);
      persistMessages.current = [];
    }
  }, [isNewChat]);

  // Update activeChatId when chatId parameter changes
  useEffect(() => {
    if (chatId && chatId !== activeChatId) {
      console.log("URL chatId changed, updating activeChatId:", chatId);
      setActiveChatId(chatId);
    }
  }, [chatId, activeChatId]);

  useEffect(() => {
    console.log("activeChatId changed to:", activeChatId);
    if (activeChatId) {
      localStorage.setItem("activeChatId", activeChatId);
    } else if (!isNewChat) {
      localStorage.removeItem("activeChatId");
    }
  }, [activeChatId, isNewChat]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerHealth();
        setBackendStatus(isConnected ? "connected" : "disconnected");
      } catch (error) {
        setBackendStatus("disconnected");
        console.error("Backend connection error:", error);
      }
    };
    
    checkConnection();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim()) return;

    setError(null);

    const userMessage: Message = {
      text: input,
      sender: "user",
      tokenSize: "calculating...",
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, userMessage];
      persistMessages.current = updatedMessages;
      return updatedMessages;
    });
    
    setIsLoading(true);

    const currentInput = input;
    setInput("");

    try {
      if (!activeChatId) {
        console.log(
          "Creating a new chat with message:",
          currentInput.substring(0, 30),
        );
        
        isCreatingChat.current = true;
        
        const newChatData = await createChat(currentInput);

        if (!newChatData.chatId) {
          throw new Error("Server did not return a valid chat ID");
        }

        console.log("New chat created with ID:", newChatData.chatId);
        
        setActiveChatId(newChatData.chatId);
        
        const llmResponse: LlmResponse = newChatData.response || {
          text: "I received your message, but couldn't formulate a response.",
        };

        const promptTokenSize = llmResponse.promptTokenSize
          ? String(llmResponse.promptTokenSize)
          : "?";
        const responseTokenSize = llmResponse.responseTokenSize
          ? String(llmResponse.responseTokenSize)
          : "?";

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];

          if (updatedMessages.length > 0) {
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              if (updatedMessages[i].sender === "user") {
                updatedMessages[i] = {
                  ...updatedMessages[i],
                  tokenSize: promptTokenSize,
                };
                break;
              }
            }
          }

          const newMessages = [
            ...updatedMessages,
            {
              text: llmResponse.text,
              tokenSize: responseTokenSize,
              sender: "ai",
              timestamp: new Date().toISOString(),
            },
          ];
          
          persistMessages.current = newMessages;
          
          return newMessages;
        });
        
        isInternalNavigation.current = true;
        
        navigate(`/chat/${newChatData.chatId}`, { replace: true });
        
        isCreatingChat.current = false;
        
      } else {
        console.log(
          `Sending message to existing chat ${activeChatId}:`,
          currentInput.substring(0, 30),
        );
        
        const response = await sendMessage(currentInput, activeChatId);

        const llmResponse: LlmResponse =
          typeof response.response === "object"
            ? response.response
            : {
                text:
                  response.response ||
                  "I received your message, but couldn't formulate a response.",
              };

        const promptTokenSize = llmResponse.promptTokenSize
          ? String(llmResponse.promptTokenSize)
          : "?";
        const responseTokenSize = llmResponse.responseTokenSize
          ? String(llmResponse.responseTokenSize)
          : "?";

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];

          if (updatedMessages.length > 0) {
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              if (updatedMessages[i].sender === "user") {
                updatedMessages[i] = {
                  ...updatedMessages[i],
                  tokenSize: promptTokenSize,
                };
                break;
              }
            }
          }

          const newMessages = [
            ...updatedMessages,
            {
              text: llmResponse.text,
              tokenSize: responseTokenSize,
              sender: "ai",
              timestamp: new Date().toISOString(),
            },
          ];
          
          persistMessages.current = newMessages;
          
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      setError({ message: errorMessage });

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];

        if (updatedMessages.length > 0) {
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].sender === "user") {
              updatedMessages[i] = {
                ...updatedMessages[i],
                tokenSize: "?",
              };
              break;
            }
          }
        }

        const newMessages = [
          ...updatedMessages,
          {
            text:
              "Sorry, there was an error processing your request: " +
              errorMessage,
            tokenSize: "0",
            sender: "system",
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ];
        
        persistMessages.current = newMessages;
        
        return newMessages;
      });
      
      isCreatingChat.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = useCallback(() => {
    console.log("Starting new chat - navigating to root");
    
    setMessages([]);
    
    persistMessages.current = [];
    
    setActiveChatId(null);
    
    navigate('/', { replace: true });
  }, [navigate]);

  const handleSelectChat = useCallback((chatId: string) => {
    if (activeChatId === chatId) {
      console.log("Already on this chat, no need to navigate");
      return;
    }
    
    console.log("Selecting chat:", chatId);
    
    persistMessages.current = [];
    
    setMessages([]);
    
    isSwitchingChat.current = true;
    
    navigate(`/chat/${chatId}`, { replace: true });
  }, [activeChatId, navigate]);

  const handleChatsLoaded = useCallback(
    (loadedChats: Chat[]) => {
      setChats(loadedChats);

      if (activeChatId && loadedChats.length > 0) {
        const chatExists = loadedChats.some((chat) => chat.id === activeChatId);
        if (!chatExists) {
          console.warn(
            `Active chat ID ${activeChatId} not found in user chats, resetting.`,
          );
          persistMessages.current = [];
          navigate('/', { replace: true });
        }
      }
    },
    [activeChatId, navigate],
  );

  const handleChatMessagesLoaded = useCallback((loadedMessages: Message[]) => {
    if (isCreatingChat.current) {
      console.log("In the middle of creating a chat, not loading messages from server");
      return;
    }
    
    if (persistMessages.current.length > 0 && isInternalNavigation.current) {
      console.log("Using persisted messages instead of loading from server (internal nav)");
      return;
    }
    
    if (isSwitchingChat.current) {
      console.log("Switching chats, loading messages from server");
      setMessages(loadedMessages);
      persistMessages.current = loadedMessages;
      isSwitchingChat.current = false;
      return;
    }
    
    if (persistMessages.current.length === 0) {
      console.log("No persisted messages, loading from server");
      setMessages(loadedMessages);
      persistMessages.current = loadedMessages;
    } else {
      console.log("Using persisted messages instead of loading from server");
    }
  }, []);

  const toggleSidebar = () => {
    setIsChatSidebarOpen(!isChatSidebarOpen);
  };

  return (
    <div className="app">
      <ChatManager
        activeChatId={activeChatId}
        onChatsLoaded={handleChatsLoaded}
        onChatMessagesLoaded={handleChatMessagesLoaded}
        onError={setError}
        isNewChat={isNewChat}
        skipMessageLoading={isCreatingChat.current}
      />

      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      <div className="chat-main">
        <Header 
          onMenuClick={toggleSidebar}
          backendStatus={backendStatus}
        />

        <MessageList 
          messages={messages}
          isLoading={isLoading}
        />

        {error && (
          <ErrorMessage 
            message={error.message}
            onDismiss={() => setError(null)}
          />
        )}

        <MessageForm
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          backendStatus={backendStatus}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default App;
