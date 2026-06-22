# Agent Core

An open-source AI agent framework with persistent memory, self-reflection, and adaptive planning capabilities.

## Features

- **Persistent Long-Term Memory**: Vector-based retrieval that persists across sessions
- **Self-Reflection Engine**: Agents that learn from mistakes and improve over time
- **Dynamic Tool Creation**: Agents that can invent new tools for novel problems
- **Uncertainty Quantification**: Confidence scores and "I don't know" detection
- **Multi-Modal Perception**: Seamless integration across text, image, audio, video
- **Adaptive Planning**: Dynamic replanning with error recovery
- **Collaborative Protocol**: Agent-to-agent communication standard

## Architecture

```
agent-core/
├── src/
│   ├── memory/           # Persistent memory system
│   ├── reflection/       # Self-reflection engine
│   ├── tools/            # Dynamic tool creation
│   ├── planning/         # Adaptive planning
│   ├── perception/       # Multi-modal perception
│   └── collaboration/    # Agent collaboration protocol
├── tests/                # Test suite
└── docs/                 # Documentation
```

## Installation

```bash
npm install agent-core
```

## Quick Start

```typescript
import { Agent } from 'agent-core';

const agent = new Agent({
  memory: { persistent: true, vectorStore: 'local' },
  reflection: { enabled: true },
  planning: { adaptive: true }
});

await agent.initialize();
const response = await agent.run("Help me research AI agents");
```

## Core Components

### 1. Persistent Memory System

The memory system provides:
- **Vector Store**: Semantic search over stored knowledge
- **Session Memory**: Context within a single session
- **Long-term Memory**: Persistent knowledge across sessions
- **Knowledge Extraction**: Automatic insight generation

```typescript
import { MemorySystem } from 'agent-core/memory';

const memory = new MemorySystem({
  vectorStore: 'chromadb', // or 'local', 'pinecone'
  embeddingModel: 'text-embedding-3-small'
});

await memory.store("AI agents need persistent memory");
const results = await memory.retrieve("What do AI agents need?");
```

### 2. Self-Reflection Engine

The reflection engine enables:
- **Self-Critique**: Analyzing own performance
- **Pattern Recognition**: Learning from mistakes
- **Strategy Refinement**: Improving approaches over time

```typescript
import { ReflectionEngine } from 'agent-core/reflection';

const reflection = new ReflectionEngine({
  critiqueDepth: 'deep',
  learningRate: 0.1
});

const critique = await reflection.analyze(response, context);
const improved = await reflection.apply(critique, nextAction);
```

### 3. Dynamic Tool Creation

The tool system supports:
- **Tool Composition**: Combining existing tools
- **Dynamic Generation**: Creating new tools from descriptions
- **Usage Learning**: Optimizing tool selection

```typescript
import { ToolCreator } from 'agent-core/tools';

const toolCreator = new ToolCreator();

// Create a new tool from description
const customTool = await toolCreator.create({
  name: "fetch_weather",
  description: "Get weather for a location",
  parameters: { location: "string" },
  implementation: async (params) => {
    // API call to weather service
    return { temp: 72, condition: "sunny" };
  }
});
```

### 4. Adaptive Planning

The planning system provides:
- **Dynamic Replanning**: Adjusting strategies on failure
- **Error Recovery**: Automatic backup plans
- **Goal Decomposition**: Breaking complex tasks into steps

```typescript
import { AdaptivePlanner } from 'agent-core/planning';

const planner = new AdaptivePlanner({
  maxRetries: 3,
  fallbackStrategies: true
});

const plan = await planner.createPlan("Build a web scraper");
const result = await planner.execute(plan);
```

### 5. Multi-Modal Perception

The perception layer handles:
- **Text Processing**: Natural language understanding
- **Image Analysis**: Visual content extraction
- **Audio Processing**: Speech-to-text and analysis
- **Code Understanding**: Program comprehension

```typescript
import { PerceptionLayer } from 'agent-core/perception';

const perception = new PerceptionLayer({
  modalities: ['text', 'image', 'audio', 'code']
});

const analysis = await perception.analyze({
  text: "Analyze this image",
  image: "path/to/image.png"
});
```

### 6. Collaborative Protocol

The collaboration system enables:
- **Agent Discovery**: Finding other agents
- **Task Delegation**: Assigning work to specialists
- **State Synchronization**: Sharing context between agents

```typescript
import { CollaborationProtocol } from 'agent-core/collaboration';

const collaboration = new CollaborationProtocol({
  discovery: 'mdns',
  synchronization: 'realtime'
});

await collaboration.connect("agent-researcher");
await collaboration.delegateTask("Research AI trends");
```

## Use Cases

### 1. Research Assistant

```typescript
const researchAgent = new Agent({
  memory: { persistent: true },
  reflection: { enabled: true },
  tools: ['web_search', 'document_analysis']
});

// Agent remembers previous research
const findings = await researchAgent.run("What's new in AI?");
// Later session - agent recalls previous work
const followUp = await researchAgent.run("Expand on the transformer section");
```

### 2. Code Assistant

```typescript
const codeAgent = new Agent({
  memory: { codebase: true },
  reflection: { codeReview: true },
  tools: ['code_analysis', 'testing']
});

// Agent learns from code reviews
const review = await codeAgent.reviewCode("./src/main.ts");
// Applies learned patterns to future reviews
```

### 3. Multi-Agent Team

```typescript
const researcher = new Agent({ role: "researcher" });
const writer = new Agent({ role: "writer" });
const reviewer = new Agent({ role: "reviewer" });

const team = new AgentTeam([researcher, writer, reviewer]);
await team.collaborate("Write a research paper on AI agents");
```

## Configuration

```typescript
const config = {
  memory: {
    provider: "chromadb",
    embeddingModel: "text-embedding-3-small",
    persistence: true,
    maxTokens: 100000
  },
  reflection: {
    enabled: true,
    critiqueDepth: "medium",
    learningRate: 0.05
  },
  planning: {
    adaptive: true,
    maxRetries: 3,
    timeout: 30000
  },
  tools: {
    dynamic: true,
    composition: true,
    learning: true
  },
  perception: {
    modalities: ["text", "image"],
    uncertainty: true
  }
};
```

## Development

### Setup

```bash
git clone https://github.com/yourusername/agent-core.git
cd agent-core
npm install
npm run dev
```

### Testing

```bash
npm test
npm run test:coverage
```

### Building

```bash
npm run build
npm run build:watch
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

- Inspired by research on AI agents from Anthropic, OpenAI, and academic papers
- Built with modern TypeScript and Node.js
- Uses vector embeddings for semantic search