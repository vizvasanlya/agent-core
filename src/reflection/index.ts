import { ReflectionConfig, Critique, CritiqueAspect } from '../types';
import { getLogger, logError } from '../logger';

export interface LLMProvider {
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
}

export class ReflectionEngine {
  private learningHistory: Critique[] = [];
  private llmProvider: LLMProvider | null = null;
  private logger = getLogger();

  constructor(_config: ReflectionConfig) {
    // Config stored for future use
  }

  async initialize(llmProvider: LLMProvider): Promise<void> {
    this.llmProvider = llmProvider;
    this.logger.info('Reflection engine initialized');
  }

  async analyze(result: string, context: any): Promise<Critique> {
    if (!this.llmProvider) {
      return this.analyzeWithoutLLM(result, context);
    }

    try {
      return await this.analyzeWithLLM(result, context);
    } catch (error) {
      logError(error as Error, { component: 'ReflectionEngine', action: 'analyze' });
      return this.analyzeWithoutLLM(result, context);
    }
  }

  private async analyzeWithLLM(result: string, context: any): Promise<Critique> {
    const prompt = this.buildCritiquePrompt(result, context);

    const response = await this.llmProvider!.chat([
      { role: 'system', content: this.getCritiqueSystemPrompt() },
      { role: 'user', content: prompt },
    ]);

    return this.parseCritiqueResponse(response);
  }

  private buildCritiquePrompt(result: string, context: any): string {
    return `Analyze the following result and provide a detailed critique.

Context: ${JSON.stringify(context, null, 2)}

Result to analyze:
${result}

Please provide:
1. Relevance score (0-1) - How well does this address the original goal?
2. Clarity score (0-1) - How clear and understandable is this?
3. Completeness score (0-1) - Are all important aspects covered?
4. Accuracy score (0-1) - How accurate is the information?
5. Specific suggestions for improvement.

Format your response as JSON:
{
  "aspects": [
    {"name": "relevance", "score": 0.8, "feedback": "..."},
    {"name": "clarity", "score": 0.9, "feedback": "..."},
    {"name": "completeness", "score": 0.7, "feedback": "..."},
    {"name": "accuracy", "score": 0.85, "feedback": "..."}
  ],
  "overallScore": 0.8,
  "suggestions": ["suggestion1", "suggestion2"]
}`;
  }

  private getCritiqueSystemPrompt(): string {
    return `You are an expert critic and quality assessor. Your role is to analyze outputs and provide constructive feedback.

Rules:
- Be specific and actionable in your feedback
- Provide scores on a 0-1 scale where 1 is perfect
- Focus on both strengths and areas for improvement
- Consider the context and original goal
- Be fair but thorough in your assessment

Respond only with valid JSON.`;
  }

