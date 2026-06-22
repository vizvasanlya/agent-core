import { ReflectionConfig, Critique, CritiqueAspect } from '../types';

export class ReflectionEngine {
  private config: ReflectionConfig;
  private learningHistory: Critique[] = [];

  constructor(config: ReflectionConfig) {
    this.config = config;
  }

  async analyze(result: string, context: any): Promise<Critique> {
    const aspects: CritiqueAspect[] = [];

    // Analyze different aspects based on depth
    if (this.config.critiqueDepth === 'shallow') {
      aspects.push(await this.analyzeRelevance(result, context));
      aspects.push(await this.analyzeClarity(result));
    } else if (this.config.critiqueDepth === 'medium') {
      aspects.push(await this.analyzeRelevance(result, context));
      aspects.push(await this.analyzeClarity(result));
      aspects.push(await this.analyzeCompleteness(result, context));
      aspects.push(await this.analyzeAccuracy(result));
    } else {
      // Deep analysis
      aspects.push(await this.analyzeRelevance(result, context));
      aspects.push(await this.analyzeClarity(result));
      aspects.push(await this.analyzeCompleteness(result, context));
      aspects.push(await this.analyzeAccuracy(result));
      aspects.push(await this.analyzeEfficiency(result, context));
      aspects.push(await this.analyzeCreativity(result));
    }

    const overallScore = this.calculateOverallScore(aspects);
    const suggestions = this.generateSuggestions(aspects);

    const critique: Critique = {
      aspects,
      overallScore,
      suggestions
    };

    this.learningHistory.push(critique);
    return critique;
  }

  async improve(plan: any, critique: Critique): Promise<any> {
    // Apply improvements based on critique suggestions
    const improvedPlan = { ...plan };

    for (const suggestion of critique.suggestions) {
      if (suggestion.includes('clarity')) {
        improvedPlan.steps = this.improveClarity(improvedPlan.steps);
      } else if (suggestion.includes('completeness')) {
        improvedPlan.steps = this.improveCompleteness(improvedPlan.steps);
      } else if (suggestion.includes('efficiency')) {
        improvedPlan.steps = this.improveEfficiency(improvedPlan.steps);
      }
    }

    return improvedPlan;
  }

  private async analyzeRelevance(result: string, context: any): Promise<CritiqueAspect> {
    // Check if result is relevant to the context
    const relevanceScore = this.calculateRelevance(result, context);
    
    return {
      name: 'relevance',
      score: relevanceScore,
      feedback: relevanceScore < 0.7 
        ? 'Result may not be fully relevant to the context'
        : 'Result is relevant to the context'
    };
  }

  private async analyzeClarity(result: string): Promise<CritiqueAspect> {
    // Check clarity of the result
    const clarityScore = this.calculateClarity(result);
    
    return {
      name: 'clarity',
      score: clarityScore,
      feedback: clarityScore < 0.7
        ? 'Result could be clearer and more understandable'
        : 'Result is clear and understandable'
    };
  }

  private async analyzeCompleteness(result: string, context: any): Promise<CritiqueAspect> {
    // Check completeness of the result
    const completenessScore = this.calculateCompleteness(result, context);
    
    return {
      name: 'completeness',
      score: completenessScore,
      feedback: completenessScore < 0.7
        ? 'Result may be missing important information'
        : 'Result appears complete'
    };
  }

  private async analyzeAccuracy(result: string): Promise<CritiqueAspect> {
    // Check accuracy of the result
    const accuracyScore = this.calculateAccuracy(result);
    
    return {
      name: 'accuracy',
      score: accuracyScore,
      feedback: accuracyScore < 0.7
        ? 'Result may contain inaccuracies'
        : 'Result appears accurate'
    };
  }

  private async analyzeEfficiency(result: string, context: any): Promise<CritiqueAspect> {
    // Check efficiency of the result
    const efficiencyScore = this.calculateEfficiency(result, context);
    
    return {
      name: 'efficiency',
      score: efficiencyScore,
      feedback: efficiencyScore < 0.7
        ? 'Result could be more efficient'
        : 'Result is efficiently structured'
    };
  }

