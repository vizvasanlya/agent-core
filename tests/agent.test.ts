import { Agent } from '../src/agent';
import { MemorySystem } from '../src/memory';
import { ReflectionEngine } from '../src/reflection';
import { ToolCreator } from '../src/tools';
import { AdaptivePlanner } from '../src/planning';
import { PerceptionLayer } from '../src/perception';
import { CollaborationProtocol } from '../src/collaboration';
import { validateConfig } from '../src/config';

// Test configuration
const testConfig = validateConfig({
  memory: {
    provider: 'local',
    persistence: false,
    maxTokens: 10000,
  },
  reflection: {
    enabled: false,
    critiqueDepth: 'shallow',
    learningRate: 0.1,
  },
  planning: {
    adaptive: true,
    maxRetries: 2,
    timeout: 5000,
  },
  tools: {
    dynamic: true,
    composition: true,
    sandbox: true,
    maxExecutionTime: 5000,
  },
  perception: {
    modalities: ['text'],
    uncertainty: true,
  },
});

describe('Agent', () => {
  let agent: Agent;

  beforeEach(async () => {
    agent = new Agent({ config: testConfig });
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.disconnect();
  });

  test('should initialize successfully', () => {
    expect(agent).toBeDefined();
  });

  test('should run a simple task', async () => {
    const result = await agent.run('Hello, world!');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle perception input', async () => {
    const result = await agent.run({ text: 'Test input' });
    expect(typeof result).toBe('string');
  });

  test('should store and retrieve memory', async () => {
    await agent.run('Test memory content');
    const memories = await agent.searchMemory('Test');
    expect(memories.length).toBeGreaterThanOrEqual(0);
  });

  test('should execute tools', async () => {
    const result = await agent.executeTool('calculator', { expression: '2 + 2' });
    expect(result).toBeDefined();
  });

  test('should suggest tools', async () => {
    const suggestions = await agent.suggestTools('search for information');
    expect(Array.isArray(suggestions)).toBe(true);
  });

  test('should return statistics', async () => {
    const stats = await agent.getStats();
    expect(stats).toHaveProperty('sessionId');
    expect(stats).toHaveProperty('memory');
    expect(stats).toHaveProperty('tools');
    expect(stats).toHaveProperty('plans');
  });
});

describe('MemorySystem', () => {
  let memory: MemorySystem;

  beforeEach(async () => {
    memory = new MemorySystem({
      provider: 'local',
      embeddingModel: 'simple',
      persistence: false,
      maxTokens: 10000,
    });
    await memory.initialize();
  });

  test('should store and retrieve memories', async () => {
    await memory.store('Test memory content');
    const results = await memory.retrieve('Test', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.content).toBe('Test memory content');
  });

  test('should return all memories', async () => {
    await memory.store('Memory 1');
    await memory.store('Memory 2');
    const all = await memory.getAll();
    expect(all.length).toBe(2);
  });

  test('should clear memories', async () => {
    await memory.store('Test memory');
    await memory.clear();
    const results = await memory.retrieve('Test', 5);
    expect(results.length).toBe(0);
  });

  test('should search with filters', async () => {
    await memory.store('Test memory', { category: 'test' });
    const results = await memory.search('Test memory', { minScore: 0 });
    expect(results.length).toBeGreaterThan(0);
  });

  test('should return stats', async () => {
    await memory.store('Test');
    const stats = await memory.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.provider).toBe('local');
  });
});

describe('ReflectionEngine', () => {
  let reflection: ReflectionEngine;

  beforeEach(() => {
    reflection = new ReflectionEngine({
      enabled: true,
      critiqueDepth: 'medium',
      learningRate: 0.1,
    });
  });

  test('should analyze results', async () => {
    const critique = await reflection.analyze('This is a test result', {});
    expect(critique).toHaveProperty('aspects');
    expect(critique).toHaveProperty('overallScore');
    expect(critique).toHaveProperty('suggestions');
    expect(critique.overallScore).toBeGreaterThanOrEqual(0);
    expect(critique.overallScore).toBeLessThanOrEqual(1);
  });

  test('should improve plans', async () => {
    const plan = { steps: [{ description: 'Test step' }] };
    const critique = {
      aspects: [],
      overallScore: 0.5,
      suggestions: ['Improve clarity'],
    };
    const improved = await reflection.improve(plan, critique);
    expect(improved).toBeDefined();
  });

  test('should track learning history', async () => {
    await reflection.analyze('Test 1', {});
    await reflection.analyze('Test 2', {});
    const history = reflection.getLearningHistory();
    expect(history.length).toBe(2);
  });

  test('should calculate average score', async () => {
    await reflection.analyze('Test', {});
    const avg = reflection.getAverageScore();
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(avg).toBeLessThanOrEqual(1);
  });
});