  private parseCritiqueResponse(response: string): Critique {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aspects: parsed.aspects || [],
          overallScore: parsed.overallScore || 0.5,
          suggestions: parsed.suggestions || [],
        };
      }
    } catch {
      this.logger.warn('Failed to parse LLM critique response');
    }

    return this.createBasicCritique(response);
  }

  private createBasicCritique(_content: string): Critique {
    return {
      aspects: [
        { name: 'relevance', score: 0.7, feedback: 'Unable to fully assess with LLM' },
        { name: 'clarity', score: 0.7, feedback: 'Unable to fully assess with LLM' },
        { name: 'completeness', score: 0.7, feedback: 'Unable to fully assess with LLM' },
        { name: 'accuracy', score: 0.7, feedback: 'Unable to fully assess with LLM' },
      ],
      overallScore: 0.7,
      suggestions: ['LLM analysis unavailable, using fallback scoring'],
    };
  }

  private async analyzeWithoutLLM(result: string, context: any): Promise<Critique> {
    const aspects: CritiqueAspect[] = [];

    aspects.push(await this.analyzeRelevance(result, context));
    aspects.push(await this.analyzeClarity(result));
    aspects.push(await this.analyzeCompleteness(result, context));
    aspects.push(await this.analyzeAccuracy(result));

    const overallScore = this.calculateOverallScore(aspects);
    const suggestions = this.generateSuggestions(aspects);

    const critique: Critique = {
      aspects,
      overallScore,
      suggestions,
    };

    this.learningHistory.push(critique);
    return critique;
  }

  async improve(plan: any, critique: Critique): Promise<any> {
    if (!this.llmProvider) {
      return this.improveWithoutLLM(plan, critique);
    }

    try {
      return await this.improveWithLLM(plan, critique);
    } catch (error) {
      logError(error as Error, { component: 'ReflectionEngine', action: 'improve' });
      return this.improveWithoutLLM(plan, critique);
    }
  }

  private async improveWithLLM(plan: any, critique: Critique): Promise<any> {
    const prompt = `Improve the following plan based on the critique.

Original Plan:
${JSON.stringify(plan, null, 2)}

Critique:
${JSON.stringify(critique, null, 2)}

Please provide an improved version of the plan that addresses the feedback.`;

    const response = await this.llmProvider!.chat([
      { role: 'system', content: 'You are an expert at improving plans based on feedback. Return the improved plan as JSON.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall through to basic improvement
    }

    return this.improveWithoutLLM(plan, critique);
  }

  private improveWithoutLLM(plan: any, critique: Critique): any {
    const improvedPlan = { ...plan };

    for (const suggestion of critique.suggestions) {
      if (suggestion.toLowerCase().includes('clarity')) {
        improvedPlan.steps = this.improveClarity(improvedPlan.steps || []);
      } else if (suggestion.toLowerCase().includes('completeness')) {
        improvedPlan.steps = this.improveCompleteness(improvedPlan.steps || []);
      } else if (suggestion.toLowerCase().includes('efficiency')) {
        improvedPlan.steps = this.improveEfficiency(improvedPlan.steps || []);
      }
    }

    return improvedPlan;
  }

  async reflectOnExperience(experience: {
    task: string;
    result: string;
    success: boolean;
  }): Promise<{
    insights: string[];
    patterns: string[];
    improvements: string[];
  }> {
    if (!this.llmProvider) {
      return { insights: [], patterns: [], improvements: [] };
    }

    const prompt = `Reflect on this experience and identify insights, patterns, and improvements.

Task: ${experience.task}
Result: ${experience.result}
Success: ${experience.success}

Provide:
1. Key insights from this experience
2. Patterns you noticed
3. Specific improvements for future similar tasks`;

    const response = await this.llmProvider.chat([
      { role: 'system', content: 'You are an expert at learning from experiences. Provide structured insights.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall through
    }

    return { insights: [], patterns: [], improvements: [] };
  }

  getLearningHistory(): Critique[] {
    return [...this.learningHistory];
  }

  getAverageScore(): number {
    if (this.learningHistory.length === 0) return 0;
    const sum = this.learningHistory.reduce((acc, c) => acc + c.overallScore, 0);
    return sum / this.learningHistory.length;
  }

  private async analyzeRelevance(result: string, context: any): Promise<CritiqueAspect> {
    const relevanceScore = this.calculateRelevance(result, context);
    return {
      name: 'relevance',
      score: relevanceScore,
      feedback: relevanceScore < 0.7
        ? 'Result may not be fully relevant to the context'
        : 'Result is relevant to the context',
    };
  }

  private async analyzeClarity(result: string): Promise<CritiqueAspect> {
    const clarityScore = this.calculateClarity(result);
    return {
      name: 'clarity',
      score: clarityScore,
      feedback: clarityScore < 0.7
        ? 'Result could be clearer and more understandable'
        : 'Result is clear and understandable',
    };
  }

  private async analyzeCompleteness(result: string, context: any): Promise<CritiqueAspect> {
    const completenessScore = this.calculateCompleteness(result, context);
    return {
      name: 'completeness',
      score: completenessScore,
      feedback: completenessScore < 0.7
        ? 'Result may be missing important information'
        : 'Result appears complete',
    };
  }

  private async analyzeAccuracy(result: string): Promise<CritiqueAspect> {
    const accuracyScore = this.calculateAccuracy(result);
    return {
      name: 'accuracy',
      score: accuracyScore,
      feedback: accuracyScore < 0.7
        ? 'Result may contain inaccuracies'
        : 'Result appears accurate',
    };
  }

  private calculateRelevance(result: string, context: any): number {
    const resultWords = result.toLowerCase().split(/\s+/);
    const contextStr = JSON.stringify(context).toLowerCase();
    const contextWords = contextStr.split(/\s+/);

    const intersection = resultWords.filter(word => contextWords.includes(word));
    return intersection.length / Math.max(resultWords.length, 1);
  }

  private calculateClarity(result: string): number {
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = result.length / Math.max(sentences.length, 1);

    const idealLength = 100;
    const deviation = Math.abs(avgSentenceLength - idealLength) / idealLength;

    return Math.max(0, 1 - deviation);
  }

  private calculateCompleteness(result: string, _context: any): number {
    const requiredElements = ['what', 'why', 'how'];
    const resultLower = result.toLowerCase();

    const foundElements = requiredElements.filter(element =>
      resultLower.includes(element)
    );

    return foundElements.length / requiredElements.length;
  }

  private calculateAccuracy(result: string): number {
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const confidentSentences = sentences.filter(s =>
      s.includes('is') || s.includes('are') || s.includes('will')
    );

    return confidentSentences.length / Math.max(sentences.length, 1);
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
    return steps.map((step: any) => ({
      ...step,
      description: `${step.description} (clear and specific)`,
    }));
  }

  private improveCompleteness(steps: any[]): any[] {
    return steps.map((step: any) => ({
      ...step,
      description: `${step.description} (including all necessary details)`,
    }));
  }

  private improveEfficiency(steps: any[]): any[] {
    return steps.filter((_step: any, index: number) => {
      if (index === 0 || index === steps.length - 1) return true;
      return index % 2 === 0;
    });
  }
}