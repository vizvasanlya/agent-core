import { z } from 'zod';

// Memory Configuration
export const MemoryConfigSchema = z.object({
  provider: z.enum(['chromadb', 'local', 'pinecone']).default('local'),
  embeddingModel: z.string().default('text-embedding-3-small'),
  persistence: z.boolean().default(true),
  maxTokens: z.number().min(1000).max(1000000).default(100000),
  vectorStore: z.string().optional(),
  chromaUrl: z.string().url().optional(),
  pineconeApiKey: z.string().optional(),
  pineconeEnvironment: z.string().optional(),
  openaiApiKey: z.string().optional(),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// Reflection Configuration
export const ReflectionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  critiqueDepth: z.enum(['shallow', 'medium', 'deep']).default('medium'),
  learningRate: z.number().min(0).max(1).default(0.1),
  maxIterations: z.number().min(1).max(10).default(3),
  llmProvider: z.enum(['openai', 'anthropic']).default('openai'),
  llmModel: z.string().optional(),
});

export type ReflectionConfig = z.infer<typeof ReflectionConfigSchema>;

// Planning Configuration
export const PlanningConfigSchema = z.object({
  adaptive: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
  timeout: z.number().min(1000).max(300000).default(30000),
  fallbackStrategies: z.boolean().default(true),
  maxSteps: z.number().min(1).max(50).default(10),
  llmProvider: z.enum(['openai', 'anthropic']).default('openai'),
  llmModel: z.string().optional(),
});

export type PlanningConfig = z.infer<typeof PlanningConfigSchema>;

// Tools Configuration
export const ToolsConfigSchema = z.object({
  dynamic: z.boolean().default(true),
  composition: z.boolean().default(true),
  learning: z.boolean().default(true),
  sandbox: z.boolean().default(true),
  maxExecutionTime: z.number().min(1000).max(60000).default(10000),
});

export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;

// Perception Configuration
export const PerceptionConfigSchema = z.object({
  modalities: z.array(z.enum(['text', 'image', 'audio', 'code'])).default(['text']),
  uncertainty: z.boolean().default(true),
  visionModel: z.string().optional(),
  audioModel: z.string().optional(),
});

export type PerceptionConfig = z.infer<typeof PerceptionConfigSchema>;

// Collaboration Configuration
export const CollaborationConfigSchema = z.object({
  discovery: z.enum(['mdns', 'manual']).default('manual'),
  synchronization: z.enum(['realtime', 'batch']).default('batch'),
  port: z.number().min(1024).max(65535).default(8080),
  maxConnections: z.number().min(1).max(100).default(10),
});

export type CollaborationConfig = z.infer<typeof CollaborationConfigSchema>;

// Main Agent Configuration
export const AgentConfigSchema = z.object({
  memory: MemoryConfigSchema,
  reflection: ReflectionConfigSchema,
  planning: PlanningConfigSchema,
  tools: ToolsConfigSchema,
  perception: PerceptionConfigSchema,
  collaboration: CollaborationConfigSchema.optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
  }).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Environment Configuration
export const EnvironmentConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CHROMA_URL: z.string().url().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// Validation helper
export function validateConfig(config: unknown): AgentConfig {
  return AgentConfigSchema.parse(config);
}

// Partial config for user input
export const PartialAgentConfigSchema = AgentConfigSchema.partial();
export type PartialAgentConfig = z.infer<typeof PartialAgentConfigSchema>;

// Merge with defaults
export function mergeWithDefaults(config: PartialAgentConfig): AgentConfig {
  return AgentConfigSchema.parse(config);
}