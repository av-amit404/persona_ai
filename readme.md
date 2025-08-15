# 🎭 Persona Chat - AI Chat Application

Engage in meaningful conversations with AI-powered teachers like Hitesh sir and Piyush sir, using a modern web app built with Node.js and Socket.IO, supporting OpenAI and Google Gemini LLMs.

## ✨ Features

- **Authentic Personas**: Chat with Hitesh sir and Piyush sir with some context
- **Real-time Chat**: WebSocket-based real-time messaging with typing indicators
- **Modern UI**: Beautiful, responsive interface with dark/light mode toggle
- **Context Aware**: AI remembers conversation history until persona switch

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- OpenAI API key (optional, if using OpenAI)
- Google Gemini API key (optional, if using Gemini)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your API keys in `.env`:**
   ```env
   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Google Gemini API Configuration  
   GEMINI_API_KEY=your_gemini_api_key_here

   # Server Configuration
   PORT=3000

   # LLM Provider Settings
   DEFAULT_LLM_PROVIDER=openai
   ```

4. **Start the application:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🔑 Getting API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key to your `.env` file

### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file


## 🎨 Theme Support

- **Light Mode**: Clean, bright interface
- **Dark Mode**: Easy on the eyes for low-light use
- **Auto-save**: Theme preference saved locally

## 🔍 API Endpoints

- `GET /api/personas` - List available personas
- `GET /api/llm-provider` - Get current LLM provider
- `GET /api/health` - Check API connections and status

## 🔌 WebSocket Events

- `join-persona` - Switch to a specific persona
- `send-message` - Send a message to the AI
- `message` - Receive messages from AI or user
- `typing` - Typing indicator status
- `clear-chat` - Clear chat history

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### File Structure
- **Frontend**: Single HTML file with embedded CSS and JavaScript
- **Backend**: Node.js with Express and Socket.IO
- **Real-time**: WebSocket communication for instant messaging
- **Storage**: In-memory (no database required)

### Adding Features
1. **New LLM Providers**: Extend `llmservice.js`
2. **New Personas**: Add to `personas.js`  
3. **UI Enhancements**: Modify `public/index.html`
4. **Server Logic**: Update `server.js`


## ❗ Troubleshooting

### Common Issues

**"No LLM connections available"**
- Check your API keys in `.env` file
- Ensure you have credits/quota available
- Verify network connectivity

**Chat not working**
- Refresh the page
- Check browser console for errors
- Verify WebSocket connection

**Persona not responding**
- Check API key validity
- Verify LLM provider settings
- Look at server logs for errors

### Debug Mode
Check the browser console and server logs for detailed error information.
