import { PlanningConfig, Plan, PlanStep } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../logger';
import { LLMProvider } from '../reflection';

export class AdaptivePlanner {
  private config: PlanningConfig;
  private plans: Map<string, Plan> = new Map();
  private llmProvider: LLMProvider | null = null;
  private logger = getLogger();

  constructor(config: PlanningConfig) {
    this.config = config;
  }

  async initialize(llmProvider: LLMProvider): Promise<void> {
    this.llmProvider = llmProvider;
    this.logger.info('Adaptive planner initialized');
  }

  async createPlan(goal: string, context: string[] = []): Promise<Plan> {
    let steps: PlanStep[];

    if (this.llmProvider) {
      steps = await this.createPlanWithLLM(goal, context);
    } else {
      steps = await this.createPlanWithoutLLM(goal, context);
    }

    const plan: Plan = {
      id: uuidv4(),
      goal,
      steps,
      createdAt: new Date(),
      status: 'pending',
    };

    this.plans.set(plan.id, plan);
    this.logger.info({ planId: plan.id, goal, steps: steps.length }, 'Plan created');

    return plan;
  }

  private async createPlanWithLLM(goal: string, context: string[]): Promise<PlanStep[]> {
    const prompt = `Create a detailed plan to achieve the following goal.

Goal: ${goal}
Context: ${context.join('\n')}

Provide a step-by-step plan with:
1. Clear description for each step
2. Required parameters
3. Dependencies between steps

Format your response as JSON:
{
  "steps": [
    {
      "description": "Step description",
      "action": "action_type",
      "parameters": {"key": "value"},
      "dependencies": []
    }
  ]
}`;

    const response = await this.llmProvider!.chat([
      { role: 'system', content: this.getPlannerSystemPrompt() },
      { role: 'user', content: prompt },
    ]);

    return this.parsePlanResponse(response);
  }

  private getPlannerSystemPrompt(): string {
    return `You are an expert planner who creates detailed, actionable plans.

Rules:
- Break down complex tasks into manageable steps
- Consider dependencies between steps
- Be specific about parameters and actions
- Include error handling considerations
- Keep plans focused and efficient

Respond only with valid JSON.`;
  }

  private parsePlanResponse(response: string): PlanStep[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.steps || []).map((step: any) => ({
          id: uuidv4(),
          description: step.description || 'Unnamed step',
          action: step.action || 'execute',
          parameters: step.parameters || {},
          dependencies: step.dependencies || [],
          status: 'pending' as const,
          retries: 0,
        }));
      }
    } catch {
      this.logger.warn('Failed to parse LLM plan response');
    }

    return [];
  }

  private async createPlanWithoutLLM(goal: string, _context: string[]): Promise<PlanStep[]> {
    const steps: PlanStep[] = [];
    const goalLower = goal.toLowerCase();

    if (goalLower.includes('research') || goalLower.includes('find')) {
      steps.push({
        id: uuidv4(),
        description: 'Search for relevant information',
        action: 'web_search',
        parameters: { query: goal },
        dependencies: [],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Analyze search results',
        action: 'analyze',
        parameters: { input: 'search_results' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Compile findings',
        action: 'compile',
        parameters: { input: 'analysis' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0,
      });
    } else if (goalLower.includes('write') || goalLower.includes('create')) {
      steps.push({
        id: uuidv4(),
        description: 'Plan content structure',
        action: 'plan',
        parameters: { goal },
        dependencies: [],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Create content',
        action: 'create',
        parameters: { input: 'plan' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Review and refine',
        action: 'review',
        parameters: { input: 'content' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0,
      });
    } else if (goalLower.includes('code') || goalLower.includes('implement')) {
      steps.push({
        id: uuidv4(),
        description: 'Analyze requirements',
        action: 'analyze',
        parameters: { goal },
        dependencies: [],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Design solution',
        action: 'design',
        parameters: { input: 'analysis' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Implement code',
        action: 'implement',
        parameters: { input: 'design' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Test and verify',
        action: 'test',
        parameters: { input: 'implementation' },
        dependencies: [steps[2].id],
        status: 'pending',
        retries: 0,
      });
    } else {
      steps.push({
        id: uuidv4(),
        description: 'Understand the task',
        action: 'analyze',
        parameters: { goal },
        dependencies: [],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Execute the task',
        action: 'execute',
        parameters: { input: 'analysis' },
        dependencies: [steps[0].id],
        status: 'pending',
        retries: 0,
      });

      steps.push({
        id: uuidv4(),
        description: 'Verify results',
        action: 'verify',
        parameters: { input: 'execution' },
        dependencies: [steps[1].id],
        status: 'pending',
        retries: 0,
      });
    }

    return steps;
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
        this.logger.error({
          stepId: step.id,
          error: (error as Error).message,
        }, 'Step failed');

        if (step.retries < this.config.maxRetries && this.config.adaptive) {
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
    this.logger.info({ planId: plan.id, results: results.length }, 'Plan executed');
    return results.join('\n');
  }

  async handleError(plan: Plan, error: Error): Promise<Plan> {
    const failedStep = plan.steps.find(step => step.status === 'failed');

    if (failedStep && this.config.fallbackStrategies) {
      const alternativeStep = await this.createAlternativeStep(failedStep, error);
      const stepIndex = plan.steps.indexOf(failedStep);
      plan.steps[stepIndex] = alternativeStep;

      for (let i = stepIndex + 1; i < plan.steps.length; i++) {
        plan.steps[i].status = 'pending';
      }
    }

    return plan;
  }

  private async executeStep(step: PlanStep): Promise<string> {
    step.status = 'in_progress';
    this.logger.debug({ stepId: step.id, action: step.action }, 'Executing step');

    await new Promise(resolve => setTimeout(resolve, 100));

    return `Completed step: ${step.description}`;
  }

  private async createAlternativeStep(step: PlanStep, error: Error): Promise<PlanStep> {
    return {
      id: uuidv4(),
      description: `${step.description} (alternative approach)`,
      action: step.action,
      parameters: {
        ...step.parameters,
        alternative: true,
        error: error.message,
      },
      dependencies: step.dependencies,
      status: 'pending',
      retries: 0,
    };
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.plans.get(id);
  }

  async getAllPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }

  async updatePlan(plan: Plan): Promise<void> {
    this.plans.set(plan.id, plan);
  }

  async deletePlan(id: string): Promise<void> {
    this.plans.delete(id);
  }

  async getStats(): Promise<{
    totalPlans: number;
    completedPlans: number;
    failedPlans: number;
  }> {
    const plans = Array.from(this.plans.values());
    return {
      totalPlans: plans.length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      failedPlans: plans.filter(p => p.status === 'failed').length,
    };
  }
}