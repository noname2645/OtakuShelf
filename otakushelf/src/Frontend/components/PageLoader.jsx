import React, { useEffect, useState, useRef } from 'react';
import '../Stylesheets/PageLoader.css';

const PageLoader = ({
    isLoading = true,
    onFinish,
    minDisplay = 800,
    maxDisplay = 8000,
}) => {
    const [phase, setPhase] = useState('enter'); // enter → reveal → exit
    useEffect(() => {
        console.log('PL_MOUNT');
        return () => console.log('PL_UNMOUNT');
    }, []);

    // Keep onFinish callback reference updated without restarting the timeline
    const onFinishRef = useRef(onFinish);
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    const mountedAtRef = useRef(Date.now());
    const finishedRef = useRef(false);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onFinishRef.current?.();
    };

    // Functional timeline driven by the page's loading state:
    // 0ms:    enter (panels slide in, takes 500ms)
    // 500ms:  reveal (panels split apart, takes 500ms)
    // When content is ready (isLoading = false) AND the minimum display
    // time has elapsed: exit (fade out, takes 500ms) then onFinish.
    // A maxDisplay safety net guarantees the page is never blocked.
    useEffect(() => {
        const revealT = setTimeout(() => setPhase('reveal'), 500);

        const doExit = () => {
            if (finishedRef.current) return;
            setPhase('exit');
            setTimeout(finish, 500);
        };

        let readyT = null;
        let maxT = null;

        if (!isLoading) {
            const remaining = Math.max(0, minDisplay - (Date.now() - mountedAtRef.current));
            readyT = setTimeout(doExit, remaining);
        }

        maxT = setTimeout(doExit, maxDisplay);

        return () => {
            clearTimeout(revealT);
            clearTimeout(readyT);
            clearTimeout(maxT);
        };
    }, [isLoading, minDisplay, maxDisplay]);

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
                <img src="/animeregistrylogo.png" alt="" className="loader-logo-icon" />
                <img src="/animeregistryname.png" alt="AnimeRegistry" className="loader-logo-name" />
            </div>
        </div>
    );
};

export default PageLoader;
