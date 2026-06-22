import { MemoryConfig, MemoryEntry, MemorySearchResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MemorySystem {
  private config: MemoryConfig;
  private entries: Map<string, MemoryEntry> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private isInitialized = false;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load existing data if persistence is enabled
    if (this.config.persistence) {
      await this.loadFromStorage();
    }

    this.isInitialized = true;
  }

  async store(content: string, metadata: Record<string, any> = {}): Promise<MemoryEntry> {
    const id = uuidv4();
    const embedding = await this.generateEmbedding(content);

    const entry: MemoryEntry = {
      id,
      content,
      embedding,
      metadata,
      timestamp: new Date(),
      sessionId: metadata.sessionId || 'default'
    };

    this.entries.set(id, entry);
    this.embeddings.set(id, embedding);

    // Persist if enabled
    if (this.config.persistence) {
      await this.saveToStorage(entry);
    }

    return entry;
  }

  async retrieve(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: MemorySearchResult[] = [];

    for (const [id, embedding] of this.embeddings) {
      const entry = this.entries.get(id);
      if (!entry) continue;

      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ entry, score });
    }

    // Sort by score descending and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getAll(): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values());
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.embeddings.clear();

    if (this.config.persistence) {
      await this.clearStorage();
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // In production, this would call an embedding API
    // For now, return a simple hash-based embedding
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async loadFromStorage(): Promise<void> {
    // TODO: Implement actual storage loading
    // This would load from ChromaDB, local file, etc.
  }

  private async saveToStorage(entry: MemoryEntry): Promise<void> {
    // TODO: Implement actual storage saving
    // This would save to ChromaDB, local file, etc.
  }

  private async clearStorage(): Promise<void> {
    // TODO: Implement actual storage clearing
  }
}