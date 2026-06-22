# Agent Core

[![CI/CD Pipeline](https://github.com/vizvasanlya/agent-core/actions/workflows/ci.yml/badge.svg)](https://github.com/vizvasanlya/agent-core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@agent-core/framework.svg)](https://www.npmjs.com/package/@agent-core/framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)](https://github.com/vizvasanlya/agent-core)

A production-ready AI agent framework with persistent memory, self-reflection, and adaptive planning capabilities.

## Features

- **Persistent Long-Term Memory** - Vector-based retrieval with ChromaDB/local storage
- **Self-Reflection Engine** - LLM-powered critique and continuous improvement
- **Dynamic Tool Creation** - Runtime tool registration and composition
- **Adaptive Planning** - Goal decomposition with error recovery
- **Multi-Modal Perception** - Text, image, audio, and code analysis
- **Agent Collaboration** - Multi-agent communication protocol
- **Token Management** - Budget tracking and message truncation
- **Rate Limiting** - Request throttling with exponential backoff
- **Circuit Breaker** - Fault tolerance with automatic recovery
- **Streaming Support** - Real-time response streaming
- **Code Sandbox** - Safe code execution environment
- **Observability** - Distributed tracing and metrics collection

## Installation

```bash
npm install @agent-core/framework
```

## Quick Start

```typescript
import { Agent } from '@agent-core/framework';

const agent = new Agent({
  config: {
    memory: { provider: 'local', persistence: true, embeddingModel: 'text-embedding-3-small', maxTokens: 100000 },
    reflection: { enabled: true, critiqueDepth: 'medium', learningRate: 0.1 },
    planning: { adaptive: true, maxRetries: 3, timeout: 30000 },
    tools: { dynamic: true, composition: true, learning: true },
    perception: { modalities: ['text', 'code'], uncertainty: true },
  },
  openaiApiKey: process.env.OPENAI_API_KEY,
  llmProvider: 'openai',
});

await agent.initialize();
const result = await agent.run("Help me research AI agents");
console.log(result);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Core                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Memory    │  │ Reflection  │  │   Tools     │            │
│  │   System    │  │   Engine    │  │   Creator   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Planning   │  │ Perception  │  │ Collaboration│           │
│  │   System    │  │   Layer     │  │   Protocol  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Token     │  │    Rate     │  │   Circuit   │            │
│  │   Counter   │  │   Limiter   │  │   Breaker   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Stream    │  │   Sandbox   │  │ Observability│           │
│  │   Handler   │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Memory System

Persistent memory with vector-based semantic search.

```typescript
import { MemorySystem } from '@agent-core/framework';

const memory = new MemorySystem({
  provider: 'chromadb', // or 'local', 'pinecone'
  embeddingModel: 'text-embedding-3-small',
  persistence: true,
  maxTokens: 100000,
});

await memory.store("AI agents need persistent memory");
const results = await memory.retrieve("What do AI agents need?", 5);
```

### Reflection Engine

Self-critique and continuous improvement.

```typescript
import { ReflectionEngine } from '@agent-core/framework';

const reflection = new ReflectionEngine({
  enabled: true,
  critiqueDepth: 'deep',
  learningRate: 0.1,
});

const critique = await reflection.analyze(response, context);
const improved = await reflection.improve(plan, critique);
```

### Tool Creator

Dynamic tool creation and composition.

```typescript
import { ToolCreator } from '@agent-core/framework';

const toolCreator = new ToolCreator({ dynamic: true, composition: true, learning: true });

await toolCreator.create({
  name: "fetch_weather",
  description: "Get weather for a location",
  parameters: { location: { type: "string", description: "City name", required: true } },
  implementation: async (params) => {
    return { temp: 72, condition: "sunny", location: params.location };
  }
});

const result = await toolCreator.execute("fetch_weather", { location: "NYC" });
```

### Adaptive Planner

Goal decomposition with error recovery.

```typescript
import { AdaptivePlanner } from '@agent-core/framework';

const planner = new AdaptivePlanner({
  adaptive: true,
  maxRetries: 3,
  timeout: 30000,
});

const plan = await planner.createPlan("Build a web scraper");
const result = await planner.execute(plan);
```

### Production Utilities

```typescript
import { TokenCounter, RateLimiter, CircuitBreaker } from '@agent-core/framework';

// Token management
const tokenCounter = new TokenCounter(128000);
const budget = tokenCounter.getBudget();

// Rate limiting
const rateLimiter = new RateLimiter({ maxRequests: 60, windowMs: 60000 });
await rateLimiter.execute('api_call', async () => {
  return await fetch('https://api.example.com');
});

// Circuit breaker
const circuitBreaker = new CircuitBreaker({ failureThreshold: 5, recoveryTimeoutMs: 30000 });
const result = await circuitBreaker.execute(async () => {
  return await riskyOperation();
});
```

## Configuration

```typescript
const config = {
  memory: {
    provider: 'chromadb',
    embeddingModel: 'text-embedding-3-small',
    persistence: true,
    maxTokens: 100000,
    chromaUrl: 'http://localhost:8000',
  },
  reflection: {
    enabled: true,
    critiqueDepth: 'medium',
    learningRate: 0.05,
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
  },
  planning: {
    adaptive: true,
    maxRetries: 3,
    timeout: 30000,
    fallbackStrategies: true,
  },
  tools: {
    dynamic: true,
    composition: true,
    learning: true,
    sandbox: true,
    maxExecutionTime: 10000,
  },
  perception: {
    modalities: ['text', 'image', 'code'],
    uncertainty: true,
  },
};
```

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
CHROMA_URL=http://localhost:8000
```

## Development

```bash
# Clone the repository
git clone https://github.com/vizvasanlya/agent-core.git
cd agent-core

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

## Testing

```bash
npm test                    # Run all tests (62 tests)
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

## CI/CD

The project includes a GitHub Actions workflow that:
- Runs tests on Node.js 18, 20, and 22
- Builds the TypeScript project
- Publishes to npm on main branch pushes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with TypeScript and Node.js
- Uses OpenAI and Anthropic APIs for LLM capabilities
- ChromaDB for vector storage
- Inspired by research on AI agents from Anthropic, OpenAI, and academic papers