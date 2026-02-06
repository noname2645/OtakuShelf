import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AnimeCard from "./animecard.jsx";
import Modal from "./modal.jsx";
import '../Stylesheets/aipage.css';
import { Header } from '../components/header.jsx';
import BottomNavBar from "../components/bottom.jsx";

const AIPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false); // 🆕 For typewriter effect
    const [streamingText, setStreamingText] = useState(""); // 🆕 Current streaming text
    const [conversationContext, setConversationContext] = useState({
        mood: 'neutral',
        suggestions: []
    });
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    // 🆕 Modal State
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        } else {
            // 🆕 Add welcome message for first-time users
            const welcomeMessage = {
                role: "ai",
                text: "Hey there! 👋 I'm OtakuAI, your anime companion. I can recommend shows based on your taste, chat about anime, or just hang out. What brings you here today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mood: 'neutral',
                id: Date.now()
            };
            setMessages([welcomeMessage]);
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
        if (messages.length > 0 && !streaming) {
            localStorage.setItem('ai_conversation', JSON.stringify(messages.slice(-50)));
        }
    }, [messages, streaming]);

    // 🆕 Typewriter effect function
    const typewriterEffect = (fullText, messageData) => {
        setStreaming(true);
        setStreamingText("");

        let currentIndex = 0;
        const typingSpeed = 1; // milliseconds per character (adjust for speed)

        const typingInterval = setInterval(() => {
            if (currentIndex < fullText.length) {
                setStreamingText(fullText.substring(0, currentIndex + 1));
                currentIndex++;
                // Auto-scroll as text appears
                setTimeout(() => scrollToBottom(), 10);
            } else {
                clearInterval(typingInterval);
                setStreaming(false);
                setStreamingText("");

                // Add the complete message to messages array
                setMessages((prev) => [
                    ...prev,
                    messageData
                ]);
            }
        }, typingSpeed);
    };

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
            // Prepare history (last 10 messages) to send to backend
            const history = messages.slice(-10).map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));

            const res = await fetch(`${API}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    message: userText,
                    history: history, // 🆕 Send history
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

            setLoading(false);

            // 🆕 Start typewriter effect for AI response
            const aiMessageData = {
                role: "ai",
                text: data.reply,
                anime: data.anime || [],
                context: data.context,
                suggestions: data.context?.suggestions || [],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mood: data.context?.mood || 'neutral',
                id: Date.now() + 1
            };

            typewriterEffect(data.reply, aiMessageData);

        } catch (err) {
            setLoading(false);
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

    // 🆕 Handle Card Click
    const handleCardClick = (anime) => {
        console.log("Card clicked:", anime);
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAnime(null);
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
                                            {msg.role === "ai" ? (
                                                <div className="markdown-content">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            // Custom styling for markdown elements
                                                            p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="markdown-bold" {...props} />,
                                                            em: ({ node, ...props }) => <em className="markdown-italic" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="markdown-list-ordered" {...props} />,
                                                            li: ({ node, ...props }) => <li className="markdown-list-item" {...props} />,
                                                            code: ({ node, inline, ...props }) =>
                                                                inline ?
                                                                    <code className="markdown-code-inline" {...props} /> :
                                                                    <code className="markdown-code-block" {...props} />,
                                                            h1: ({ node, ...props }) => <h1 className="markdown-h1" {...props} />,
                                                            h2: ({ node, ...props }) => <h2 className="markdown-h2" {...props} />,
                                                            h3: ({ node, ...props }) => <h3 className="markdown-h3" {...props} />,
                                                        }}
                                                    >
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                msg.text
                                            )}
                                            {msg.isError && <span className="error-indicator"> ⚠️</span>}
                                        </div>

                                        {/* Anime Recommendations */}
                                        {msg.anime && msg.anime.length > 0 && (
                                            <div className="anime-recommendations-box">
                                                <div className="anime-cards-grid">
                                                    {msg.anime.map((a) => (
                                                        <AnimeCard
                                                            key={a.id}
                                                            anime={a}
                                                            showAddButton={true}
                                                            onClick={handleCardClick}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* 🆕 Streaming message (typewriter effect) */}
                                {streaming && streamingText && (
                                    <div className="message-bubble ai streaming">
                                        <div className="message-header">
                                            <div className="message-avatar ai">🤖</div>
                                            <div className="message-meta">
                                                <span className="message-sender">Otaku AI</span>
                                                <span className="message-time">Now</span>
                                            </div>
                                        </div>
                                        <div className="message-content">
                                            <div className="markdown-content">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="markdown-bold" {...props} />,
                                                        em: ({ node, ...props }) => <em className="markdown-italic" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="markdown-ordered-list" {...props} />,
                                                        li: ({ node, ...props }) => <li className="markdown-list-item" {...props} />,
                                                        code: ({ node, inline, ...props }) =>
                                                            inline ?
                                                                <code className="markdown-code-inline" {...props} /> :
                                                                <code className="markdown-code-block" {...props} />,
                                                        h1: ({ node, ...props }) => <h1 className="markdown-h1" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="markdown-h2" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="markdown-h3" {...props} />,
                                                    }}
                                                >
                                                    {streamingText}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

            {/* 🆕 Anime Detail Modal */}
            {selectedAnime && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    anime={selectedAnime}
                    onOpenAnime={handleCardClick}
                />
            )}
        </>
    );
};

export default AIPage;