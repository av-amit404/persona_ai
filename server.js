import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import llmService from './llmservice.js';
import personas from './personas.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store chat sessions in memory
const chatSessions = new Map();

// Debug route
app.get('/api/debug', (req, res) => {
  res.json({
    personas: Object.keys(personas),
    personaData: personas,
    llmProvider: llmService.getCurrentProvider(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/personas', (req, res) => {
  try {
    const personaList = Object.keys(personas).map(key => ({
      id: personas[key].id,
      name: personas[key].name,
      avatar: personas[key].avatar,
      greeting: personas[key].greeting
    }));
    console.log('Sending personas:', personaList);
    res.json(personaList);
  } catch (error) {
    console.error('Error in /api/personas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/llm-provider', (req, res) => {
  try {
    res.json({ provider: llmService.getCurrentProvider() });
  } catch (error) {
    console.error('Error in /api/llm-provider:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm-provider', (req, res) => {
  try {
    const { provider } = req.body;
    const success = llmService.setProvider(provider);
    if (success) {
      res.json({ success: true, provider: llmService.getCurrentProvider() });
    } else {
      res.status(400).json({ success: false, error: 'Invalid provider' });
    }
  } catch (error) {
    console.error('Error in POST /api/llm-provider:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const connections = await llmService.testConnection();
    res.json({
      status: 'ok',
      connections,
      currentProvider: llmService.getCurrentProvider()
    });
  } catch (error) {
    console.error('Error in /api/health:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      connections: { openai: false, gemini: false },
      currentProvider: llmService.getCurrentProvider()
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  let currentSessionId = null;
  let currentPersona = null;
  let messageHistory = [];

  // Join a chat session with a specific persona
  socket.on('join-persona', async (data) => {
    const { personaId } = data;
    
    if (!personas[personaId]) {
      socket.emit('error', { message: 'Invalid persona' });
      return;
    }

    // Clear previous session if switching personas
    if (currentSessionId) {
      chatSessions.delete(currentSessionId);
      messageHistory = [];
    }

    currentSessionId = `${socket.id}-${personaId}-${Date.now()}`;
    currentPersona = personas[personaId];
    
    chatSessions.set(currentSessionId, {
      personaId,
      messages: [],
      createdAt: new Date()
    });

    socket.emit('persona-joined', {
      persona: {
        id: currentPersona.id,
        name: currentPersona.name,
        avatar: currentPersona.avatar,
        greeting: currentPersona.greeting
      },
      sessionId: currentSessionId
    });

    // Send greeting message
    const greetingMessage = {
      id: Date.now(),
      content: currentPersona.greeting,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      persona: currentPersona.name
    };

    socket.emit('message', greetingMessage);
  });

  // Handle incoming messages
  socket.on('send-message', async (data) => {
    if (!currentPersona || !currentSessionId) {
      socket.emit('error', { message: 'No active persona session' });
      return;
    }

    const { content } = data;
    console.log(`Received message from user: "${content}"`);
    
    const userMessage = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message to history
    messageHistory.push({ role: 'user', content });
    
    // Emit user message
    socket.emit('message', userMessage);
    
    // Show typing indicator
    socket.emit('typing', { isTyping: true, persona: currentPersona.name });

    try {
      console.log(`Generating response for persona: ${currentPersona.name}`);
      
      // Generate AI response
      const aiResponse = await llmService.generateResponse(messageHistory, currentPersona);
      
      console.log(`Generated response: "${aiResponse.substring(0, 100)}..."`);
      
      // Add AI response to history
      messageHistory.push({ role: 'assistant', content: aiResponse });
      
      // Create response message
      const responseMessage = {
        id: Date.now() + 1,
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        persona: currentPersona.name
      };

      // Hide typing indicator and send response
      socket.emit('typing', { isTyping: false });
      
      // Add a slight delay for more natural feeling
      setTimeout(() => {
        socket.emit('message', responseMessage);
      }, 500);

    } catch (error) {
      console.error('Error generating response:', error);
      console.error('Error stack:', error.stack);
      
      socket.emit('typing', { isTyping: false });
      
      // Send more specific error message
      let errorMessage = 'Sorry, I encountered an error while processing your message.';
      
      if (error.message.includes('API key')) {
        errorMessage = 'API key issue. Please check your configuration in the .env file.';
      } else if (error.message.includes('quota') || error.message.includes('billing')) {
        errorMessage = 'API quota or billing issue. Please check your account.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network connection issue. Please try again.';
      }
      
      socket.emit('error', { 
        message: errorMessage,
        details: error.message
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentSessionId) {
      chatSessions.delete(currentSessionId);
    }
  });

  // Handle clear chat
  socket.on('clear-chat', () => {
    messageHistory = [];
    if (currentSessionId) {
      chatSessions.delete(currentSessionId);
    }
    socket.emit('chat-cleared');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log(`🔧 API endpoints:`);
  console.log(`   - GET  /api/personas - List available personas`);
  console.log(`   - GET  /api/llm-provider - Get current LLM provider`);
  console.log(`   - POST /api/llm-provider - Set LLM provider`);
  console.log(`   - GET  /api/health - Check API connections`);
  
  // Log loaded personas
  console.log('📋 Loaded personas:', Object.keys(personas));
  
  // Test LLM connections on startup
  llmService.testConnection().then(connections => {
    console.log('🔌 LLM Connection Status:');
    console.log(`   - OpenAI: ${connections.openai ? '✅' : '❌'}`);
    console.log(`   - Gemini: ${connections.gemini ? '✅' : '❌'}`);
    console.log(`   - Current Provider: ${llmService.getCurrentProvider()}`);
  }).catch(error => {
    console.error('❌ LLM connection test failed:', error);
  });
});