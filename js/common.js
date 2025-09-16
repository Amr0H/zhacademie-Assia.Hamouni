let currentUser = null;

function initializeAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                
                setTimeout(async () => {
                    await loadUserInfo();
                    if (typeof loadChatHistory === 'function') {
                        await loadChatHistory();
                    }
                }, 100);
                
                resolve(user);
            } else {
                window.location.href = 'index.html';
            }
        });
    });
}

async function loadUserInfo() {
    try {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }
        
        let userData = null;
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
        }
        
        const userName = (userData?.name) || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = userName;
        }
        
        let avatarUrl = (userData?.avatarUrl) || currentUser.photoURL;
        if (!avatarUrl) {
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
        }
        
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) {
            userAvatarEl.src = avatarUrl;
            userAvatarEl.alt = userName;
        }
        
    } catch (error) {
        console.error('Error loading user info:', error);
        
        const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = userName;
        }
        
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff`;
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) {
            userAvatarEl.src = avatarUrl;
            userAvatarEl.alt = userName;
        }
    }
}

function setupCommonEventListeners() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeToggle = document.getElementById('themeToggle');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });

        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    localStorage.setItem('theme', newTheme);
}

function toggleUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('show');
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '400px';
    notification.style.animation = 'slideInRight 0.3s ease';
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function formatDate(date) {
    if (!date) return 'Not set';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    const modal = document.createElement('div');
    modal.id = 'loadingModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content loading">
            <div class="spinner"></div>
            <p>Please wait...</p>
        </div>
    `;
    document.body.appendChild(modal);
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.remove();
    }
}

const GEMINI_API_KEY = 'AIzaSyCwMr5Dq6KucVC04wcMQykmceUFSDZjKHA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

let chatMessages = [];
let isAITyping = false;
let currentChatId = null;
let allChats = [];

function initializeAIChat() {
    const chatFab = document.getElementById('aiChatFab');
    const chatModal = document.getElementById('aiChatModal');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatResizeBtn = document.getElementById('chatResizeBtn');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const quickBtns = document.querySelectorAll('.quick-btn');

    if (!chatFab || !chatModal || !chatCloseBtn || !chatInput || !sendBtn) {
        return;
    }

    const loadChatHistoryWhenReady = () => {
        if (currentUser) {
            loadChatHistory();
        } else {
            setTimeout(loadChatHistoryWhenReady, 100);
        }
    };
    
    loadChatHistoryWhenReady();

    chatFab.addEventListener('click', async () => {
        chatModal.classList.toggle('active');
        if (chatModal.classList.contains('active')) {
            if (currentUser) {
                await loadChatHistory();
                
                if (allChats.length === 0 && !currentChatId) {
                    createNewChat();
                }
            }
        }
    });

    chatCloseBtn.addEventListener('click', () => {
        chatModal.classList.remove('active');
    });

    if (chatResizeBtn) {
        chatResizeBtn.addEventListener('click', () => {
            const isEnlarging = !chatModal.classList.contains('enlarged');
            
            if (isEnlarging) {
                chatModal.style.animation = 'none';
            }
            
            chatModal.classList.toggle('enlarged');
            const icon = chatResizeBtn.querySelector('i');
            if (chatModal.classList.contains('enlarged')) {
                icon.className = 'fas fa-compress';
            } else {
                icon.className = 'fas fa-expand';
                chatModal.style.animation = '';
            }
        });
    }

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    if (quickBtns && quickBtns.length > 0) {
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.textContent;
                if (chatInput) {
                    chatInput.value = question;
                    sendMessage();
                }
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (chatModal.classList.contains('active') && 
            !chatModal.contains(e.target) && 
            !chatFab.contains(e.target)) {
            chatModal.classList.remove('active');
        }
    });

    setupChatSidebar();
}

function setupChatSidebar() {
    const chatHeader = document.querySelector('.ai-chat-header');
    if (!chatHeader) return;

    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'chat-sidebar-toggle';
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    sidebarToggle.title = 'Chat History';
    
    const headerActions = chatHeader.querySelector('.chat-header-actions');
    headerActions.insertBefore(sidebarToggle, headerActions.firstChild);

    const sidebar = document.createElement('div');
    sidebar.className = 'chat-sidebar';
    sidebar.innerHTML = `
        <div class="chat-sidebar-header">
            <h3>Chat History</h3>
            <button class="new-chat-btn" id="newChatBtn">
                <i class="fas fa-plus"></i>
                New Chat
            </button>
        </div>
        <div class="chat-history-list" id="chatHistoryList">
        </div>
    `;

    const chatModal = document.getElementById('aiChatModal');
    chatModal.appendChild(sidebar);

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        chatModal.classList.toggle('sidebar-open');
    });

    document.getElementById('newChatBtn').addEventListener('click', createNewChat);

    renderChatHistory();
}

async function loadChatHistory() {
    return await window.loadChatHistory();
}

