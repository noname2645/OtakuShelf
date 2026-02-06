// userAIProfile.js - NEW FILE
const userAIProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  
  // Taste Vectors (Weighted genre preferences)
  tasteVectors: {
    genreWeights: {
      type: Map,
      of: {
        weight: { type: Number, default: 0.5, min: 0, max: 1 },
        confidence: { type: Number, default: 0.1, min: 0, max: 1 },
        lastUpdated: { type: Date, default: Date.now },
        interactions: { type: Number, default: 0 }
      },
      default: {}
    },
    themeWeights: Map,
    studioPreferences: Map,
    eraPreferences: {
      '2000s': { type: Number, default: 0.5 },
      '2010s': { type: Number, default: 0.5 },
      '2020s': { type: Number, default: 0.5 }
    }
  },
  
  // Interaction Statistics
  interactionStats: {
    totalInteractions: { type: Number, default: 0 },
    recommendationClicks: { type: Number, default: 0 },
    positiveFeedback: { type: Number, default: 0 },
    negativeFeedback: { type: Number, default: 0 },
    avgResponseLength: { type: Number, default: 150 },
    preferredTone: { 
      type: String, 
      enum: ['casual', 'formal', 'enthusiastic', 'analytical'],
      default: 'casual'
    },
    engagementScore: { type: Number, default: 0.5 }
  },
  
  // Behavioral Patterns
  behavioralPatterns: {
    peakInteractionTimes: [{
      hour: Number,
      frequency: Number
    }],
    preferredGenresByMood: Map,
    conversationTriggers: [String],
    avoidedTopics: [String]
  },
  
  // Learning Parameters
  learningParams: {
    decayRate: { type: Number, default: 0.95 }, // How quickly preferences fade
    learningRate: { type: Number, default: 0.1 }, // How quickly new info affects weights
    explorationRate: { type: Number, default: 0.2 } // Try new genres occasionally
  },
  
  // Trend Windows (Recent activity)
  recentActivity: {
    lastWatchedGenres: [String],
    searchHistory: [String],
    conversationThemes: [{
      theme: String,
      timestamp: Date,
      sentiment: Number
    }]
  },
  
  // System State
  lastUpdated: { type: Date, default: Date.now },
  version: { type: String, default: '1.0' }
});

const UserAIProfile = mongoose.model("UserAIProfile", userAIProfileSchema);