  private async analyzeCreativity(result: string): Promise<CritiqueAspect> {
    // Check creativity of the result
    const creativityScore = this.calculateCreativity(result);
    
    return {
      name: 'creativity',
      score: creativityScore,
      feedback: creativityScore < 0.7
        ? 'Result could be more creative'
        : 'Result shows creativity'
    };
  }

  private calculateRelevance(result: string, context: any): number {
    // Simple relevance calculation
    const resultWords = result.toLowerCase().split(/\s+/);
    const contextStr = JSON.stringify(context).toLowerCase();
    const contextWords = contextStr.split(/\s+/);
    
    const intersection = resultWords.filter(word => contextWords.includes(word));
    return intersection.length / Math.max(resultWords.length, 1);
  }

  private calculateClarity(result: string): number {
    // Simple clarity calculation based on sentence length and structure
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = result.length / Math.max(sentences.length, 1);
    
    // Ideal sentence length is 15-20 words
    const idealLength = 100; // characters
    const deviation = Math.abs(avgSentenceLength - idealLength) / idealLength;
    
    return Math.max(0, 1 - deviation);
  }

  private calculateCompleteness(result: string, context: any): number {
    // Simple completeness calculation
    const requiredElements = ['what', 'why', 'how'];
    const resultLower = result.toLowerCase();
    
    const foundElements = requiredElements.filter(element => 
      resultLower.includes(element)
    );
    
    return foundElements.length / requiredElements.length;
  }

  private calculateAccuracy(result: string): number {
    // Simple accuracy calculation (would use fact-checking in production)
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const confidentSentences = sentences.filter(s => 
      s.includes('is') || s.includes('are') || s.includes('will')
    );
    
    return confidentSentences.length / Math.max(sentences.length, 1);
  }

  private calculateEfficiency(result: string, context: any): number {
    // Simple efficiency calculation
    const resultLength = result.length;
    const contextLength = JSON.stringify(context).length;
    
    // Result should be proportional to context
    const ratio = resultLength / Math.max(contextLength, 1);
    
    // Ideal ratio is around 0.5-2.0
    if (ratio >= 0.5 && ratio <= 2.0) {
      return 1.0;
    } else if (ratio < 0.5) {
      return ratio / 0.5;
    } else {
      return 2.0 / ratio;
    }
  }

  private calculateCreativity(result: string): number {
    // Simple creativity calculation
    const words = result.split(/\s+/);
    const uniqueWords = new Set(words);
    
    // Higher vocabulary diversity = higher creativity
    const diversity = uniqueWords.size / Math.max(words.length, 1);
    
    // Bonus for questions and exclamations
    const questions = (result.match(/\?/g) || []).length;
    const exclamations = (result.match(/!/g) || []).length;
    
    return Math.min(1.0, diversity + (questions + exclamations) * 0.1);
  }

  private calculateOverallScore(aspects: CritiqueAspect[]): number {
    if (aspects.length === 0) return 0;
    
    const sum = aspects.reduce((acc, aspect) => acc + aspect.score, 0);
    return sum / aspects.length;
  }

  private generateSuggestions(aspects: CritiqueAspect[]): string[] {
    const suggestions: string[] = [];
    
    for (const aspect of aspects) {
      if (aspect.score < 0.7) {
        suggestions.push(`Improve ${aspect.name}: ${aspect.feedback}`);
      }
    }
    
    return suggestions;
  }

  private improveClarity(steps: any[]): any[] {
    // Improve clarity of steps
    return steps.map(step => ({
      ...step,
      description: step.description + ' (clear and specific)'
    }));
  }

  private improveCompleteness(steps: any[]): any[] {
    // Add missing elements to steps
    return steps.map(step => ({
      ...step,
      description: step.description + ' (including all necessary details)'
    }));
  }

  private improveEfficiency(steps: any[]): any[] {
    // Remove redundant steps
    return steps.filter((step, index) => {
      // Keep first and last steps, and every other step in between
      if (index === 0 || index === steps.length - 1) return true;
      return index % 2 === 0;
    });
  }
}