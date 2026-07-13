import React, { useEffect, useState, useRef } from 'react';
import '../Stylesheets/PageLoader.css';

// Typewriter hook
const useTypewriter = (text, speed = 25, startDelay = 200) => {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        let i = 0;
        const t0 = setTimeout(() => {
            const iv = setInterval(() => {
                setDisplayed(text.slice(0, ++i));
                if (i >= text.length) clearInterval(iv);
            }, speed);
            return () => clearInterval(iv);
        }, startDelay);
        return () => clearTimeout(t0);
    }, [text, speed, startDelay]);
    return displayed;
};

const TAGLINE = 'Your anime universe, curated.';

const PageLoader = ({ onFinish }) => {
    const [phase, setPhase] = useState('enter'); // enter → reveal → exit
    const tagline = useTypewriter(TAGLINE, 25, 200);

    // Keep onFinish callback reference updated without restarting the timeline
    const onFinishRef = useRef(onFinish);
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    // Symmetric phase timeline (Runs exactly once on mount):
    // 0ms:    enter (panels slide in, takes 700ms)
    // 1400ms: reveal (panels split apart, takes 700ms)
    // 2100ms: exit (fade out loader overlay, takes 300ms)
    // 2400ms: finished (loader hidden, trigger onFinish)
    useEffect(() => {
        const t1 = setTimeout(() => setPhase('reveal'), 1400);
        const t2 = setTimeout(() => {
            setPhase('exit');
        }, 2100);
        const t3 = setTimeout(() => {
            onFinishRef.current?.();
        }, 2400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    return (
        <div className={`page-loader phase-${phase}`} aria-hidden="true">
            {/* Left curtain panel */}
            <div className="curtain curtain-left">
                <div className="curtain-texture" />
            </div>

            {/* Right curtain panel */}
            <div className="curtain curtain-right">
                <div className="curtain-texture" />
            </div>

            {/* Center logo (Without Kanji) */}
            <div className="loader-center">
                <div className="loader-brand">
                    <span className="brand-otaku">OTAKU</span>
                    <span className="brand-shelf">SHELF</span>
                </div>
                <div className="loader-tagline">{tagline}<span className="cursor-blink">|</span></div>
                {/* Torii gate silhouette */}
                <svg className="torii-icon" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="12" width="120" height="6" rx="3" fill="currentColor" opacity="0.9"/>
                    <rect x="8" y="20" width="104" height="4" rx="2" fill="currentColor" opacity="0.7"/>
                    <rect x="18" y="24" width="6" height="56" rx="3" fill="currentColor"/>
                    <rect x="96" y="24" width="6" height="56" rx="3" fill="currentColor"/>
                    <rect x="10" y="8" width="8" height="20" rx="2" fill="currentColor" opacity="0.6"/>
                    <rect x="102" y="8" width="8" height="20" rx="2" fill="currentColor" opacity="0.6"/>
                </svg>
            </div>
        </div>
    );
};

export default PageLoader;
