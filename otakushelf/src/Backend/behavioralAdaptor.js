// behavioralAdaptor.js - NEW FILE
class BehavioralAdaptor {
  constructor(userProfile) {
    this.profile = userProfile;
  }
  
  adaptResponseStyle(aiResponse, userMessage) {
    const { preferredTone, avgResponseLength, engagementScore } = this.profile.interactionStats;
    
    let adaptedResponse = aiResponse;
    
    // Adjust tone
    adaptedResponse = this.applyTone(adaptedResponse, preferredTone);
    
    // Adjust length
    adaptedResponse = this.adjustLength(adaptedResponse, avgResponseLength);
    
    // Adjust enthusiasm based on engagement
    adaptedResponse = this.adjustEnthusiasm(adaptedResponse, engagementScore);
    
    // Add personalization markers
    adaptedResponse = this.addPersonalization(adaptedResponse);
    
    return adaptedResponse;
  }
  
  applyTone(response, tone) {
    switch(tone) {
      case 'formal':
        return response.replace(/don't/g, 'do not')
                      .replace(/can't/g, 'cannot')
                      .replace(/\bguys\b/g, 'everyone');
      
      case 'enthusiastic':
        return response.replace(/\. /g, '! ')
                      .replace(/\bgood\b/g, 'AMAZING')
                      .replace(/\bnice\b/g, 'FANTASTIC');
      
      case 'analytical':
        return response.replace(/\bI think\b/g, 'Based on analysis,')
                      .replace(/\bmaybe\b/g, 'it is possible that');
      
      default: // casual
        return response;
    }
  }
  
  adjustLength(response, targetLength) {
    const currentLength = response.length;
    const ratio = targetLength / currentLength;
    
    if (ratio < 0.7) {
      // Too long, shorten
      const sentences = response.split(/[.!?]+/);
      return sentences.slice(0, Math.ceil(sentences.length * 0.7)).join('. ') + '.';
    } else if (ratio > 1.3) {
      // Too short, expand
      return response + ' What are your thoughts on this?';
    }
    
    return response;
  }
  
  adjustEnthusiasm(response, engagementScore) {
    if (engagementScore > 0.7) {
      // High engagement: more enthusiastic
      const enhancements = ['✨', '🎉', '🔥', '🌟'];
      const randomEnhance = enhancements[Math.floor(Math.random() * enhancements.length)];
      return randomEnhance + ' ' + response;
    } else if (engagementScore < 0.3) {
      // Low engagement: simpler, clearer
      return response.split('.')[0] + '.';
    }
    
    return response;
  }
  
  addPersonalization(response) {
    const { tasteVectors } = this.profile;
    const topGenre = Array.from(tasteVectors.genreWeights.entries())
      .sort((a, b) => b[1].weight - a[1].weight)[0];
    
    if (topGenre && topGenre[1].weight > 0.7) {
      // User has strong preference, reference it
      const personalizations = [
        `Since you love ${topGenre[0]} anime, `,
        `Given your taste for ${topGenre[0]}, `,
        `As a ${topGenre[0]} fan, `
      ];
      
      const selected = personalizations[Math.floor(Math.random() * personalizations.length)];
      return selected + response.charAt(0).toLowerCase() + response.slice(1);
    }
    
    return response;
  }
  
  // Update profile based on interaction
  updateFromInteraction(userMessage, aiResponse, feedback = null) {
    const messageLength = userMessage.length;
    const responseLength = aiResponse.length;
    
    // Update average response length (moving average)
    this.profile.interactionStats.avgResponseLength = 
      (this.profile.interactionStats.avgResponseLength * 0.9) + (responseLength * 0.1);
    
    // Update engagement score
    this.profile.interactionStats.totalInteractions += 1;
    
    if (feedback === 'positive') {
      this.profile.interactionStats.positiveFeedback += 1;
    } else if (feedback === 'negative') {
      this.profile.interactionStats.negativeFeedback += 1;
    }
    
    // Calculate new engagement score
    const total = this.profile.interactionStats.totalInteractions;
    const positive = this.profile.interactionStats.positiveFeedback;
    const recentInteractions = Math.min(10, total);
    
    this.profile.interactionStats.engagementScore = 
      (positive / Math.max(1, total)) * 0.7 + 
      (recentInteractions / 10) * 0.3;
    
    // Detect tone preference
    this.detectTonePreference(userMessage);
    
    // Update recent activity
    this.updateRecentActivity(userMessage);
    
    return this.profile;
  }
  
  detectTonePreference(message) {
    const casualMarkers = ['lol', 'haha', 'omg', 'btw', 'imo'];
    const formalMarkers = ['please', 'thank you', 'could you', 'would you'];
    const enthusiasticMarkers = ['!!!', '??', 'love', 'awesome', 'amazing'];
    
    let casualCount = 0, formalCount = 0, enthusiasticCount = 0;
    
    casualMarkers.forEach(marker => {
      if (message.includes(marker)) casualCount++;
    });
    
    formalMarkers.forEach(marker => {
      if (message.includes(marker)) formalCount++;
    });
    
    enthusiasticMarkers.forEach(marker => {
      if (message.includes(marker)) enthusiasticCount++;
    });
    
    if (enthusiasticCount > 2) {
      this.profile.interactionStats.preferredTone = 'enthusiastic';
    } else if (formalCount > 1) {
      this.profile.interactionStats.preferredTone = 'formal';
    } else if (casualCount > 1) {
      this.profile.interactionStats.preferredTone = 'casual';
    }
  }
  
  updateRecentActivity(message) {
    // Extract potential themes
    const themes = this.extractThemes(message);
    themes.forEach(theme => {
      this.profile.recentActivity.conversationThemes.push({
        theme,
        timestamp: new Date(),
        sentiment: 0.5 // Default neutral
      });
    });
    
    // Keep only last 20 themes
    if (this.profile.recentActivity.conversationThemes.length > 20) {
      this.profile.recentActivity.conversationThemes = 
        this.profile.recentActivity.conversationThemes.slice(-20);
    }
  }
  
  extractThemes(message) {
    const themeKeywords = {
      'character': ['character', 'mc', 'protagonist', 'hero'],
      'story': ['plot', 'story', 'narrative', 'ending'],
      'animation': ['animation', 'art', 'visual', 'style'],
      'sound': ['music', 'opening', 'ending', 'soundtrack'],
      'genre': ['genre', 'type', 'category']
    };
    
    const foundThemes = [];
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        foundThemes.push(theme);
      }
    });
    
    return foundThemes.length > 0 ? foundThemes : ['general'];
  }
}