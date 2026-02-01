// monitorAdaptiveAI.js - NEW FILE
class AdaptiveAIMonitor {
  constructor() {
    this.metrics = {
      profileUpdates: 0,
      intentAccuracy: [],
      recommendationSuccess: [],
      engagementChanges: []
    };
  }
  
  async runDailyReport() {
    // Get all profiles
    const profiles = await UserAIProfile.find({}).limit(100);
    
    const report = {
      date: new Date().toISOString().split('T')[0],
      totalUsers: profiles.length,
      activeUsers: profiles.filter(p => p.interactionStats.totalInteractions > 10).length,
      averageEngagement: this.calculateAverage(profiles, 'interactionStats.engagementScore'),
      tasteDiversity: this.calculateTasteDiversity(profiles),
      learningRate: this.calculateAverage(profiles, 'learningParams.learningRate'),
      explorationRate: this.calculateAverage(profiles, 'learningParams.explorationRate')
    };
    
    console.log('📊 ADAPTIVE AI DAILY REPORT');
    console.log('===========================');
    console.table(report);
    
    // Log sample user evolution
    if (profiles.length > 0) {
      const sampleUser = profiles[Math.floor(Math.random() * profiles.length)];
      console.log('\n👤 SAMPLE USER EVOLUTION:');
      console.log('Top Genres:', Array.from(sampleUser.tasteVectors.genreWeights.entries())
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 3)
        .map(([g, d]) => `${g}: ${d.weight.toFixed(2)} (${d.confidence.toFixed(2)})`));
      console.log('Interactions:', sampleUser.interactionStats.totalInteractions);
      console.log('Engagement:', sampleUser.interactionStats.engagementScore.toFixed(2));
    }
    
    return report;
  }
  
  calculateAverage(profiles, path) {
    const values = profiles.map(p => this.getNestedValue(p, path));
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  calculateTasteDiversity(profiles) {
    let totalGenres = 0;
    let uniqueGenres = new Set();
    
    profiles.forEach(profile => {
      const genres = Array.from(profile.tasteVectors.genreWeights.keys());
      totalGenres += genres.length;
      genres.forEach(g => uniqueGenres.add(g));
    });
    
    return {
      avgGenresPerUser: totalGenres / profiles.length,
      totalUniqueGenres: uniqueGenres.size
    };
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj) || 0;
  }
}

// Run daily at 2 AM
if (require.main === module) {
  const monitor = new AdaptiveAIMonitor();
  monitor.runDailyReport();
}