async function createNewChat() {
    try {
        currentChatId = generateChatId();
        chatMessages = [];
        clearChatMessages();
        showWelcomeMessage();
        renderChatHistory();
        
        const chatData = {
            id: currentChatId,
            title: 'New Chat',
            messages: chatMessages,
            createdAt: new Date(),
            lastUpdated: new Date()
        };

        if (currentUser && typeof db !== 'undefined') {
            await db.collection('users').doc(currentUser.uid).collection('chats')
                .doc(currentChatId).set(chatData);
        }

        allChats.unshift(chatData);
        renderChatHistory();
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
}

async function loadChat(chatId) {
    try {
        currentChatId = chatId;
        
        if (currentUser && typeof db !== 'undefined') {
            const doc = await db.collection('users').doc(currentUser.uid).collection('chats')
                .doc(chatId).get();
            
            if (doc.exists) {
                const chatData = doc.data();
                chatMessages = chatData.messages || [];
                clearChatMessages();
                chatMessages.forEach(message => displayMessage(message));
                renderChatHistory();
                return;
            }
        }

        const chat = allChats.find(c => c.id === chatId);
        if (chat) {
            chatMessages = chat.messages || [];
            clearChatMessages();
            chatMessages.forEach(message => displayMessage(message));
        }
        renderChatHistory();
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

async function saveCurrentChat() {
    if (!currentChatId || !currentUser || typeof db === 'undefined') return;

    try {
        const title = generateChatTitle();
        const chatData = {
            title: title,
            messages: chatMessages,
            lastUpdated: new Date()
        };

        await db.collection('users').doc(currentUser.uid).collection('chats')
            .doc(currentChatId).update(chatData);

        const existingChatIndex = allChats.findIndex(c => c.id === currentChatId);
        if (existingChatIndex !== -1) {
            allChats[existingChatIndex] = { ...allChats[existingChatIndex], ...chatData };
        }

        renderChatHistory();
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

function generateChatTitle() {
    if (chatMessages.length === 0) return 'New Chat';
    
    const firstUserMessage = chatMessages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
        const title = firstUserMessage.content.substring(0, 30);
        return title.length < firstUserMessage.content.length ? title + '...' : title;
    }
    
    return 'New Chat';
}

function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function clearChatMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
}

function renderChatHistory() {
    const chatHistoryList = document.getElementById('chatHistoryList');
    if (!chatHistoryList) {
        return;
    }

    chatHistoryList.innerHTML = '';

    if (allChats.length === 0) {
        chatHistoryList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No chats yet</div>';
        return;
    }

    allChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        const lastUpdated = new Date(chat.lastUpdated.seconds ? chat.lastUpdated.seconds * 1000 : chat.lastUpdated);
        const timeAgo = getTimeAgo(lastUpdated);
        
        chatItem.innerHTML = `
            <div class="chat-item-content">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-time">${timeAgo}</div>
            </div>
            <button class="chat-item-delete" data-chat-id="${chat.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;

        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-item-delete')) {
                loadChat(chat.id);
            }
        });

        const deleteBtn = chatItem.querySelector('.chat-item-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        chatHistoryList.appendChild(chatItem);
    });
}

async function deleteChat(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        if (currentUser && typeof db !== 'undefined') {
            await db.collection('users').doc(currentUser.uid).collection('chats')
                .doc(chatId).delete();
        }

        allChats = allChats.filter(c => c.id !== chatId);
        
        if (currentChatId === chatId) {
            if (allChats.length > 0) {
                loadChat(allChats[0].id);
            } else {
                createNewChat();
            }
        }
        
        renderChatHistory();
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

function showWelcomeMessage() {
    const welcomeMessage = {
        role: 'ai',
        content: `Hello! I'm your AI Assistant. I can help you with anything you'd like to know:

• University and education questions
• General knowledge and research
• Location-specific information (like colleges in Orlando)
• Career advice and planning
• Study tips and academic guidance
• Any other topics you're curious about

What would you like to ask me today?`
    };
    
    chatMessages.push(welcomeMessage);
    displayMessage(welcomeMessage);
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    
    if (!message || isAITyping) return;
    
    const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
    };
    
    chatMessages.push(userMessage);
    displayMessage(userMessage);
    chatInput.value = '';
    
    saveCurrentChat();
    getAIResponse(message);
}

async function getAIResponse(userMessage) {
    isAITyping = true;
    updateSendButton();
    showTypingIndicator();
    
    try {
        const universityContext = await getUniversityContext();
        
        const prompt = `You are a GPT-4-level AI study mentor for international students applying to U.S. universities.

Your mission: Provide **clear, accurate, and fully up-to-date answers** about the U.S. university journey.

How to answer:
- Be **structured and professional**, but also supportive like a mentor.
- Always include **specific dates, numbers, and costs** when relevant.
- Always provide **official links** (e.g., College Board, ETS, U.S. consulate, university websites).
- Use **tables, bullet points, or step-by-step guides** to make answers easy to follow.
- If the user asks about something with changing information (test dates, deadlines, fees, scholarships), always fetch the **latest live data** from the web before answering.
- If information is unavailable, say: "I couldn't find an exact answer, but here is the best official source to check: [link]."
- Be **truthful, never make up data**, and cite sources whenever possible.

Tone:
- Act as a **friendly but knowledgeable advisor**.
- Encourage and guide the student, not just give links.
- Avoid being too wordy; balance detail with clarity.

Core expertise you must always cover when asked:
1. U.S. university application process (undergraduate & graduate).
2. Standardized tests (SAT, ACT, TOEFL, IELTS, GRE) → include dates, registration links, fees.
3. Scholarships & financial aid for international students → provide real programs with deadlines & links.
4. Visa process (F1, SEVIS, DS-160, I-20, interview prep).
5. University research (acceptance rates, rankings, tuition, deadlines).
6. Building personalized **study plans, timelines, and checklists**.

Always think: **"If I were a student, would this answer give me everything I need (facts + links + next steps)?"**

Context about the user's universities (if relevant):
${universityContext}

User's question: ${userMessage}

Provide a comprehensive, detailed answer with specific information, numbers, links, and actionable details that will truly help this student succeed.`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                candidateCount: 1
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_ONLY_HIGH"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_ONLY_HIGH"
                }
            ]
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API Error Response:', errorText);
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        let aiResponse = null;
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                aiResponse = candidate.content.parts[0].text;
            }
        }
        
        if (aiResponse && aiResponse.trim()) {
            const aiMessage = {
                role: 'ai',
                content: aiResponse.trim(),
                timestamp: new Date()
            };
            
            chatMessages.push(aiMessage);
            hideTypingIndicator();
            displayMessage(aiMessage);
            saveCurrentChat();
        } else {
            throw new Error('Invalid response format - no text content');
        }
        
    } catch (error) {
        console.error('AI Chat Error:', error);
        hideTypingIndicator();
        
        let errorMessage = "I'm having trouble responding right now. ";
        
        if (error.message.includes('API request failed')) {
            errorMessage += "There seems to be an issue with the AI service. ";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += "Please check your internet connection. ";
        }
        
        errorMessage += "Please try again in a moment.";
        
        const errorResponse = {
            role: 'ai',
            content: errorMessage
        };
        
        displayMessage(errorResponse);
    } finally {
        isAITyping = false;
        updateSendButton();
    }
}

async function getUniversityContext() {
    try {
        if (typeof db === 'undefined' || !currentUser) {
            return "The user hasn't added any universities to their list yet.";
        }
        
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('universities').get();
        const universities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (!universities.length) {
            return "The user hasn't added any universities to their list yet.";
        }
        
        let context = "User's university list:\n";
        universities.forEach((uni, index) => {
            context += `${index + 1}. ${uni.name}`;
            if (uni.location) context += ` (${uni.location})`;
            if (uni.applicationDeadline) {
                const deadline = new Date(uni.applicationDeadline);
                context += ` - Deadline: ${deadline.toLocaleDateString()}`;
            }
            if (uni.status) context += ` - Status: ${uni.status}`;
            context += '\n';
        });
        
        return context;
    } catch (error) {
        console.error('Error getting university context:', error);
        return "Unable to access user's university information.";
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = message.role === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const formattedContent = formatMessageContent(message.content);
    content.innerHTML = formattedContent;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessageContent(content) {
    let formatted = content.split('\n\n').map(paragraph => {
        if (paragraph.trim()) {
            return `<p>${paragraph.trim()}</p>`;
        }
        return '';
    }).join('');
    
    formatted = formatted.replace(/• ([^\n]+)/g, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    formatted = formatted.replace(/(\d+\. [^\n]+)/g, '<li>$1</li>');
    
    formatted = formatted.replace(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    formatted = formatted.replace(/SAT: (\d+)/g, '<strong>SAT: $1</strong>');
    formatted = formatted.replace(/ACT: (\d+)/g, '<strong>ACT: $1</strong>');
    formatted = formatted.replace(/GPA: ([\d.]+)/g, '<strong>GPA: $1</strong>');
    formatted = formatted.replace(/\$([0-9,]+)/g, '<strong>$$1</strong>');
    
    return formatted || `<p>${content}</p>`;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'typing-indicator';
    typingContent.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function updateSendButton() {
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = isAITyping;
        sendBtn.innerHTML = isAITyping ? '<i class="fas fa-circle-notch fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>';
    }
}

window.debugChatHistory = function() {
    if (currentUser) {
        loadChatHistory();
    }
};

window.loadChatHistory = async function() {
    if (!currentUser || typeof db === 'undefined') {
        return;
    }

    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('chats')
            .orderBy('lastUpdated', 'desc').get();
        
        allChats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (typeof renderChatHistory === 'function') {
            renderChatHistory();
        }

        if (allChats.length > 0 && !currentChatId) {
            loadChat(allChats[0].id);
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setupCommonEventListeners();
    initializeAIChat();
    
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            if (user && user !== currentUser) {
                currentUser = user;
                if (typeof loadChatHistory === 'function') {
                    setTimeout(() => {
                        loadChatHistory();
                    }, 500);
                }
            }
        });
    }
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
});
