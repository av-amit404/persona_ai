class PersonaChatApp {
    constructor() {
        this.socket = io();
        this.currentPersona = null;
        this.isTyping = false;
        this.theme = localStorage.getItem('theme') || 'light';
        this.userScrolled = false; // Track if user manually scrolled
        
        this.initializeTheme();
        this.setupEventListeners();
        this.loadPersonas();
        this.checkHealth();
        // Code for LLM selection in UI
        // this.loadLLMProvider();
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        // Code for LLM selection in UI
        // LLM provider change
       /* document.getElementById('llm-provider').addEventListener('change', (e) => {
            this.changeLLMProvider(e.target.value);
        });*/

        // Message input
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });

        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Chat messages scroll detection
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Socket event listeners
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('persona-joined', (data) => {
            this.handlePersonaJoined(data);
        });

        this.socket.on('message', (message) => {
            this.displayMessage(message);
        });

        this.socket.on('typing', (data) => {
            this.handleTyping(data);
        });

        this.socket.on('error', (error) => {
            this.showError(error.message);
        });

        this.socket.on('chat-cleared', () => {
            document.getElementById('chat-messages').innerHTML = '';
            this.userScrolled = false; // Reset scroll state
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            document.getElementById('connection-status').textContent = 'Connected';
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            document.getElementById('connection-status').textContent = 'Disconnected - trying to reconnect...';
            document.getElementById('connection-status').classList.remove('hidden');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            document.getElementById('connection-status').textContent = 'Connection failed';
            document.getElementById('connection-status').classList.remove('hidden');
        });
    }

    handleScroll() {
        const messagesContainer = document.getElementById('chat-messages');
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        
        // Check if user is near the bottom (within 50px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        
        // Update userScrolled state
        this.userScrolled = !isNearBottom;
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }

    async loadPersonas() {
        try {
            console.log('Loading personas...');
            const response = await fetch('/api/personas');
            console.log('Personas response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const personas = await response.json();
            console.log('Loaded personas:', personas);
            this.renderPersonas(personas);
        } catch (error) {
            console.error('Error loading personas:', error);
            // Show error message to user
            const personaList = document.getElementById('persona-list');
            personaList.innerHTML = `
                <div style="color: red; padding: 1rem; text-align: center;">
                    <p>Failed to load personas</p>
                    <p>Error: ${error.message}</p>
                    <button onclick="window.location.reload()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    renderPersonas(personas) {
        console.log('Rendering personas:', personas);
        const personaList = document.getElementById('persona-list');
        personaList.innerHTML = '';

        if (!personas || personas.length === 0) {
            personaList.innerHTML = '<p>No personas available</p>';
            return;
        }

        personas.forEach(persona => {
            const personaCard = document.createElement('div');
            personaCard.className = 'persona-card';
            personaCard.dataset.personaId = persona.id;
            
            personaCard.innerHTML = `
                <div class="persona-header">
                    <img src="${persona.avatar}" alt="${persona.name}" class="persona-avatar">
                    <div>
                        <div class="persona-name">${persona.name}</div>
                    </div>
                </div>
            `;

            personaCard.addEventListener('click', () => {
                this.selectPersona(persona.id);
            });

            personaList.appendChild(personaCard);
        });
    }

    selectPersona(personaId) {
        // Update UI
        document.querySelectorAll('.persona-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-persona-id="${personaId}"]`).classList.add('active');

        // Clear chat and join new persona
        this.socket.emit('clear-chat');
        this.socket.emit('join-persona', { personaId });

        // Show chat interface
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('chat-interface').classList.remove('hidden');
        
        // Reset scroll state
        this.userScrolled = false;
    }

    handlePersonaJoined(data) {
        this.currentPersona = data.persona;
        
        // Update chat header
        const chatHeader = document.getElementById('chat-header');
        chatHeader.innerHTML = `
            <img src="${data.persona.avatar}" alt="${data.persona.name}" class="chat-avatar">
            <div class="chat-persona-name">${data.persona.name}</div>
        `;

        // Update typing indicator avatar
        document.getElementById('typing-avatar').src = data.persona.avatar;
        document.getElementById('typing-name').textContent = data.persona.name;

        // Clear previous messages
        document.getElementById('chat-messages').innerHTML = '';
        
        // Add test messages to verify scrolling (remove in production)
        // this.addTestMessages();
        
        // Reset scroll state
        this.userScrolled = false;
    }

    // addTestMessages() {
    //     // Add some test messages to verify scrolling works
    //     const testMessages = [
    //         { sender: 'ai', content: 'Hello! I am ' + this.currentPersona.name + '. It\'s wonderful to meet you!', timestamp: new Date() },
    //         { sender: 'user', content: 'Hi there! Great to meet you too!', timestamp: new Date() },
    //         { sender: 'ai', content: 'What would you like to discuss today? I have many stories and experiences to share.', timestamp: new Date() },
    //         { sender: 'user', content: 'Tell me about your most memorable experience.', timestamp: new Date() },
    //         { sender: 'ai', content: 'That\'s a fascinating question! Let me think about the moments that truly shaped who I am...', timestamp: new Date() },
    //         { sender: 'user', content: 'I\'m all ears!', timestamp: new Date() },
    //         { sender: 'ai', content: 'Well, there was this one time when everything changed. It was a moment that defined not just my path, but how I see the world entirely.', timestamp: new Date() },
    //         { sender: 'user', content: 'That sounds incredible. Please tell me more details.', timestamp: new Date() },
    //         { sender: 'ai', content: 'The details are quite vivid in my memory. I remember the exact feeling, the sounds, the atmosphere...', timestamp: new Date() },
    //         { sender: 'user', content: 'Your storytelling is captivating!', timestamp: new Date() },
    //         { sender: 'ai', content: 'Thank you for saying that. I believe every experience, no matter how small, has something valuable to teach us.', timestamp: new Date() },
    //         { sender: 'user', content: 'I completely agree with that philosophy.', timestamp: new Date() },
    //         { sender: 'ai', content: 'It\'s refreshing to meet someone who appreciates the depth of human experience. What about you? What experiences have shaped your worldview?', timestamp: new Date() }
    //     ];

    //     testMessages.forEach(message => {
    //         setTimeout(() => {
    //             this.displayMessage(message);
    //         }, 100);
    //     });
    // }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || this.isTyping) return;

        this.socket.emit('send-message', { content: message });
        messageInput.value = '';
        
        // Reset textarea height
        this.autoResizeTextarea(messageInput);
        
        // Focus back on input for better UX
        messageInput.focus();
        
        // Auto-scroll after sending message
        this.userScrolled = false;
        this.scrollMessagesToBottom();
    }

    displayMessage(message) {
        console.log('Displaying message:', message.sender, message.content.substring(0, 50) + '...');
        
        const messagesContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        if (message.sender === 'ai') {
            messageElement.innerHTML = `
                <img src="${this.currentPersona.avatar}" alt="${this.currentPersona.name}" class="message-avatar">
                <div class="message-content">
                    ${this.formatMessage(message.content)}
                    <div class="message-timestamp">${timestamp}</div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    ${this.formatMessage(message.content)}
                    <div class="message-timestamp">${timestamp}</div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageElement);
        console.log('Messages container children count:', messagesContainer.children.length);
        
        // Only auto-scroll if user hasn't manually scrolled up
        if (!this.userScrolled) {
            this.scrollMessagesToBottom();
        }
    }

    scrollMessagesToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            // Use requestAnimationFrame to ensure DOM has updated
            requestAnimationFrame(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        }
    }

    formatMessage(content) {
        // Simple formatting for line breaks
        return content.replace(/\n/g, '<br>');
    }

    handleTyping(data) {
        const typingIndicator = document.getElementById('typing-indicator');
        
        if (data.isTyping) {
            this.isTyping = true;
            typingIndicator.classList.remove('hidden');
            
            // Auto-scroll to show typing indicator if user is at bottom
            if (!this.userScrolled) {
                this.scrollMessagesToBottom();
            }
        } else {
            this.isTyping = false;
            typingIndicator.classList.add('hidden');
        }
    }

    autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the new height
        const newHeight = Math.min(textarea.scrollHeight, 120);
        const minHeight = 44; // Minimum height for single line
        
        // Set the height to the larger of newHeight or minHeight
        textarea.style.height = Math.max(newHeight, minHeight) + 'px';
    }

    showError(message) {
        // You could implement a toast notification system here
        console.error('Chat error:', message);
        alert('Error: ' + message);
    }

    // Code for LLM selection in UI
    /*async changeLLMProvider(provider) {
        try {
            const response = await fetch('/api/llm-provider', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('LLM provider changed to:', result.provider);
            }
        } catch (error) {
            console.error('Error changing LLM provider:', error);
        }
    }

    async loadLLMProvider() {
        try {
            const response = await fetch('/api/llm-provider');
            const data = await response.json();
            document.getElementById('llm-provider').value = data.provider;
        } catch (error) {
            console.error('Error loading LLM provider:', error);
        }
    }*/

    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            const health = await response.json();
            
            const hasConnection = health.connections.openai || health.connections.gemini;
            const statusElement = document.getElementById('connection-status');
            
            if (!hasConnection) {
                statusElement.classList.remove('hidden');
                statusElement.textContent = 'No LLM connections available. Please check your API keys.';
            } else {
                statusElement.classList.add('hidden');
            }
            
            console.log('Health check:', health);
        } catch (error) {
            console.error('Health check failed:', error);
            document.getElementById('connection-status').classList.remove('hidden');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PersonaChatApp();
});