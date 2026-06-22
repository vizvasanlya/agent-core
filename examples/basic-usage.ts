import { Agent } from '../src/agent';
import { validateConfig } from '../src/config';

async function main() {
  // Configuration
  const config = validateConfig({
    memory: {
      provider: 'local',
      embeddingModel: 'text-embedding-3-small',
      persistence: true,
      maxTokens: 100000,
    },
    reflection: {
      enabled: true,
      critiqueDepth: 'medium',
      learningRate: 0.1,
      maxIterations: 3,
      llmProvider: 'openai',
    },
    planning: {
      adaptive: true,
      maxRetries: 3,
      timeout: 30000,
      fallbackStrategies: true,
      maxSteps: 10,
      llmProvider: 'openai',
    },
    tools: {
      dynamic: true,
      composition: true,
      learning: true,
      sandbox: true,
      maxExecutionTime: 10000,
    },
    perception: {
      modalities: ['text', 'code'],
      uncertainty: true,
    },
  });

  // Initialize agent
  const agent = new Agent({
    config,
    openaiApiKey: process.env.OPENAI_API_KEY,
    llmProvider: 'openai',
  });

  await agent.initialize();

  console.log('Agent initialized successfully!');

  // Example 1: Simple query
  console.log('\n--- Example 1: Simple Query ---');
  const result1 = await agent.run('What are AI agents?');
  console.log('Result:', result1);

  // Example 2: Code analysis
  console.log('\n--- Example 2: Code Analysis ---');
  const result2 = await agent.run({
    code: `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
    `,
  });
  console.log('Result:', result2);

  // Example 3: Memory operations
  console.log('\n--- Example 3: Memory Operations ---');
  await agent.run('The quick brown fox jumps over the lazy dog');
  const memories = await agent.searchMemory('fox');
  console.log('Memories found:', memories.length);

  // Example 4: Tool usage
  console.log('\n--- Example 4: Tool Usage ---');
  const calcResult = await agent.executeTool('calculator', {
    expression: '2 + 2 * 3',
  });
  console.log('Calculator result:', calcResult);

  // Example 5: Get suggestions
  console.log('\n--- Example 5: Tool Suggestions ---');
  const suggestions = await agent.suggestTools('search for information online');
  console.log('Suggested tools:', suggestions.map((t: any) => t.name));

  // Get statistics
  console.log('\n--- Statistics ---');
  const stats = await agent.getStats();
  console.log('Agent stats:', JSON.stringify(stats, null, 2));

  // Cleanup
  await agent.disconnect();
  console.log('\nAgent disconnected.');
}

main().catch(console.error);