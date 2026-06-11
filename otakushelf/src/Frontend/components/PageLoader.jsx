import React, { useEffect, useRef, useState } from 'react';
import '../Stylesheets/PageLoader.css';

// Sakura particle pool
const PARTICLE_COUNT = 28;

const rand = (min, max) => Math.random() * (max - min) + min;

const Sakura = ({ id }) => {
    const style = {
        '--x': `${rand(0, 100)}vw`,
        '--drift': `${rand(-60, 60)}px`,
        '--duration': `${rand(4, 8)}s`,
        '--delay': `${rand(0, 4)}s`,
        '--size': `${rand(8, 18)}px`,
        '--rotate-start': `${rand(-40, 40)}deg`,
        '--rotate-end': `${rand(200, 400)}deg`,
        '--opacity': rand(0.4, 0.9),
    };
    return <div className="sakura-petal" style={style} key={id} />;
};

// Typewriter hook
const useTypewriter = (text, speed = 60, startDelay = 300) => {
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

const KANJI_TEXT = '棚のアニメ';
const TAGLINE = 'Your anime universe, curated.';

const PageLoader = ({ onFinish }) => {
    const [phase, setPhase] = useState('enter'); // enter → slash → reveal → exit
    const slashRef = useRef(null);
    const particles = useRef([...Array(PARTICLE_COUNT)].map((_, i) => i));
    const kanji = useTypewriter(KANJI_TEXT, 180, 200);
    const tagline = useTypewriter(TAGLINE, 45, 1200);


    // Phase timeline
    useEffect(() => {
        // 0ms:  enter (panels slide in, particles fall, kanji builds)
        // 1400ms: slash (red line cuts across)
        // 2000ms: reveal (panels fly out to sides)
        // 2700ms: exit (fade out loader, call onFinish)
        const t1 = setTimeout(() => setPhase('slash'), 1400);
        const t2 = setTimeout(() => setPhase('reveal'), 2000);
        const t3 = setTimeout(() => {
            setPhase('exit');
            onFinish?.();
        }, 2900);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onFinish]);

    return (
        <div className={`page-loader phase-${phase}`} aria-hidden="true">
            {/* Sakura rain */}
            <div className="sakura-container">
                {particles.current.map(id => <Sakura key={id} id={id} />)}
            </div>

            {/* Left curtain panel */}
            <div className="curtain curtain-left">
                <div className="curtain-texture" />
                {/* Vertical Japanese text */}
                <div className="curtain-jp-text">オタクシェルフ</div>
            </div>

            {/* Right curtain panel */}
            <div className="curtain curtain-right">
                <div className="curtain-texture" />
                <div className="curtain-jp-text">アニメの世界へ</div>
            </div>

            {/* Center logo/kanji */}
            <div className="loader-center">
                <div className="kanji-glyph">{kanji}<span className="cursor-blink">|</span></div>
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

            {/* Slash effect */}
            <div ref={slashRef} className="slash-line" />
            <div className="slash-glow" />

            {/* Energy rings */}
            <div className="energy-ring ring-1" />
            <div className="energy-ring ring-2" />
        </div>
    );
};

export default PageLoader;
