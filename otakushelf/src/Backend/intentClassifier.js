// intentClassifier.js - NEW FILE
class IntentClassifier {
  constructor() {
    this.intentPatterns = {
      recommendation: {
        keywords: ['recommend', 'suggest', 'what should i watch', 'find me', 'looking for'],
        patterns: [/recommend.*anime/i, /suggest.*anime/i, /what.*watch/i],
        confidenceThreshold: 0.7
      },
      discovery: {
        keywords: ['new', 'recent', 'latest', 'upcoming', 'trending'],
        patterns: [/new.*anime/i, /latest.*season/i, /trending.*now/i],
        confidenceThreshold: 0.6
      },
      mood_based: {
        keywords: ['feeling', 'mood', 'sad', 'happy', 'bored', 'excited'],
        patterns: [/feel.*like/i, /in.*mood.*for/i, /when.*i.*am/i],
        confidenceThreshold: 0.5
      },
      comparison: {
        keywords: ['similar', 'like', 'compared', 'vs', 'versus'],
        patterns: [/similar.*to/i, /like.*{anime}/i, /compare.*to/i],
        confidenceThreshold: 0.6
      },
      chat: {
        keywords: [], // Default fallback
        patterns: [],
        confidenceThreshold: 0
      }
    };
  }
  
  classify(userMessage, context = {}) {
    const message = userMessage.toLowerCase();
    const results = [];
    
    // Check each intent pattern
    for (const [intentName, config] of Object.entries(this.intentPatterns)) {
      let confidence = 0;
      
      // Keyword matching
      config.keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          confidence += 0.2;
        }
      });
      
      // Pattern matching
      config.patterns.forEach(pattern => {
        if (pattern.test(userMessage)) {
          confidence += 0.3;
        }
      });
      
      // Context boosting
      if (context.lastIntent === intentName) {
        confidence += 0.1; // Continuation bonus
      }
      
      if (confidence > 0) {
        results.push({
          intent: intentName,
          confidence: Math.min(1, confidence),
          triggeredBy: this.extractTriggers(userMessage, config)
        });
      }
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Return highest confidence intent if above threshold, else chat
    if (results.length > 0 && results[0].confidence >= this.intentPatterns[results[0].intent].confidenceThreshold) {
      return results[0];
    }
    
    return {
      intent: 'chat',
      confidence: 1.0,
      triggeredBy: ['default_fallback']
    };
  }
  
  extractTriggers(message, config) {
    const triggers = [];
    config.keywords.forEach(keyword => {
      if (message.includes(keyword)) triggers.push(keyword);
    });
    return triggers;
  }
}