import { useState } from "react";
import AnimeCard from "./animecard";
import { useAuth } from '../components/AuthContext';

const AIPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

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

    return (
        <div style={{ padding: "16px" }}>
            <h2>AI Assistant</h2>

            {/* CHAT AREA */}
            <div
                style={{
                    minHeight: "200px",
                    background: "#0f172a",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    color: "white",
                }}
            >
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: "16px" }}>
                        <p>
                            <b>{msg.role === "user" ? "You" : "AI"}:</b> {msg.text}
                        </p>

                        {msg.anime &&
                            msg.anime.map((a) => (
                                <AnimeCard key={a.id} anime={a} />
                            ))}
                    </div>
                ))}

                {loading && <p><b>AI:</b> Thinking… 🤔</p>}
            </div>

            {/* INPUT */}
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for anime recommendations..."
                style={{ width: "100%", padding: "8px" }}
            />

            <button onClick={sendMessage} style={{ marginTop: "8px" }}>
                Send
            </button>
        </div>
    );
};

export default AIPage;
