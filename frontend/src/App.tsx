import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { sendMessage, loadMessageHistory, clearMessageHistory, checkServerHealth, Message } from './api';
import CodeFormatter from './CodeFormatter';
import './App.css';

interface ApiError {
  message: string;
  shownInChat?: boolean;
}

function App() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>(() => loadMessageHistory());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkServerHealth();
        setBackendStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('Backend connection error:', error);
      }
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount with a small delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    setError(null);
    
    const userMessage: Message = { 
      text: input, 
      sender: 'user', 
      timestamp: new Date().toISOString() 
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const data = await sendMessage(input);
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          text: data.response || "I received your message, but couldn't formulate a response.", 
          sender: 'ai',
          timestamp: new Date().toISOString() 
        }
      ]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setError({ message: errorMessage });
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          text: "Sorry, there was an error processing your request: " + errorMessage, 
          sender: 'system',
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
      // Try to focus the input with a small delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  // Function to manually focus the input when clicked
  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearChat = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all messages?')) {
      setMessages([]);
      clearMessageHistory();
    }
  }, []);

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app">
      <div className="header">
        <div className="title-area">
          <h1>AI Chat</h1>
          <div className={`status-indicator ${backendStatus}`}>
            {backendStatus === 'connected' ? 'Online' : 
             backendStatus === 'checking' ? 'Connecting...' : 'Offline'}
          </div>
        </div>
        <button className="clear-button" onClick={handleClearChat}>
          Clear Chat
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-icon">✨</div>
            <h2>How can I help you today?</h2>
            <p>Type a message below to start a conversation</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.sender}`}
          >
            <div className="message-content">
              {/* Use our CodeFormatter component for all messages */}
              <CodeFormatter text={message.text} />
              <span className="timestamp">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-content loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-message">
          <p>{error.message}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-container" onClick={handleInputClick}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || backendStatus !== 'connected'}
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading || !input.trim() || backendStatus !== 'connected'}
          className={isLoading ? 'loading' : ''}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default App;
