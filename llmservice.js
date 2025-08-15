// import 'dotenv/config';
// import { OpenAI } from 'openai';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// this.openai = new OpenAI({
//       apiKey: process.env.GEMINI_API_KEY,
//       baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
//     });



import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class LLMService {
  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize Gemini
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    this.currentProvider = process.env.DEFAULT_LLM_PROVIDER || 'openai';
  }

  setProvider(provider) {
    if (provider === 'openai' || provider === 'gemini') {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }

  getCurrentProvider() {
    return this.currentProvider;
  }

  async generateResponse(messages, persona) {
    try {
      console.log(`Generating response with ${this.currentProvider} for persona: ${persona.name}`);
      console.log('Message history length:', messages.length);
      
      if (this.currentProvider === 'openai') {
        return await this.generateOpenAIResponse(messages, persona);
      } else if (this.currentProvider === 'gemini') {
        return await this.generateGeminiResponse(messages, persona);
      } else {
        throw new Error(`Invalid LLM provider: ${this.currentProvider}`);
      }
    } catch (error) {
      console.error(`Error with ${this.currentProvider}:`, error);
      console.error('Error details:', error.message);
      
      // Check if it's an API key issue
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error(`API key issue with ${this.currentProvider}. Please check your configuration.`);
      }
      
      // Check if it's a quota/billing issue
      if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error(`Quota or billing issue with ${this.currentProvider}. Please check your account.`);
      }
      
      // Try fallback response for demo purposes
      const lastMessage = messages.filter(m => m.role === 'user').pop();
      if (lastMessage && (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)) {
        return this.generateFallbackResponse(lastMessage.content, persona);
      }
      
      throw error;
    }
  }

  generateFallbackResponse(userMessage, persona) {
    const responses = {
      einstein: [
        "I find your question most intriguing! As I often say, 'Imagination is more important than knowledge.' What aspects of this topic spark your curiosity?",
        "Ah, this reminds me of my work on relativity. Everything is relative, including our perspectives on complex matters. What do you think?",
        "In my experience, the most beautiful thing we can experience is the mysterious. Your question touches upon something quite profound."
      ],
      shakespeare: [
        "Ah, what light through yonder window breaks? Your words do stir my very soul! Pray, tell me more of this matter that weighs upon thy mind.",
        "All the world's a stage, and your question plays a most interesting part. What scene shall we explore together?",
        "There are more things in heaven and earth than are dreamt of in our philosophy. Your inquiry opens new realms of thought!"
      ]
    };
    
    const personaResponses = responses[persona.id] || responses.einstein;
    const randomResponse = personaResponses[Math.floor(Math.random() * personaResponses.length)];
    
    console.log('Using fallback response (no API keys configured)');
    return randomResponse + "\n\n(Note: This is a demo response. Please configure your API keys for full AI functionality.)";
  }

  async generateOpenAIResponse(messages, persona) {
    console.log('Using OpenAI API...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const systemMessage = {
      role: 'system',
      content: persona.systemPrompt + '\n\nBackground context: ' + persona.contextualBackground.join(', ')
    };

    console.log('Calling OpenAI with', messages.length + 1, 'messages');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
      temperature: 0.8,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    console.log('OpenAI response received:', response.length, 'characters');
    return response;
  }

  async generateGeminiResponse(messages, persona) {
    console.log('Using Gemini API...');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Convert OpenAI format to Gemini format
    const systemPrompt = persona.systemPrompt + '\n\nBackground context: ' + persona.contextualBackground.join(', ');
    
    // Build conversation history for Gemini
    let conversationText = systemPrompt + '\n\n';
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        conversationText += `Human: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationText += `${persona.name}: ${msg.content}\n`;
      }
    });

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      conversationText += `\nPlease respond as ${persona.name} to: ${lastUserMessage.content}`;
    }

    console.log('Calling Gemini with conversation length:', conversationText.length);

    const result = await model.generateContent(conversationText);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received:', text.length, 'characters');
    return text;
  }

  async testConnection() {
    const tests = {
      openai: false,
      gemini: false
    };

    console.log('Testing API connections...');

    // Test OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('Testing OpenAI connection...');
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        });
        tests.openai = true;
        console.log('✅ OpenAI connection successful');
      } catch (error) {
        console.error('❌ OpenAI connection failed:', error.message);
        tests.openai = false;
      }
    } else {
      console.log('⚠️ OpenAI API key not found');
    }

    // Test Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Testing Gemini connection...');
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        await model.generateContent('Hello');
        tests.gemini = true;
        console.log('✅ Gemini connection successful');
      } catch (error) {
        console.error('❌ Gemini connection failed:', error.message);
        tests.gemini = false;
      }
    } else {
      console.log('⚠️ Gemini API key not found');
    }

    console.log('Connection test results:', tests);
    return tests;
  }
}

const llmService = new LLMService();
export default llmService;