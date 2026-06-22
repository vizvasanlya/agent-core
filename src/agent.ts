import { AgentConfig, PerceptionInput, PerceptionOutput } from './types';
import { MemorySystem } from './memory';
import { ReflectionEngine, LLMProvider } from './reflection';
import { ToolCreator } from './tools';
import { AdaptivePlanner } from './planning';
import { PerceptionLayer } from './perception';
import { CollaborationProtocol } from './collaboration';
import { createLogger, getLogger, logError } from './logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AgentOptions {
  config: AgentConfig;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  llmProvider?: 'openai' | 'anthropic';
}

export class Agent {
  private config: AgentConfig;
  private memory: MemorySystem;
  private reflection: ReflectionEngine;
  private toolCreator: ToolCreator;
  private planner: AdaptivePlanner;
  private perception: PerceptionLayer;
  private collaboration?: CollaborationProtocol;
  private sessionId: string;
  private llmProvider: LLMProvider | null = null;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private logger = getLogger();
  private isInitialized = false;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.sessionId = this.generateSessionId();

    if (this.config.logging) {
      createLogger(this.config.logging);
    }

    this.memory = new MemorySystem(this.config.memory);
    this.reflection = new ReflectionEngine(this.config.reflection);
    this.toolCreator = new ToolCreator(this.config.tools);
    this.planner = new AdaptivePlanner(this.config.planning);
    this.perception = new PerceptionLayer(this.config.perception);

    if (this.config.collaboration) {
      this.collaboration = new CollaborationProtocol(this.config.collaboration);
    }

    this.setupLLMProvider(options);
  }

  private setupLLMProvider(options: AgentOptions): void {
    const provider = options.llmProvider || 'openai';

    if (provider === 'openai' && (options.openaiApiKey || process.env.OPENAI_API_KEY)) {
      this.openai = new OpenAI({
        apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      });
      this.llmProvider = this.createOpenAIProvider();
    } else if (provider === 'anthropic' && (options.anthropicApiKey || process.env.ANTHROPIC_API_KEY)) {
      this.anthropic = new Anthropic({
        apiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      });
      this.llmProvider = this.createAnthropicProvider();
    }
  }

  private createOpenAIProvider(): LLMProvider {
    return {
      chat: async (messages: Array<{ role: string; content: string }>) => {
        const model = this.config.reflection.llmModel || this.config.planning.llmModel || 'gpt-4o-mini';

        const response = await this.openai!.chat.completions.create({
          model,
          messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          temperature: 0.7,
          max_tokens: 4096,
        });

        return response.choices[0]?.message?.content || '';
      },
    };
  }

  private createAnthropicProvider(): LLMProvider {
    return {
      chat: async (messages: Array<{ role: string; content: string }>) => {
        const model = this.config.reflection.llmModel || this.config.planning.llmModel || 'claude-3-haiku-20240307';

        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await this.anthropic!.messages.create({
          model,
          max_tokens: 4096,
          system: systemMessage?.content,
          messages: userMessages as Array<{ role: 'user' | 'assistant'; content: string }>,
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return content.text;
        }
        return '';
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.memory.initialize();
      await this.toolCreator.initialize();

      if (this.llmProvider) {
        await this.reflection.initialize(this.llmProvider);
        await this.planner.initialize(this.llmProvider);
        await this.perception.initialize(this.llmProvider);
      }

      if (this.collaboration) {
        await this.collaboration.initialize();
      }

      this.isInitialized = true;
      this.logger.info({
        sessionId: this.sessionId,
        hasLLM: !!this.llmProvider,
      }, 'Agent initialized');
    } catch (error) {
      logError(error as Error, { component: 'Agent', action: 'initialize' });
      throw error;
    }
  }

  async run(input: string | PerceptionInput): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      const perceptionOutput = await this.perceive(input);
      const memoryContext = await this.retrieveMemory(perceptionOutput);
      const plan = await this.createPlan(perceptionOutput, memoryContext);
      const result = await this.executeWithReflection(plan);
      await this.storeMemory(perceptionOutput, result);

      return result;
    } catch (error) {
      logError(error as Error, { component: 'Agent', action: 'run' });
      throw error;
    }
  }

  private async perceive(input: string | PerceptionInput): Promise<PerceptionOutput> {
    if (typeof input === 'string') {
      return this.perception.analyze({ text: input });
    }
    return this.perception.analyze(input);
  }

  private async retrieveMemory(perception: PerceptionOutput): Promise<string[]> {
    const query = perception.text || '';
    if (!query) return [];

    const results = await this.memory.retrieve(query, 5);
    return results.map(r => r.entry.content);
  }

  private async createPlan(perception: PerceptionOutput, memoryContext: string[]): Promise<any> {
    const goal = perception.text || 'Process input';
    return this.planner.createPlan(goal, memoryContext);
  }

  private async executeWithReflection(plan: any): Promise<string> {
    let result = '';
    let attempts = 0;
    const maxAttempts = this.config.planning.maxRetries + 1;
    let currentPlan = plan;

    while (attempts < maxAttempts) {
      try {
        result = await this.planner.execute(currentPlan);

        if (this.config.reflection.enabled) {
          const critique = await this.reflection.analyze(result, currentPlan);

          this.logger.debug({
            score: critique.overallScore,
            suggestions: critique.suggestions.length,
          }, 'Reflection critique');

          if (critique.overallScore >= 0.8) {
            break;
          }

          currentPlan = await this.reflection.improve(currentPlan, critique);
        } else {
          break;
        }

        attempts++;
      } catch (error) {
        this.logger.error({
          attempt: attempts,
          error: (error as Error).message,
        }, 'Execution failed');

        if (this.config.planning.fallbackStrategies) {
          currentPlan = await this.planner.handleError(currentPlan, error as Error);
        }
        attempts++;
      }
    }

    return result;
  }

  private async storeMemory(perception: PerceptionOutput, result: string): Promise<void> {
    const content = `Input: ${perception.text || 'non-text input'}\nResult: ${result}`;
    await this.memory.store(content, {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async addTool(tool: any): Promise<void> {
    await this.toolCreator.register(tool);
  }

  async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    return this.toolCreator.execute(toolName, params);
  }

  async searchMemory(query: string, limit?: number): Promise<any[]> {
    return this.memory.retrieve(query, limit);
  }

  async getMemory(): Promise<any[]> {
    return this.memory.getAll();
  }

  async clearMemory(): Promise<void> {
    await this.memory.clear();
  }

  async getTools(): Promise<any[]> {
    return this.toolCreator.getAllTools();
  }

  async suggestTools(task: string): Promise<any[]> {
    return this.toolCreator.suggestTools(task);
  }

  async getPlans(): Promise<any[]> {
    return this.planner.getAllPlans();
  }

  async disconnect(): Promise<void> {
    if (this.collaboration) {
      await this.collaboration.disconnect();
    }
    this.logger.info({ sessionId: this.sessionId }, 'Agent disconnected');
  }

  async getStats(): Promise<{
    sessionId: string;
    memory: any;
    tools: any;
    plans: any;
  }> {
    return {
      sessionId: this.sessionId,
      memory: await this.memory.getStats(),
      tools: await this.toolCreator.getToolStats(),
      plans: await this.planner.getStats(),
    };
  }
}