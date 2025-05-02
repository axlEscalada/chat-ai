# Chat AI

A full-stack TypeScript application that provides a modern chat interface with LLM integration.

## Features

- **Gemini Integration**: Connect with Google's Gemini API for AI-powered conversations
- **Content Generation Options**: Generate content normally or use streaming for real-time responses
- **Token Management**:
  - Count tokens for prompts
  - Display token usage for all chat interactions
- **Session Management**: Store and retrieve chat history using session data
- **Rich Text Formatting**: Full Markdown and code syntax highlighting support

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- Firebase (for data storage)

### Frontend

- React
- TypeScript
- Tailwind CSS
- Markdown rendering

## Project Structure

```
.
├── README.md
├── frontend
│   ├── README.md
│   ├── package.json
│   ├── postcss.config.js
│   ├── public
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── index.html
│   │   └── ...
│   ├── src
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── components
│   │   │   ├── ChatManager.tsx
│   │   │   ├── chat
│   │   │   │   ├── ChatSidebar.tsx
│   │   │   │   ├── LLMFormatter.tsx
│   │   │   │   ├── MessageForm.tsx
│   │   │   │   ├── MessageItem.tsx
│   │   │   │   └── MessageList.tsx
│   │   │   ├── layout
│   │   │   │   ├── Header.tsx
│   │   │   │   └── StatusIndicator.tsx
│   │   │   └── shared
│   │   │       └── ErrorMessage.tsx
│   │   └── ...
│   ├── tailwind.config.js
│   └── tsconfig.json
├── package.json
└── server
    ├── api
    │   ├── index.ts
    │   ├── repositories
    │   │   ├── chatRepository.ts
    │   │   ├── firebaseRepository.ts
    │   │   └── repositoryFactory.ts
    │   ├── routes
    │   │   ├── chatController.ts
    │   │   └── routes.ts
    │   └── services
    │       ├── chatService.ts
    │       ├── llmService.ts
    │       └── providers
    │           └── geminiLlmService.ts
    ├── jest.config.js
    ├── package.json
    ├── tests
    │   ├── chatController.test.ts
    │   ├── chatService.test.ts
    │   └── testSetup.ts
    ├── tsconfig.json
    └── vercel.json
```

## Getting Started

### Prerequisites

- Node.js (v16.x or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/axlEscalada/chat-ai.git
   cd chat-ai
   ```

2. Install dependencies

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Environment Setup

   Create a `.env` file in the server directory:

   ```
   PORT=3001
   GEMINI_API_KEY=""
   FIREBASE_API_KEY=""
   FIREBASE_AUTH_DOMAIN=""
   FIREBASE_PROJECT_ID=""
   FIREBASE_STORAGE_BUCKET=""
   FIREBASE_MESSAGING_SENDER_ID=""
   FIREBASE_APP_ID=""
   ```

   Create a `.env` file in the frontend directory:

   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

### Running the Application

From the root directory, you can start both the backend and frontend simultaneously:

```bash
npm run dev
```

Or run them separately:

```bash
# Start backend server
cd server
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

The application will be available at http://localhost:3000

## Development

### Backend Development

```bash
cd server
npm start
```

### Frontend Development

```bash
cd frontend
npm start
```

## API Documentation

The backend provides the following API endpoints:

- `POST /api/chats`: Create a new chat

  - Returns: New chat object

- `GET /api/chats/:chatId`: Get a specific chat

  - Returns: Chat details

- `POST /api/prompt`: Send a regular message to LLM

  - Body: `{ prompt: string, ... }`
  - Returns: LLM response

- `POST /api/prompt/stream`: Send a message with streaming response

  - Body: `{ prompt: string, ... }`
  - Returns: Stream of LLM response chunks

- `POST /api/prompt/tokens`: Count tokens for a prompt

  - Body: `{ prompt: string }`
  - Returns: Token count information

- `GET /api/sessions/:sessionId/chats`: Get all chats for a user session
  - Returns: Array of chat objects
