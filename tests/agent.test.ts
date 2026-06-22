import { Agent } from '../src/agent';
import { MemorySystem } from '../src/memory';
import { ReflectionEngine } from '../src/reflection';
import { ToolCreator } from '../src/tools';
import { AdaptivePlanner } from '../src/planning';

describe('Agent Core', () => {
  let agent: Agent;

  beforeEach(async () => {
    agent = new Agent({
      memory: {
        provider: 'local',
        embeddingModel: 'simple',
        persistence: false,
        maxTokens: 1000
      },
      reflection: {
        enabled: true,
        critiqueDepth: 'medium',
        learningRate: 0.1
      },
      planning: {
        adaptive: true,
        maxRetries: 3,
        timeout: 5000
      },
      tools: {
        dynamic: true,
        composition: true,
        learning: true
      },
      perception: {
        modalities: ['text'],
        uncertainty: true
      }
    });

    await agent.initialize();
  });

  test('should initialize successfully', async () => {
    expect(agent).toBeDefined();
  });

  test('should run a simple task', async () => {
    const result = await agent.run('Hello, world!');
    expect(typeof result).toBe('string');
  });
});

describe('MemorySystem', () => {
  let memory: MemorySystem;

  beforeEach(async () => {
    memory = new MemorySystem({
      provider: 'local',
      embeddingModel: 'simple',
      persistence: false,
      maxTokens: 1000
    });
    await memory.initialize();
  });

  test('should store and retrieve memories', async () => {
    await memory.store('Test memory content');
    const results = await memory.retrieve('Test', 5);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should clear memories', async () => {
    await memory.store('Test memory');
    await memory.clear();
    const results = await memory.retrieve('Test', 5);
    expect(results.length).toBe(0);
  });
});

describe('ReflectionEngine', () => {
  let reflection: ReflectionEngine;

  beforeEach(() => {
    reflection = new ReflectionEngine({
      enabled: true,
      critiqueDepth: 'medium',
      learningRate: 0.1
    });
  });

  test('should analyze results', async () => {
    const critique = await reflection.analyze('This is a test result', {});
    expect(critique).toHaveProperty('aspects');
    expect(critique).toHaveProperty('overallScore');
    expect(critique).toHaveProperty('suggestions');
  });
});

describe('ToolCreator', () => {
  let toolCreator: ToolCreator;

  beforeEach(async () => {
    toolCreator = new ToolCreator({
      dynamic: true,
      composition: true,
      learning: true
    });
    await toolCreator.initialize();
  });

  test('should register and execute tools', async () => {
    await toolCreator.create({
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        input: { type: 'string', description: 'Input', required: true }
      },
      implementation: async (params) => ({ result: params.input })
    });

    const result = await toolCreator.execute('test_tool', { input: 'hello' });
    expect(result).toEqual({ result: 'hello' });
  });
});

describe('AdaptivePlanner', () => {
  let planner: AdaptivePlanner;

  beforeEach(() => {
    planner = new AdaptivePlanner({
      adaptive: true,
      maxRetries: 3,
      timeout: 5000
    });
  });

  test('should create and execute plans', async () => {
    const plan = await planner.createPlan('Test goal');
    expect(plan).toHaveProperty('id');
    expect(plan).toHaveProperty('steps');
    expect(plan.steps.length).toBeGreaterThan(0);
  });
});