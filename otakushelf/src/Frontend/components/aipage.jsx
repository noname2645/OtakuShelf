import { useState, useRef, useEffect } from "react";
import AnimeCard from "./animecard";
import '../Stylesheets/aipage.css';
import { Header } from '../components/header.jsx';
import BottomNavBar from "../components/bottom.jsx";

const AIPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [conversationContext, setConversationContext] = useState({
        mood: 'neutral',
        suggestions: []
    });
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const API = import.meta.env.VITE_API_BASE_URL;
    const user = JSON.parse(localStorage.getItem("user"));

    // Auto-scroll to bottom when new messages are added
    const scrollToBottom = (instant = false) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
                behavior: instant ? "auto" : "smooth" 
            });
        }
    };

    // Check if user has scrolled up
    const checkScrollPosition = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    };

    // Scroll to bottom button handler
    const handleScrollToBottom = () => {
        scrollToBottom(true);
    };

    // Effect for auto-scrolling when messages change
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === "user" || (!loading && lastMessage.role === "ai")) {
                setTimeout(() => scrollToBottom(), 100);
            }
        }
    }, [messages, loading]);

    // Effect for initial scroll and scroll event listener
    useEffect(() => {
        // Load previous conversation
        const savedConvo = localStorage.getItem('ai_conversation');
        if (savedConvo) {
            const parsedConvo = JSON.parse(savedConvo);
            setMessages(parsedConvo);
            // Scroll to bottom after messages are loaded
            setTimeout(() => scrollToBottom(true), 300);
        }

        // Add scroll event listener
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.addEventListener('scroll', checkScrollPosition);
        }

        return () => {
            if (chatContainer) {
                chatContainer.removeEventListener('scroll', checkScrollPosition);
            }
        };
    }, []);

    // Check scroll position when messages change
    useEffect(() => {
        setTimeout(() => checkScrollPosition(), 100);
    }, [messages, loading]);

    // Save conversation to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('ai_conversation', JSON.stringify(messages.slice(-50)));
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userText = input;

        // Add user message
        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                text: userText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                id: Date.now()
            },
        ]);

        setInput("");
        setLoading(true);

        // Auto-scroll to show user message immediately
        setTimeout(() => scrollToBottom(), 50);

        try {
            const res = await fetch(`${API}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    message: userText,
                    userId: user?._id || user?.id,
                    context: conversationContext
                }),
            });

            const data = await res.json();

            // Update conversation context
            setConversationContext(prev => ({
                ...prev,
                mood: data.context?.mood || 'neutral',
                suggestions: data.context?.suggestions || []
            }));

            // Add AI message
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: data.reply,
                    anime: data.anime || [],
                    context: data.context,
                    suggestions: data.context?.suggestions || [],
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    mood: data.context?.mood || 'neutral',
                    id: Date.now() + 1
                },
            ]);

        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "Hmm, having a little trouble connecting. Try again in a moment! 🌸",
                    isError: true,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    id: Date.now() + 1
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Quick prompts for easy interaction
    const quickPrompts = [
        "Recommend me a comedy anime",
        "I'm in the mood for something adventurous",
        "What's similar to Jujutsu Kaisen?",
        "Find me hidden gem anime",
        "Recommend based on my watch list",
        "What should I watch next?",
        "Suggest a short anime series"
    ];

    // Handle quick prompt click
    const handlePromptClick = (prompt) => {
        setInput(prompt);
        setTimeout(() => {
            const sendBtn = document.querySelector('.send-button');
            if (sendBtn && !sendBtn.disabled) {
                sendMessage();
            }
        }, 100);
    };

    return (
        <>
            <Header showSearch={false} />
            <BottomNavBar />

            <div className="ai-page-container">
                <div className="ai-page-wrapper">
                    {/* AI Companion Header Box */}
                    <div className="ai-companion-box">

                        {/* Quick Prompts */}
                        {messages.length === 0 && (
                            <div className="quick-prompts-box">
                                <p className="prompts-title">Try asking:</p>
                                <div className="prompts-grid">
                                    {quickPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handlePromptClick(prompt)}
                                            className="prompt-chip"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chat Container Box */}
                        <div className="chat-box">
                            <div 
                                className="messages-box" 
                                ref={chatContainerRef}
                                onScroll={checkScrollPosition}
                            >
                                {messages.length === 0 && (
                                    <div className="welcome-message">
                                        <div className="welcome-icon">🎬</div>
                                        <h3>Welcome to OtakuShell AI Companion!</h3>
                                        <p>Now powered by Llama 3.1! I'll recommend perfect anime shows just for you!</p>
                                        <div className="companion-features">
                                            <div className="feature">
                                                <span>✨</span> Smart recommendations
                                            </div>
                                            <div className="feature">
                                                <span>🎯</span> Based on your watch history
                                            </div>
                                            <div className="feature">
                                                <span>🤖</span> Powered by Llama 3.1
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <div key={msg.id} className={`message-bubble ${msg.role} ${msg.mood || ''}`}>
                                        <div className="message-header">
                                            <div className={`message-avatar ${msg.role}`}>
                                                {msg.role === "user" ? "👤" : "🤖"}
                                            </div>
                                            <div className="message-meta">
                                                <span className="message-sender">
                                                    {msg.role === "user" ? "You" : "Otaku AI"}
                                                </span>
                                                <span className="message-time">{msg.timestamp}</span>
                                            </div>
                                        </div>

                                        <div className="message-content">
                                            {msg.text}
                                            {msg.isError && <span className="error-indicator"> ⚠️</span>}
                                        </div>

                                        {/* Follow-up suggestions */}
                                        {msg.suggestions && msg.suggestions.length > 0 && (
                                            <div className="followup-suggestions">
                                                <p className="suggestions-label">Quick follow-ups:</p>
                                                <div className="suggestions-chips">
                                                    {msg.suggestions.map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setInput(suggestion)}
                                                            className="suggestion-chip"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Anime Recommendations */}
                                        {msg.anime && msg.anime.length > 0 && (
                                            <div className="anime-recommendations-box">
                                                <div className="recommendations-header">
                                                    <h4>✨ Personalized Recommendations</h4>
                                                    <p>Based on our conversation</p>
                                                </div>
                                                <div className="anime-cards-grid">
                                                    {msg.anime.map((a) => (
                                                        <AnimeCard
                                                            key={a.id}
                                                            anime={a}
                                                            showAddButton={true}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="message-bubble ai loading">
                                        <div className="message-header">
                                            <div className="message-avatar ai">🤖</div>
                                            <div className="message-meta">
                                                <span className="message-sender">Otaku AI</span>
                                                <span className="message-time">Typing...</span>
                                            </div>
                                        </div>
                                        <div className="message-content">
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

                            {/* Scroll to bottom button - appears when user scrolls up */}
                            {showScrollButton && messages.length > 2 && (
                                <button 
                                    className="scroll-to-bottom-btn"
                                    onClick={handleScrollToBottom}
                                    title="Scroll to latest message"
                                >
                                    ↓
                                </button>
                            )}

                            {/* Input Area */}
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message here..."
                                    className="message-input"
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    className="send-button"
                                    disabled={loading || !input.trim()}
                                >
                                    {loading ? (
                                        <span className="loading-dots">⏳</span>
                                    ) : (
                                        <span className="send-icon">➤</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIPage;