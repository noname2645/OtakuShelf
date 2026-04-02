import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AnimeCard from "./AnimeCardUI.jsx";
import Modal from "./modal.jsx";
import '../Stylesheets/aipage.css';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import { useAuth } from "./AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";

// 🆕 Imported Logo
import otakuAI from "../images/otakuai_no_bg.png";

const AIPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [conversationContext, setConversationContext] = useState({
        mood: 'friendly',
        suggestions: ["Recommend something new!", "Based on my history", "Top anime of the season"]
    });
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const API = import.meta.env.VITE_API_BASE_URL;
    const { user } = useAuth();

    // Auto-scroll logic
    const scrollToBottom = (instant = false) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: instant ? "auto" : "smooth"
            });
        }
    };

    const checkScrollPosition = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    };

    const handleScrollToBottom = () => {
        scrollToBottom(true);
    };

    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === "user" || (!loading && lastMessage.role === "ai")) {
                setTimeout(() => scrollToBottom(), 100);
            }
        }
    }, [messages, loading]);

    useEffect(() => {
        const savedConvo = localStorage.getItem('ai_conversation');
        if (savedConvo) {
            try {
                const parsedConvo = JSON.parse(savedConvo);
                setMessages(parsedConvo);
                setTimeout(() => scrollToBottom(true), 300);
            } catch (e) {
                console.error("Failed to parse saved conversation:", e);
                localStorage.removeItem('ai_conversation');
            }
        } else {
            const welcomeMessage = {
                role: "ai",
                text: `Yo! 👋 I'm OtakuAI, your personal anime companion. Think of me as your ultimate nakama in the anime world! 
                
I've analyzed your profile and I'm ready to dive deep into discussions or find your next binge-worthy masterpiece. What's on your mind today?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mood: 'friendly',
                id: Date.now() + Math.random()
            };
            setMessages([welcomeMessage]);
            setTimeout(() => scrollToBottom(true), 300);
        }

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

    useEffect(() => {
        setTimeout(() => checkScrollPosition(), 100);
    }, [messages, loading]);

    useEffect(() => {
        if (messages.length > 0 && !streaming) {
            localStorage.setItem('ai_conversation', JSON.stringify(messages.slice(-50)));
        }
    }, [messages, streaming]);

    const typewriterEffect = (fullText, messageData) => {
        if (!fullText) {
            setMessages(prev => [...prev, messageData]);
            return;
        }
        
        setStreaming(true);
        setStreamingText("");

        let currentIndex = 0;
        const typingSpeed = 2;

        const typingInterval = setInterval(() => {
            if (currentIndex < fullText.length) {
                setStreamingText(fullText.substring(0, currentIndex + 1));
                currentIndex++;
                if (currentIndex % 10 === 0) scrollToBottom();
            } else {
                clearInterval(typingInterval);
                setStreaming(false);
                setStreamingText("");
                setMessages((prev) => [...prev, messageData]);
            }
        }, typingSpeed);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userText = input;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const userMsg = {
            role: "user",
            text: userText,
            timestamp,
            id: Date.now()
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        setTimeout(() => scrollToBottom(), 50);

        try {
            const history = messages.slice(-8).map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text || ""
            }));

            const res = await fetch(`${API}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    message: userText,
                    history: history,
                    userId: user?._id || user?.id,
                    context: conversationContext
                }),
            });

            const response = await res.json();
            
            if (response.status === 'error') {
                throw new Error(response.message || "Failed to generate AI response");
            }

            const data = response.data || {};

            setConversationContext(prev => ({
                ...prev,
                mood: data.context?.mood || 'neutral',
                suggestions: data.context?.suggestions || []
            }));

            setLoading(false);

            const aiMessageData = {
                role: "ai",
                text: data.reply || "Something went wrong, but I'm still here!",
                anime: data.anime || [],
                context: data.context || {},
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mood: data.context?.mood || 'neutral',
                id: Date.now() + 1
            };

            typewriterEffect(data.reply, aiMessageData);

        } catch (err) {
            console.error("AI Chat Error:", err);
            setLoading(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "Hmm, having a little trouble connecting. Check your internet or try again! 🌸",
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

    const handlePromptClick = (prompt) => {
        setInput(prompt);
    };

    const handleCardClick = (anime) => {
        if (!anime) return;
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAnime(null);
    };

    const handleClearChat = () => {
        if (window.confirm("Are you sure you want to clear the conversation?")) {
            setMessages([]);
            localStorage.removeItem('ai_conversation');
            setConversationContext({ mood: 'friendly', suggestions: [] });

            const welcomeMsg = {
                role: "ai",
                text: "Chat cleared! Ready to start fresh. What's on your mind?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mood: 'friendly',
                id: Date.now()
            };
            setMessages([welcomeMsg]);
        }
    };

    return (
        <div className="ai-page-root">
            <Header showSearch={false} />
            <BottomNavBar />

            <div className="ai-page-container">
                <div className="ai-page-wrapper">
                    <div className="ai-companion-box">
                        <div className="companion-header">
                            <div className="companion-info-wrapper">
                                <div className="companion-avatar">
                                    <img src={otakuAI} alt="OtakuAI" />
                                </div>
                                <div className="companion-info">
                                    <h3>OtakuAI</h3>
                                    <div className="companion-status">
                                        <span className="status-dot"></span>
                                        <span>Ready to Binge</span>
                                    </div>
                                </div>
                            </div>
                            <button className="clear-chat-pill" onClick={handleClearChat}>
                                Clear History
                            </button>
                        </div>

                        <div className="chat-box">
                            <div
                                className="messages-box"
                                ref={chatContainerRef}
                                onScroll={checkScrollPosition}
                            >
                                <AnimatePresence initial={false}>
                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id || Math.random()}
                                            className={`message-bubble ${msg.role} ${msg.mood || ''}`}
                                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.35 }}
                                        >
                                            <div className="message-header">
                                                <div className={`message-avatar ${msg.role}`}>
                                                    {msg.role === "user" ? (
                                                        user?.photo ? (
                                                            <img src={user.photo} alt="User" className="user-avatar-img" />
                                                        ) : (
                                                            <div className="user-initials">
                                                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <img src={otakuAI} alt="AI" className="ai-avatar-img" />
                                                    )}
                                                </div>
                                                <div className="message-meta">
                                                    <span className="message-sender">
                                                        {msg.role === "user" ? (user?.name || "You") : "Otaku AI"}
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
                                                                p: props => <p className="md-p" {...props} />,
                                                                strong: props => <strong className="md-bold" {...props} />,
                                                                code: props => <code className="md-code" {...props} />
                                                            }}
                                                        >
                                                            {msg.text || ""}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>

                                            {msg.anime && msg.anime.length > 0 && (
                                                <div className="anime-recommendations-box">
                                                    <div className="anime-cards-grid">
                                                        {msg.anime.map((a, idx) => a && (
                                                            <AnimeCard
                                                                key={a.id || idx}
                                                                anime={a}
                                                                index={idx}
                                                                onClick={handleCardClick}
                                                                customWidth={isMobile ? '135px' : '185px'}
                                                                customHeight={isMobile ? '195px' : '265px'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {streaming && (
                                    <div className="message-bubble ai streaming">
                                        <div className="message-header">
                                            <div className="message-avatar ai">
                                                <img src={otakuAI} alt="AI" className="ai-avatar-img" />
                                            </div>
                                            <div className="message-meta">
                                                <span className="message-sender">Otaku AI</span>
                                            </div>
                                        </div>
                                        <div className="message-content">
                                            <div className="markdown-content">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {streamingText}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {loading && !streaming && (
                                    <div className="message-bubble ai loading">
                                        <div className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-footer">
                                {conversationContext.suggestions && conversationContext.suggestions.length > 0 && !loading && (
                                    <div className="quick-suggestions">
                                        {conversationContext.suggestions.map((s, i) => (
                                            <button key={i} className="suggestion-chip" onClick={() => handlePromptClick(s)}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Message OtakuAI..."
                                        className="message-input"
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className="send-button"
                                        disabled={loading || !input.trim()}
                                    >
                                        ➤
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedAnime && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    anime={selectedAnime}
                    onOpenAnime={handleCardClick}
                />
            )}
        </div>
    );
};

export default AIPage;