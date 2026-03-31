import { useAuth } from './AuthContext';

export const useAnimePreferences = () => {
  const { user } = useAuth();
  
  const preferences = user?.settings?.preferences || {
    titleLanguage: 'romaji',
    defaultLayout: 'grid',
    nsfwContent: false,
    autoplayTrailers: true,
    accentColor: '#ff6b6b'
  };

  /**
   * Returns the preferred title string for a given anime object.
   * Expects title objects in Anilist schema: { romaji, english, native }
   */
  const getPreferredTitle = (titleObj) => {
    if (!titleObj) return "Unknown Title";
    if (typeof titleObj === 'string') return titleObj;

    const { titleLanguage } = preferences;

    if (titleLanguage === 'english' && titleObj.english) return titleObj.english;
    if (titleLanguage === 'native' && titleObj.native) return titleObj.native;
    
    // Default to Romaji, or whichever is available as fallback
    return titleObj.romaji || titleObj.english || titleObj.native || "Unknown Title";
  };

  /**
   * Checks if a cover image should be blurred based on age restriction and user settings.
   */
  const shouldBlurNSFW = (isAdult) => {
    if (!isAdult) return false;
    return !preferences.nsfwContent;
  };

  /**
   * Returns true if trailers should play automatically.
   */
  const shouldAutoplay = () => {
    return preferences.autoplayTrailers;
  };

  return {
    preferences,
    getPreferredTitle,
    shouldBlurNSFW,
    shouldAutoplay
  };
};
