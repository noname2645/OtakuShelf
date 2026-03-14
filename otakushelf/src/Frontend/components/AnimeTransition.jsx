import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./AnimeTransition.css";

/* ─── Speed Lines SVG ─────────────────────────────────────────────────────── */
const SpeedLines = ({ color }) => {
    const lines = [];
    for (let i = 0; i < 52; i++) {
        const angle = (i / 52) * 360;
        const rad = (angle * Math.PI) / 180;
        const len = 55 + (i % 6) * 12;
        const x2 = 50 + Math.cos(rad) * len;
        const y2 = 50 + Math.sin(rad) * len;
        const thick = i % 4 === 0 ? 1.8 : 0.45;
        lines.push(
            <line
                key={i}
                x1="50%" y1="50%"
                x2={`${x2}%`} y2={`${y2}%`}
                stroke={color}
                strokeWidth={thick}
                opacity={i % 3 === 0 ? 0.9 : 0.35}
            />
        );
    }
    return (
        <svg
            className="speed-lines-svg"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            {lines}
        </svg>
    );
};

/* ─── Per-route theme ─────────────────────────────────────────────────────── */
const THEMES = {
    "/": { color: "#f97316", accent: "#fbbf24", chars: ["炎", "力", "闘", "夢", "命"] }, // Fire – Naruto
    "/home": { color: "#f97316", accent: "#fbbf24", chars: ["炎", "力", "闘", "夢", "命"] },
    "/login": { color: "#8b5cf6", accent: "#ec4899", chars: ["月", "幻", "霊", "呪", "魔"] }, // Mystic – Jujutsu
    "/register": { color: "#8b5cf6", accent: "#a78bfa", chars: ["星", "光", "道", "誓", "魂"] }, // Cosmic
    "/list": { color: "#06b6d4", accent: "#3b82f6", chars: ["水", "流", "呼", "波", "型"] }, // Water Breathing – Demon Slayer
    "/ai": { color: "#a78bfa", accent: "#f472b6", chars: ["無", "限", "虚", "空", "界"] }, // Void – Gojo vibes
    "/advance": { color: "#4ade80", accent: "#22d3ee", chars: ["風", "迅", "疾", "走", "速"] }, // Wind – speed
    "/profile": { color: "#fbbf24", accent: "#f97316", chars: ["誇", "栄", "力", "業", "極"] }, // Gold – prestige
};

const getTheme = (path) => THEMES[path] || THEMES["/"];

/* ─── Main Overlay Component ──────────────────────────────────────────────── */
const AnimeTransitionOverlay = () => {
    const location = useLocation();
    const [isAnimating, setIsAnimating] = useState(false);
    const [theme, setTheme] = useState(getTheme(location.pathname));
    const prevPath = useRef(location.pathname);

    useEffect(() => {
        if (location.pathname !== prevPath.current) {
            setTheme(getTheme(location.pathname));
            setIsAnimating(true);
            prevPath.current = location.pathname;
            const t = setTimeout(() => setIsAnimating(false), 900);
            return () => clearTimeout(t);
        }
    }, [location.pathname]);

    return (
        <AnimatePresence>
            {isAnimating && (
                <motion.div
                    className="anime-transition-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                >
                    {/* ── Speed lines burst ──────────────────────────────────── */}
                    <motion.div
                        className="speed-lines-container"
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0.2, 1.1, 1.6, 2.2] }}
                        transition={{ duration: 0.75, times: [0, 0.18, 0.65, 1], ease: "easeOut" }}
                    >
                        <SpeedLines color={theme.color} />
                    </motion.div>

                    {/* ── Center energy burst ────────────────────────────────── */}
                    <motion.div
                        className="center-burst"
                        style={{
                            background: `radial-gradient(circle, ${theme.color}dd 0%, ${theme.accent}88 35%, transparent 68%)`,
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 0.6, 1.8, 3.5], opacity: [0, 1, 0.5, 0] }}
                        transition={{ duration: 0.7, times: [0, 0.12, 0.55, 1], ease: "easeOut" }}
                    />

                    {/* ── Primary diagonal slash ─────────────────────────────── */}
                    <motion.div
                        className="slash-line"
                        style={{
                            background: `linear-gradient(108deg, transparent 28%, ${theme.color}cc 46%, rgba(255,255,255,0.7) 50%, ${theme.accent}bb 54%, transparent 72%)`,
                        }}
                        initial={{ x: "-115%" }}
                        animate={{ x: "115%" }}
                        transition={{ duration: 0.38, ease: [0.76, 0, 0.24, 1], delay: 0.08 }}
                    />

                    {/* ── Secondary slash (echo) ─────────────────────────────── */}
                    <motion.div
                        className="slash-line slash-line-2"
                        style={{
                            background: `linear-gradient(108deg, transparent 35%, ${theme.accent}77 47%, rgba(255,255,255,0.35) 50%, transparent 63%)`,
                        }}
                        initial={{ x: "-115%" }}
                        animate={{ x: "115%" }}
                        transition={{ duration: 0.32, ease: [0.76, 0, 0.24, 1], delay: 0.18 }}
                    />

                    {/* ── White flash ───────────────────────────────────────── */}
                    <motion.div
                        className="flash-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.55, 0] }}
                        transition={{ duration: 0.45, times: [0, 0.25, 1], delay: 0.1 }}
                    />

                    {/* ── Floating Japanese kanji ───────────────────────────── */}
                    <div className="energy-particles">
                        {theme.chars.map((char, i) => (
                            <motion.span
                                key={i}
                                className="energy-char"
                                style={{
                                    left: `${10 + i * 19}%`,
                                    top: `${18 + (i % 3) * 28}%`,
                                    color: i % 2 === 0 ? theme.color : theme.accent,
                                    textShadow: `0 0 24px ${theme.color}, 0 0 48px ${theme.accent}`,
                                }}
                                initial={{ opacity: 0, y: 30, scale: 0.4, rotate: -15 }}
                                animate={{
                                    opacity: [0, 0.95, 0.6, 0],
                                    y: [30, 0, -18, -35],
                                    scale: [0.4, 1.3, 1.1, 0.7],
                                    rotate: [-15, 0, 5, 10],
                                }}
                                transition={{ duration: 0.7, delay: i * 0.06 + 0.04, ease: "easeOut" }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>

                    {/* ── Corner sparks ─────────────────────────────────────── */}
                    {[0, 1, 2, 3].map((i) => (
                        <motion.div
                            key={`spark-${i}`}
                            className={`corner-spark corner-spark-${i}`}
                            style={{ background: i % 2 === 0 ? theme.color : theme.accent }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
                            transition={{ duration: 0.5, delay: i * 0.07 + 0.05 }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AnimeTransitionOverlay;
