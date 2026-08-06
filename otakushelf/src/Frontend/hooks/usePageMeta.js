import { useEffect } from 'react';

const DEFAULT_TITLE = "Anime List & Anime Tracker | Watchlist, Ratings, Stats";
const DEFAULT_DESCRIPTION =
  "Create your free anime list and track every series you watch. Rate anime, write reviews, earn badges, and import your MyAnimeList library today.";

/**
 * Sets per-page <title>, meta description and Open Graph tags, then restores
 * the homepage defaults when the component unmounts (client-side routing SPA).
 */
export default function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;

    const desc = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const prevDesc = desc?.getAttribute('content') || '';
    const prevOgTitle = ogTitle?.getAttribute('content') || '';
    const prevOgDesc = ogDesc?.getAttribute('content') || '';

    if (title) document.title = title;
    if (description) desc?.setAttribute('content', description);
    if (title) ogTitle?.setAttribute('content', title);
    if (description) ogDesc?.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      desc?.setAttribute('content', prevDesc);
      ogTitle?.setAttribute('content', prevOgTitle);
      ogDesc?.setAttribute('content', prevOgDesc);
    };
  }, [title, description]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