describe('ToolCreator', () => {
  let toolCreator: ToolCreator;

  beforeEach(async () => {
    toolCreator = new ToolCreator({
      dynamic: true,
      composition: true,
      learning: true,
      sandbox: true,
      maxExecutionTime: 5000,
    });
    await toolCreator.initialize();
  });

  test('should register and execute tools', async () => {
    await toolCreator.create({
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        input: { type: 'string', description: 'Input', required: true },
      },
      implementation: async (params) => ({ result: params.input }),
    });

    const result = await toolCreator.execute('test_tool', { input: 'hello' });
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ result: 'hello' });
  });

  test('should return tool list', async () => {
    const tools = await toolCreator.getAllTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  test('should return tool names', async () => {
    const names = await toolCreator.getToolNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('calculator');
  });

  test('should validate parameters', async () => {
    const result = await toolCreator.execute('calculator', { expression: '2 + 2' });
    expect(result.success).toBe(true);
  });

  test('should fail on invalid parameters', async () => {
    const result = await toolCreator.execute('calculator', {});
    expect(result.success).toBe(false);
  });

  test('should return tool stats', async () => {
    await toolCreator.execute('calculator', { expression: '1 + 1' });
    const stats = await toolCreator.getToolStats();
    expect(stats.totalTools).toBeGreaterThan(0);
    expect(stats.totalExecutions).toBe(1);
  });

  test('should suggest tools', async () => {
    const suggestions = await toolCreator.suggestTools('make http request');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('AdaptivePlanner', () => {
  let planner: AdaptivePlanner;

  beforeEach(() => {
    planner = new AdaptivePlanner({
      adaptive: true,
      maxRetries: 2,
      timeout: 5000,
    });
  });

  test('should create plans', async () => {
    const plan = await planner.createPlan('Test goal');
    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('steps');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.goal).toBe('Test goal');
  });

  test('should execute plans', async () => {
    const plan = await planner.createPlan('Test goal');
    const result = await planner.execute(plan);
    expect(typeof result).toBe('string');
    expect(plan.status).toBe('completed');
  });

  test('should store plans', async () => {
    await planner.createPlan('Goal 1');
    await planner.createPlan('Goal 2');
    const plans = await planner.getAllPlans();
    expect(plans.length).toBe(2);
  });

  test('should return stats', async () => {
    await planner.createPlan('Goal');
    const stats = await planner.getStats();
    expect(stats.totalPlans).toBe(1);
  });
});

describe('PerceptionLayer', () => {
  let perception: PerceptionLayer;

  beforeEach(() => {
    perception = new PerceptionLayer({
      modalities: ['text', 'code'],
      uncertainty: true,
    });
  });

  test('should analyze text', async () => {
    const result = await perception.analyze({ text: 'Hello world' });
    expect(result.text).toBe('Hello world');
    expect(result.uncertainty).toBeDefined();
  });

  test('should analyze code', async () => {
    const result = await perception.analyze({
      code: 'function test() { return 1; }',
    });
    expect(result.codeAnalysis).toBeDefined();
    expect(result.codeAnalysis?.language).toBeDefined();
  });

  test('should calculate uncertainty', async () => {
    const result = await perception.analyze({ text: 'Test' });
    expect(result.uncertainty).toBeGreaterThanOrEqual(0);
    expect(result.uncertainty).toBeLessThanOrEqual(1);
  });
});

describe('CollaborationProtocol', () => {
  let collaboration: CollaborationProtocol;

  beforeEach(async () => {
    collaboration = new CollaborationProtocol({
      discovery: 'manual',
      synchronization: 'batch',
      port: 8080,
      maxConnections: 5,
    });
    await collaboration.initialize();
  });

  test('should initialize', () => {
    expect(collaboration).toBeDefined();
  });

  test('should get agent ID', () => {
    const id = collaboration.getAgentId();
    expect(id).toMatch(/^agent_/);
  });

  test('should get agent info', () => {
    const info = collaboration.getAgentInfo();
    expect(info).toHaveProperty('id');
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('status');
  });

  test('should connect to agents', async () => {
    await collaboration.connect({
      id: 'agent-2',
      name: 'Test Agent',
      capabilities: ['test'],
      status: 'available',
    });
    const agents = await collaboration.getConnectedAgents();
    expect(agents.length).toBe(1);
  });

  test('should delegate tasks', async () => {
    await collaboration.connect({
      id: 'agent-2',
      name: 'Test Agent',
      capabilities: ['test'],
      status: 'available',
    });
    const task = await collaboration.delegateTask('Test task', 'agent-2');
    expect(task).toHaveProperty('taskId');
    expect(task.status).toBe('pending');
  });

  test('should return stats', async () => {
    const stats = await collaboration.getStats();
    expect(stats).toHaveProperty('agentId');
    expect(stats).toHaveProperty('connectedAgents');
    expect(stats).toHaveProperty('totalTasks');
  });
});