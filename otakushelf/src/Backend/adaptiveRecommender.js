// adaptiveRecommender.js - NEW FILE
class AdaptiveRecommender {
  constructor(tasteManager, intentClassifier) {
    this.tasteManager = tasteManager;
    this.intentClassifier = intentClassifier;
  }
  
  async generateRecommendations(userMessage, userProfile, userHistory) {
    // Step 1: Classify intent
    const intent = this.intentClassifier.classify(userMessage, {
      lastIntent: userProfile.recentActivity.conversationThemes.slice(-1)[0]?.theme
    });
    
    console.log(`🎯 Detected intent: ${intent.intent} (confidence: ${intent.confidence})`);
    
    // Step 2: Select genres based on intent and taste
    let selectedGenres = [];
    
    switch(intent.intent) {
      case 'recommendation':
        selectedGenres = this.getRecommendationGenres(userProfile);
        break;
      case 'discovery':
        selectedGenres = this.getDiscoveryGenres(userProfile);
        break;
      case 'mood_based':
        selectedGenres = this.getMoodBasedGenres(userMessage, userProfile);
        break;
      case 'comparison':
        selectedGenres = this.getComparisonGenres(userMessage, userProfile);
        break;
      default:
        selectedGenres = this.getDefaultGenres(userProfile);
    }
    
    // Step 3: Fetch anime
    const animeList = await this.fetchAnimeByGenres(selectedGenres, 12);
    
    // Step 4: Apply adaptive filtering
    const filtered = this.applyAdaptiveFilters(animeList, userProfile, userHistory);
    
    // Step 5: Rank recommendations
    const ranked = this.rankRecommendations(filtered, userProfile, intent);
    
    return {
      recommendations: ranked.slice(0, 6),
      intent: intent.intent,
      reasoning: this.generateReasoning(selectedGenres, intent, userProfile),
      confidence: intent.confidence
    };
  }
  
  getRecommendationGenres(userProfile) {
    const topGenres = this.tasteManager.getTopGenres(2);
    const explorationGenres = this.tasteManager.getExplorationGenres(1);
    
    // Blend known preferences with exploration
    return [
      ...topGenres.map(g => g.genre),
      ...explorationGenres
    ];
  }
  
  getMoodBasedGenres(message, userProfile) {
    const moodGenres = {
      sad: ['Drama', 'Slice of Life', 'Romance'],
      happy: ['Comedy', 'Adventure', 'Sports'],
      bored: ['Action', 'Mystery', 'Psychological'],
      excited: ['Adventure', 'Fantasy', 'Sci-Fi'],
      relaxed: ['Slice of Life', 'Comedy', 'Drama']
    };
    
    // Detect mood from message
    let detectedMood = 'relaxed'; // Default
    Object.keys(moodGenres).forEach(mood => {
      if (message.includes(mood)) {
        detectedMood = mood;
      }
    });
    
    // Blend mood genres with user preferences
    const moodBased = moodGenres[detectedMood] || moodGenres.relaxed;
    const userTop = this.tasteManager.getTopGenres(1).map(g => g.genre);
    
    return [...new Set([...userTop, ...moodBased.slice(0, 2)])];
  }
  
  applyAdaptiveFilters(animeList, userProfile, userHistory) {
    const watchedIds = userHistory.completed?.map(a => a.animeId) || [];
    const { engagementScore } = userProfile.interactionStats;
    
    return animeList.filter(anime => {
      // Filter out watched
      if (watchedIds.includes(anime.id?.toString())) return false;
      
      // Adaptive filtering based on engagement
      if (engagementScore < 0.3) {
        // Low engagement: only show popular (score > 70)
        return anime.averageScore > 70;
      } else if (engagementScore > 0.7) {
        // High engagement: show more variety, include lower scores
        return anime.averageScore > 60;
      }
      
      // Medium engagement: default filtering
      return anime.averageScore > 65;
    });
  }
  
  rankRecommendations(animeList, userProfile, intent) {
    const { genreWeights } = userProfile.tasteVectors;
    
    return animeList.map(anime => {
      let score = anime.averageScore / 10; // Base score (0-10)
      
      // Boost by genre alignment
      if (anime.genres) {
        anime.genres.forEach(genre => {
          const genreData = genreWeights.get(genre);
          if (genreData) {
            score += genreData.weight * 2; // Genre preference boost
          }
        });
      }
      
      // Intent-specific boosts
      switch(intent.intent) {
        case 'discovery':
          // Boost newer anime
          const currentYear = new Date().getFullYear();
          const yearDiff = currentYear - (anime.seasonYear || currentYear - 1);
          score += Math.max(0, 5 - yearDiff); // Newer = higher boost
          break;
        case 'mood_based':
          // Boost by episode count (shorter for mood-based)
          if (anime.episodes <= 12) score += 1;
          break;
      }
      
      return { ...anime, adaptiveScore: score };
    })
    .sort((a, b) => b.adaptiveScore - a.adaptiveScore);
  }
  
  generateReasoning(genres, intent, userProfile) {
    const topGenre = genres[0];
    const { engagementScore } = userProfile.interactionStats;
    
    const reasonTemplates = {
      recommendation: `Based on your strong interest in ${topGenre} and ${engagementScore > 0.6 ? 'consistent engagement' : 'recent activity'}`,
      discovery: `Focusing on fresh content in ${topGenre} to match your discovery intent`,
      mood_based: `Selected ${topGenre} to align with your current mood`,
      comparison: `Finding similarities while introducing variety in ${topGenre}`,
      chat: `Casual recommendations based on our conversation`
    };
    
    return reasonTemplates[intent.intent] || reasonTemplates.chat;
  }
}