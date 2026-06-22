import { PlanningConfig, Plan, PlanStep } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AdaptivePlanner {
  private config: PlanningConfig;
  private plans: Map<string, Plan> = new Map();

  constructor(config: PlanningConfig) {
    this.config = config;
  }

  async createPlan(goal: string, context: string[] = []): Promise<Plan> {
    const steps = await this.decomposeGoal(goal, context);
    
    const plan: Plan = {
      id: uuidv4(),
      goal,
      steps,
      createdAt: new Date(),
      status: 'pending'
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  async execute(plan: Plan): Promise<string> {
    plan.status = 'in_progress';
    const results: string[] = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeStep(step);
        results.push(result);
        step.status = 'completed';
      } catch (error) {
        step.status = 'failed';
        step.retries++;

        if (step.retries < this.config.maxRetries && this.config.adaptive) {
          // Try alternative approach
          const alternativeStep = await this.createAlternativeStep(step, error as Error);
          const alternativeResult = await this.executeStep(alternativeStep);
          results.push(alternativeResult);
          step.status = 'completed';
        } else {
          throw error;
        }
      }
    }

    plan.status = 'completed';
    return results.join('\n');
  }

  async handleError(plan: Plan, error: Error): Promise<Plan> {
    // Find the failed step
    const failedStep = plan.steps.find(step => step.status === 'failed');
    
    if (failedStep && this.config.fallbackStrategies) {
      // Create alternative step
      const alternativeStep = await this.createAlternativeStep(failedStep, error);
      
      // Replace the failed step
      const stepIndex = plan.steps.indexOf(failedStep);
      plan.steps[stepIndex] = alternativeStep;
      
      // Reset dependent steps
      for (let i = stepIndex + 1; i < plan.steps.length; i++) {
        plan.steps[i].status = 'pending';
      }
    }

    return plan;
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async getAllPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }

  private async decomposeGoal(goal: string, context: string[]): Promise<PlanStep[]> {
    // Simple goal decomposition (would use LLM in production)
    const steps: PlanStep[] = [];
    
    // Analyze goal and create steps
    if (goal.toLowerCase().includes('research') || goal.toLowerCase().includes('find')) {
      steps.push({
        id: uuidv4(),
        description: 'Search for relevant information',
        action: 'web_search',
        parameters: { query: goal },
        dependencies: [],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Analyze search results',
        action: 'analyze',
        parameters: { input: 'search_results' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Compile findings',
        action: 'compile',
        parameters: { input: 'analysis' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0
      });
    } else if (goal.toLowerCase().includes('write') || goal.toLowerCase().includes('create')) {
      steps.push({
        id: uuidv4(),
        description: 'Plan content structure',
        action: 'plan',
        parameters: { goal },
        dependencies: [],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Create content',
        action: 'create',
        parameters: { input: 'plan' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Review and refine',
        action: 'review',
        parameters: { input: 'content' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0
      });
    } else {
      // Generic plan
      steps.push({
        id: uuidv4(),
        description: 'Understand the task',
        action: 'analyze',
        parameters: { goal, context },
        dependencies: [],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Execute the task',
        action: 'execute',
        parameters: { input: 'analysis' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0
      });
      
      steps.push({
        id: uuidv4(),
        description: 'Verify results',
        action: 'verify',
        parameters: { input: 'execution' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0
      });
    }

    return steps;
  }

  private async executeStep(step: PlanStep): Promise<string> {
    // Execute the step action (would use tools in production)
    step.status = 'in_progress';
    
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `Completed step: ${step.description}`;
  }

  private async createAlternativeStep(step: PlanStep, error: Error): Promise<PlanStep> {
    // Create alternative approach for failed step
    return {
      id: uuidv4(),
      description: `${step.description} (alternative approach)`,
      action: step.action,
      parameters: {
        ...step.parameters,
        alternative: true,
        error: error.message
      },
      dependencies: step.dependencies,
      status: 'pending',
      retries: 0
    };
  }
}