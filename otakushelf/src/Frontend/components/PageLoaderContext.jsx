import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HOME_PATHS = ['/', '/home'];

const PageLoaderContext = createContext(null);

export function PageLoaderProvider({ children }) {
    const location = useLocation();

    const isHomeRoute = HOME_PATHS.includes(location.pathname);

    const [visible, setVisible] = useState(isHomeRoute);
    const [isLoading, setIsLoading] = useState(isHomeRoute);
    const [loadKey, setLoadKey] = useState(0);

    // Global animated loader only shows on home/landing routes.
    // All other pages manage their own inline loading states.
    const prevPathRef = useRef(location.pathname);
    useLayoutEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            const prevPath = prevPathRef.current;
            prevPathRef.current = location.pathname;

            const wasHome = HOME_PATHS.includes(prevPath);
            const isHome = HOME_PATHS.includes(location.pathname);

            if (isHome) {
                setVisible(true);
                setIsLoading(true);
                setLoadKey(k => k + 1);
            } else if (wasHome) {
                setVisible(false);
            }
        }
    }, [location.pathname]);

    const finishLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

    const hideLoader = useCallback(() => setVisible(false), []);

    const value = useMemo(() => ({
        visible,
        isLoading,
        loadKey,
        finishLoading,
        hideLoader,
    }), [visible, isLoading, loadKey, finishLoading, hideLoader]);

    return (
        <PageLoaderContext.Provider value={value}>
            {children}
        </PageLoaderContext.Provider>
    );
}

export function usePageLoader() {
    const ctx = useContext(PageLoaderContext);
    if (!ctx) throw new Error('usePageLoader must be used within PageLoaderProvider');
    return ctx;
}
