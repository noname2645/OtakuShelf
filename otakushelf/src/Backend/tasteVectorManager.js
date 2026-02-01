// tasteVectorManager.js - NEW FILE
class TasteVectorManager {
  constructor(userProfile) {
    this.profile = userProfile;
    this.genres = [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
      'Romance', 'Sci-Fi', 'Slice of Life', 'Mystery', 'Horror',
      'Sports', 'Psychological', 'Supernatural', 'Mecha', 'Isekai'
    ];
  }
  
  // Update weights based on user action
  updateFromAction(action, animeData) {
    const { genreWeights } = this.profile.tasteVectors;
    const { learningRate, decayRate } = this.profile.learningParams;
    
    // Apply time decay to all weights first
    this.applyTimeDecay(decayRate);
    
    // Calculate impact based on action type
    const impactMap = {
      'watched': 0.3,
      'completed': 0.5,
      'rated_high': 0.7,
      'rated_low': -0.3,
      'dropped': -0.4,
      'saved': 0.2,
      'ignored': -0.1
    };
    
    const impact = impactMap[action] || 0.1;
    
    // Update weights for anime genres
    if (animeData.genres) {
      animeData.genres.forEach(genre => {
        const current = genreWeights.get(genre) || { weight: 0.5, confidence: 0.1 };
        
        // Update weight with learning rate
        const newWeight = current.weight + (impact * learningRate);
        const newConfidence = Math.min(1, current.confidence + 0.05);
        
        genreWeights.set(genre, {
          weight: Math.max(0, Math.min(1, newWeight)),
          confidence: newConfidence,
          lastUpdated: new Date(),
          interactions: (current.interactions || 0) + 1
        });
      });
    }
    
    return this.profile;
  }
  
  applyTimeDecay(decayRate) {
    const { genreWeights } = this.profile.tasteVectors;
    const now = new Date();
    
    genreWeights.forEach((value, key) => {
      const daysSinceUpdate = (now - new Date(value.lastUpdated)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 7) { // Only decay after 7 days
        const decayFactor = Math.pow(decayRate, Math.floor(daysSinceUpdate / 7));
        genreWeights.set(key, {
          ...value,
          weight: value.weight * decayFactor,
          lastUpdated: now
        });
      }
    });
  }
  
  // Get top genres for recommendations
  getTopGenres(limit = 3) {
    const { genreWeights } = this.profile.tasteVectors;
    const entries = Array.from(genreWeights.entries());
    
    return entries
      .sort((a, b) => {
        // Sort by weight * confidence (certain preference)
        const scoreA = a[1].weight * a[1].confidence;
        const scoreB = b[1].weight * b[1].confidence;
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .map(([genre, data]) => ({ genre, ...data }));
  }
  
  // Get exploration genres (try something new)
  getExplorationGenres(limit = 2) {
    const { genreWeights } = this.profile.tasteVectors;
    const { explorationRate } = this.profile.learningParams;
    
    // Get genres with low interaction count
    const allGenres = this.genres.filter(g => !genreWeights.has(g) || genreWeights.get(g).interactions < 3);
    
    // Random selection with exploration rate
    const selected = [];
    allGenres.forEach(genre => {
      if (Math.random() < explorationRate && selected.length < limit) {
        selected.push(genre);
      }
    });
    
    return selected.length > 0 ? selected : ['Slice of Life', 'Sports']; // Default exploration
  }
}