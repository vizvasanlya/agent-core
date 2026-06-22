import { AgentConfig, PerceptionInput, PerceptionOutput } from './types';
import { MemorySystem } from './memory';
import { ReflectionEngine } from './reflection';
import { ToolCreator } from './tools';
import { AdaptivePlanner } from './planning';
import { PerceptionLayer } from './perception';
import { CollaborationProtocol } from './collaboration';

export class Agent {
  private config: AgentConfig;
  private memory: MemorySystem;
  private reflection: ReflectionEngine;
  private toolCreator: ToolCreator;
  private planner: AdaptivePlanner;
  private perception: PerceptionLayer;
  private collaboration?: CollaborationProtocol;
  private sessionId: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    
    // Initialize components
    this.memory = new MemorySystem(config.memory);
    this.reflection = new ReflectionEngine(config.reflection);
    this.toolCreator = new ToolCreator(config.tools);
    this.planner = new AdaptivePlanner(config.planning);
    this.perception = new PerceptionLayer(config.perception);
    
    if (config.collaboration) {
      this.collaboration = new CollaborationProtocol(config.collaboration);
    }
  }

  async initialize(): Promise<void> {
    await this.memory.initialize();
    await this.toolCreator.initialize();
    
    if (this.collaboration) {
      await this.collaboration.initialize();
    }
  }

  async run(input: string | PerceptionInput): Promise<string> {
    // Process input through perception layer
    const perceptionOutput = await this.perceive(input);
    
    // Retrieve relevant memory
    const memoryContext = await this.retrieveMemory(perceptionOutput);
    
    // Create plan for the task
    const plan = await this.createPlan(perceptionOutput, memoryContext);
    
    // Execute plan with reflection
    const result = await this.executeWithReflection(plan);
    
    // Store result in memory
    await this.storeMemory(perceptionOutput, result);
    
    return result;
  }

  private async perceive(input: string | PerceptionInput): Promise<PerceptionOutput> {
    if (typeof input === 'string') {
      return this.perception.analyze({ text: input });
    }
    return this.perception.analyze(input);
  }

  private async retrieveMemory(perception: PerceptionOutput): Promise<string[]> {
    const query = perception.text || '';
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

    while (attempts < maxAttempts) {
      try {
        result = await this.planner.execute(plan);
        
        // Reflect on the result
        const critique = await this.reflection.analyze(result, plan);
        
        if (critique.overallScore >= 0.8) {
          break; // Good enough result
        }
        
        // Improve based on critique
        plan = await this.reflection.improve(plan, critique);
        attempts++;
      } catch (error) {
        // Handle error with adaptive planning
        plan = await this.planner.handleError(plan, error as Error);
        attempts++;
      }
    }

    return result;
  }

  private async storeMemory(perception: PerceptionOutput, result: string): Promise<void> {
    const content = `Input: ${perception.text}\nResult: ${result}`;
    await this.memory.store(content, {
      sessionId: this.sessionId,
      timestamp: new Date()
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external interaction
  async addTool(tool: any): Promise<void> {
    await this.toolCreator.register(tool);
  }

  async getMemory(): Promise<any[]> {
    return this.memory.getAll();
  }

  async clearMemory(): Promise<void> {
    await this.memory.clear();
  }

  async disconnect(): Promise<void> {
    if (this.collaboration) {
      await this.collaboration.disconnect();
    }
  }
}