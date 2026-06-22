# Agent Core

[![CI/CD Pipeline](https://github.com/yourusername/agent-core/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/agent-core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@agent-core/framework.svg)](https://www.npmjs.com/package/@agent-core/framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready AI agent framework with persistent memory, self-reflection, and adaptive planning capabilities.

## Features

- **Persistent Long-Term Memory**: Vector-based retrieval with ChromaDB/local storage
- **Self-Reflection Engine**: LLM-powered critique and continuous improvement
- **Dynamic Tool Creation**: Runtime tool registration and composition
- **Adaptive Planning**: Goal decomposition with error recovery
- **Multi-Modal Perception**: Text, image, audio, and code analysis
- **Agent Collaboration**: Multi-agent communication protocol
- **Production Ready**: Full TypeScript, comprehensive error handling, logging

## Installation

```bash
npm install @agent-core/framework
```

## Quick Start

```typescript
import { Agent } from '@agent-core/framework';

const agent = new Agent({
  config: {
    memory: { provider: 'local', persistence: true },
    reflection: { enabled: true, critiqueDepth: 'medium' },
    planning: { adaptive: true, maxRetries: 3 },
    tools: { dynamic: true },
    perception: { modalities: ['text'] },
  },
  openaiApiKey: process.env.OPENAI_API_KEY,
});

await agent.initialize();
const result = await agent.run("Help me research AI agents");
console.log(result);
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Agent Core                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Memory    │  │ Reflection  │  │   Tools     │     │
│  │   System    │  │   Engine    │  │   Creator   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Planning   │  │ Perception  │  │ Collaboration│    │
│  │   System    │  │   Layer     │  │   Protocol  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
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
});

await memory.store("AI agents need persistent memory");
const results = await memory.retrieve("What do AI agents need?");
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

const toolCreator = new ToolCreator({ dynamic: true });

await toolCreator.create({
  name: "fetch_weather",
  description: "Get weather for a location",
  parameters: { location: { type: "string", required: true } },
  implementation: async (params) => {
    return { temp: 72, condition: "sunny" };
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
});

const plan = await planner.createPlan("Build a web scraper");
const result = await planner.execute(plan);
```

### Perception Layer

Multi-modal input processing.

```typescript
import { PerceptionLayer } from '@agent-core/framework';

const perception = new PerceptionLayer({
  modalities: ['text', 'image', 'code'],
  uncertainty: true,
});

const analysis = await perception.analyze({
  text: "Analyze this code",
  code: "function add(a, b) { return a + b; }"
});
```

### Collaboration Protocol

Multi-agent communication.

```typescript
import { CollaborationProtocol } from '@agent-core/framework';

const collaboration = new CollaborationProtocol({
  discovery: 'manual',
  synchronization: 'realtime',
});

await collaboration.connect({ id: 'agent-2', name: 'Researcher', capabilities: ['research'], status: 'available' });
await collaboration.delegateTask("Research AI trends");
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
  },
  planning: {
    adaptive: true,
    maxRetries: 3,
    timeout: 30000,
    llmProvider: 'openai',
  },
  tools: {
    dynamic: true,
    composition: true,
    sandbox: true,
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
git clone https://github.com/yourusername/agent-core.git
cd agent-core

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

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