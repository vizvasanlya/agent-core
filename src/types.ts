// Agent Core Types

export interface AgentConfig {
  memory: MemoryConfig;
  reflection: ReflectionConfig;
  planning: PlanningConfig;
  tools: ToolsConfig;
  perception: PerceptionConfig;
  collaboration?: CollaborationConfig;
}

export interface MemoryConfig {
  provider: 'chromadb' | 'local' | 'pinecone';
  embeddingModel: string;
  persistence: boolean;
  maxTokens: number;
  vectorStore?: string;
}

export interface ReflectionConfig {
  enabled: boolean;
  critiqueDepth: 'shallow' | 'medium' | 'deep';
  learningRate: number;
}

export interface PlanningConfig {
  adaptive: boolean;
  maxRetries: number;
  timeout: number;
  fallbackStrategies?: boolean;
}

export interface ToolsConfig {
  dynamic: boolean;
  composition: boolean;
  learning: boolean;
}

export interface PerceptionConfig {
  modalities: ('text' | 'image' | 'audio' | 'code')[];
  uncertainty: boolean;
}

export interface CollaborationConfig {
  discovery: 'mdns' | 'manual';
  synchronization: 'realtime' | 'batch';
}

// Memory Types
export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

// Reflection Types
export interface Critique {
  aspects: CritiqueAspect[];
  overallScore: number;
  suggestions: string[];
}

export interface CritiqueAspect {
  name: string;
  score: number;
  feedback: string;
}

// Planning Types
export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface PlanStep {
  id: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retries: number;
}

// Tool Types
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  implementation: (params: Record<string, any>) => Promise<any>;
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

// Perception Types
export interface PerceptionInput {
  text?: string;
  image?: string;
  audio?: string;
  code?: string;
}

export interface PerceptionOutput {
  text?: string;
  imageAnalysis?: ImageAnalysis;
  audioAnalysis?: AudioAnalysis;
  codeAnalysis?: CodeAnalysis;
  uncertainty?: number;
}

export interface ImageAnalysis {
  objects: string[];
  scene: string;
  confidence: number;
}

export interface AudioAnalysis {
  transcript: string;
  language: string;
  sentiment: string;
}

export interface CodeAnalysis {
  language: string;
  complexity: number;
  issues: string[];
}

// Collaboration Types
export interface AgentInfo {
  id: string;
  name: string;
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
}

export interface TaskDelegation {
  taskId: string;
  fromAgent: string;
  toAgent: string;
  task: string;
  context: Record<string, any>;
  status: 'pending' | 'accepted' | 'completed' | 'failed';
}