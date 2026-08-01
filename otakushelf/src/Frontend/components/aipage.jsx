import { useState, useRef, useEffect, startTransition } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AnimeCard from "./AnimeCardUI.jsx";
import Modal from "./modal.jsx";
import '../Stylesheets/aipage.css';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import { useAuth } from "./AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";

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
            const welcomeText = user
                ? `Hey ${user.name || user.email?.split('@')[0] || 'there'}! I've pulled up your profile and I'm ready to geek out about anime with you. What are you in the mood for today?`
                : `Yo! I'm OtakuAI, your personal anime companion. Think of me as your ultimate nakama in the anime world!

I'm ready to dive deep into discussions or find your next binge-worthy masterpiece. What's on your mind today?`;
            const welcomeMessage = {
                role: "ai",
                text: welcomeText,
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

        const userProfile = user ? {
            name: user.name || user.email,
            username: user.profile?.username,
            bio: user.profile?.bio,
            favoriteGenres: user.profile?.favoriteGenres,
            stats: user.profile?.stats,
            recentlyWatched: user.recentlyWatched,
            favoriteAnime: user.favoriteAnime,
        } : null;

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
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    message: userText,
                    history: history,
                    userId: user?._id || user?.id,
                    context: conversationContext,
                    userProfile: userProfile
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
                    text: "Hmm, having a little trouble connecting. Check your internet or try again!",
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
        startTransition(() => {
            setSelectedAnime(anime);
            setIsModalOpen(true);
        });
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

    const renderMessageContent = (msg) => {
        if (msg.role === "ai") {
            return (
                <div className="ai-md">
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
            );
        }
        return <>{msg.text}</>;
    };

    return (
        <div className="ai-page-root">
            <Header showSearch={false} />
            <BottomNavBar />

            <div className="ai-page-container">
                <div className="ai-page-wrapper">
                    <div className="ai-chat-shell">
                        {/* ── Header ── */}
                        <div className="ai-chat-header">
                            <div className="ai-header-left">
                                <div className="ai-header-avatar">
                                    <img src={otakuAI} alt="OtakuAI" />
                                </div>
                                <div className="ai-header-info">
                                    <h1 className="ai-header-name">
                                        <span>{user ? `Hi, ${user.name || user.email?.split('@')[0] || 'there'}` : 'OtakuAI'}</span>
                                    </h1>
                                    <div className="ai-header-status">
                                        <span className={`ai-status-dot ${user ? 'personalized' : ''}`}></span>
                                        <span>{user ? 'Personalized AI' : 'Ready to help'}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="ai-clear-btn" onClick={handleClearChat}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                                <span>Clear</span>
                            </button>
                        </div>

                        {/* ── Messages ── */}
                        <div
                            className="ai-messages-area"
                            ref={chatContainerRef}
                            onScroll={checkScrollPosition}
                        >
                            <AnimatePresence initial={false}>
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id || Math.random()}
                                        className={`ai-msg ${msg.role} ${msg.mood || ''} ${msg.isError ? 'is-error' : ''}`}
                                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.35 }}
                                    >
                                        <div className="ai-msg-header">
                                            <div className={`ai-msg-avatar ${msg.role}`}>
                                                {msg.role === "user" ? (
                                                    user?.photo ? (
                                                        <img src={user.photo} alt="" className="user-avatar-img" />
                                                    ) : (
                                                        <div className="ai-msg-initials">
                                                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                    )
                                                ) : (
                                                    <img src={otakuAI} alt="" className="ai-avatar-img" />
                                                )}
                                            </div>
                                            <span className="ai-msg-sender">
                                                {msg.role === "user" ? (user?.name || "You") : "Otaku AI"}
                                            </span>
                                            <span className="ai-msg-time">{msg.timestamp}</span>
                                        </div>

                                        <div className="ai-msg-content">
                                            {renderMessageContent(msg)}
                                        </div>

                                        {msg.anime && msg.anime.length > 0 && (
                                            <div className="ai-recs">
                                                <div className="ai-recs-label">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                    </svg>
                                                    Recommendations
                                                </div>
                                                <div className="ai-recs-grid">
                                                    {msg.anime.map((a, idx) => a && (
                                                        <AnimeCard
                                                            key={a.id || idx}
                                                            anime={a}
                                                            index={idx}
                                                            onClick={handleCardClick}
                                                            customWidth={isMobile ? '135px' : '175px'}
                                                            customHeight={isMobile ? '195px' : '250px'}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {streaming && (
                                <div className="ai-msg ai streaming">
                                    <div className="ai-msg-header">
                                        <div className="ai-msg-avatar ai">
                                            <img src={otakuAI} alt="" className="ai-avatar-img" />
                                        </div>
                                        <span className="ai-msg-sender">Otaku AI</span>
                                    </div>
                                    <div className="ai-msg-content">
                                        <div className="ai-md">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {streamingText}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loading && !streaming && (
                                <div className="ai-msg ai-typing">
                                    <div className="ai-typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ── Footer ── */}
                        <div className="ai-chat-footer">
                            {conversationContext.suggestions && conversationContext.suggestions.length > 0 && !loading && (
                                <div className="ai-suggestions">
                                    {conversationContext.suggestions.map((s, i) => (
                                        <button key={i} className="ai-chip" onClick={() => handlePromptClick(s)}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="ai-input-row">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Message OtakuAI..."
                                    className="ai-input"
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    className="ai-send-btn"
                                    disabled={loading || !input.trim()}
                                    title="Send message"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showScrollButton && (
                <button
                    className="ai-scroll-btn"
                    onClick={handleScrollToBottom}
                    title="Scroll to latest"
                >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            )}

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
