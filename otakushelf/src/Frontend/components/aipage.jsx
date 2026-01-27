import { useState, useRef, useEffect } from "react";
import AnimeCard from "./animecard";
import '../Stylesheets/aipage.css';
import { Header } from '../components/header.jsx';
import BottomNavBar from "../components/bottom.jsx";

const AIPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userText = input;
        const user = JSON.parse(localStorage.getItem("user"));

        // 1️⃣ Show USER message immediately
        setMessages((prev) => [
            ...prev,
            { role: "user", text: userText },
        ]);

        setInput("");
        setLoading(true);

        try {
            // 2️⃣ Send message to backend
            const res = await fetch("http://localhost:5000/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText, userId: user?.id || user?._id }),
            });

            const data = await res.json();

            // 3️⃣ Fetch anime details from AniList (if IDs provided)
            let animeList = [];
            if (data.anilistIds && data.anilistIds.length > 0) {
                animeList = await fetchAnimeFromAnilist(data.anilistIds);
            }

            // 4️⃣ Show AI message + anime cards
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: data.reply,
                    anime: data.anime || animeList || [],
                },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "Backend not responding 😭",
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

    return (
        <>
            <Header showSearch={false} onSearchChange={(value) => setSearchText(value)} />
            {/* Bottom Navigation Component */}
            <BottomNavBar />
            <div className="ai-page">
                {/* CHAT CONTAINER */}
                <div className="chat-container">
                    <div className="messages-area">
                        {messages.length === 0 && (
                            <div className="welcome-message">
                                <div className="welcome-icon">🎬</div>
                                <h3>Welcome to OtakuShell AI</h3>
                                <p>Ask me anything about anime! I can recommend shows, provide information, or help you discover new series.</p>
                                <div className="example-queries">
                                    <span className="example-tag">"Recommend me a psychological thriller anime"</span>
                                    <span className="example-tag">"What's similar to Jujutsu Kaisen?"</span>
                                    <span className="example-tag">"Tell me about the top romance anime from 2023"</span>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`message-bubble ${msg.role}`}>
                                <div className="message-header">
                                    <div className={`message-avatar ${msg.role}`}>
                                        {msg.role === "user" ? "👤" : "🤖"}
                                    </div>
                                    <div className="message-sender">
                                        {msg.role === "user" ? "You" : "OtakuShell AI"}
                                        <span className="message-time">Just now</span>
                                    </div>
                                </div>
                                <div className="message-content">{msg.text}</div>

                                {msg.anime && msg.anime.length > 0 && (
                                    <div className="anime-results">
                                        <div className="anime-cards-grid">
                                            {msg.anime.map((a) => (
                                                <AnimeCard key={a.id} anime={a} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="message-bubble ai">
                                <div className="message-header">
                                    <div className="message-avatar ai">🤖</div>
                                    <div className="message-sender">
                                        OtakuShell AI
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

                    {/* INPUT AREA */}
                    <div className="input-container">
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask for anime recommendations..."
                                className="message-input"
                            />
                            <button
                                onClick={sendMessage}
                                className="send-button"
                                disabled={loading || !input.trim()}
                            >
                                <span className="send-icon">➤</span>
                            </button>
                        </div>
                        <div className="input-hint">
                            Press Enter to send • Shift+Enter for new line
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIPage;