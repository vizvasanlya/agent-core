import { MemoryConfig, MemoryEntry, MemorySearchResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ChromaClient, Collection } from 'chromadb';
import { getLogger, logError, logDebug } from '../logger';

export class MemorySystem {
  private config: MemoryConfig;
  private entries: Map<string, MemoryEntry> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private chromaClient: ChromaClient | null = null;
  private collection: Collection | null = null;
  private isInitialized = false;
  private logger = getLogger();

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.provider === 'chromadb') {
        await this.initializeChromaDB();
      }

      if (this.config.persistence && this.config.provider === 'local') {
        await this.loadFromStorage();
      }

      this.isInitialized = true;
      this.logger.info({ provider: this.config.provider }, 'Memory system initialized');
    } catch (error) {
      logError(error as Error, { component: 'MemorySystem', action: 'initialize' });
      throw error;
    }
  }

  private async initializeChromaDB(): Promise<void> {
    const chromaUrl = this.config.chromaUrl || 'http://localhost:8000';
    this.chromaClient = new ChromaClient({ path: chromaUrl });

    const collection = await this.chromaClient.getOrCreateCollection({
      name: 'agent_memory',
      metadata: { 'hnsw:space': 'cosine' },
    });
    this.collection = collection;

    this.logger.info({ url: chromaUrl }, 'ChromaDB initialized');
  }

  async store(content: string, metadata: Record<string, any> = {}): Promise<MemoryEntry> {
    const id = uuidv4();
    const embedding = await this.generateEmbedding(content);

    const entry: MemoryEntry = {
      id,
      content,
      embedding,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      sessionId: metadata.sessionId || 'default',
    };

    this.entries.set(id, entry);
    this.embeddings.set(id, embedding);

    if (this.config.provider === 'chromadb' && this.collection) {
      await this.storeInChroma(entry);
    }

    if (this.config.persistence && this.config.provider === 'local') {
      await this.saveToStorage();
    }

    logDebug('Memory stored', { id, contentLength: content.length });
    return entry;
  }

  private async storeInChroma(entry: MemoryEntry): Promise<void> {
    if (!this.collection) return;

    await this.collection.add({
      ids: [entry.id],
      embeddings: [entry.embedding],
      documents: [entry.content],
      metadatas: [{
        sessionId: entry.sessionId,
        timestamp: entry.timestamp.toISOString(),
        ...entry.metadata,
      }],
    });
  }

  async retrieve(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (this.config.provider === 'chromadb' && this.collection) {
      return this.retrieveFromChroma(queryEmbedding, limit);
    }

    return this.retrieveFromMemory(queryEmbedding, limit);
  }

  private async retrieveFromChroma(queryEmbedding: number[], limit: number): Promise<MemorySearchResult[]> {
    if (!this.collection) return [];

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
    });

    const searchResults: MemorySearchResult[] = [];

    if (results.ids && results.ids[0] && results.documents && results.documents[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const id = results.ids[0][i];
        const document = results.documents[0][i];
        const distance = results.distances?.[0]?.[i] || 0;
        const score = 1 - distance;

        const metadata = (results.metadatas?.[0]?.[i] as Record<string, any>) || {};

        searchResults.push({
          entry: {
            id,
            content: document || '',
            embedding: queryEmbedding,
            metadata,
            timestamp: new Date(),
            sessionId: metadata.sessionId || 'default',
          },
          score,
        });
      }
    }

    return searchResults;
  }

  private async retrieveFromMemory(queryEmbedding: number[], limit: number): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const [id, embedding] of this.embeddings) {
      const entry = this.entries.get(id);
      if (!entry) continue;

      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ entry, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getAll(): Promise<MemoryEntry[]> {
    if (this.config.provider === 'chromadb' && this.collection) {
      return this.getAllFromChroma();
    }
    return Array.from(this.entries.values());
  }

  private async getAllFromChroma(): Promise<MemoryEntry[]> {
    if (!this.collection) return [];

    const results = await this.collection.get();
    const entries: MemoryEntry[] = [];

    if (results.ids && results.documents) {
      for (let i = 0; i < results.ids.length; i++) {
        const metadata = (results.metadatas?.[i] as Record<string, any>) || {};
        entries.push({
          id: results.ids[i],
          content: results.documents[i] || '',
          embedding: results.embeddings?.[i] || [],
          metadata,
          timestamp: new Date(metadata.createdAt || Date.now()),
          sessionId: metadata.sessionId || 'default',
        });
      }
    }

    return entries;
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
    this.embeddings.delete(id);

    if (this.config.provider === 'chromadb' && this.collection) {
      await this.collection.delete({ ids: [id] });
    }
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.embeddings.clear();

    if (this.config.provider === 'chromadb' && this.collection) {
      await this.chromaClient?.deleteCollection({ name: 'agent_memory' });
      const collection = await this.chromaClient?.getOrCreateCollection({
        name: 'agent_memory',
        metadata: { 'hnsw:space': 'cosine' },
      });
      this.collection = collection || null;
    }

    if (this.config.persistence && this.config.provider === 'local') {
      await this.clearStorage();
    }

    this.logger.info('Memory cleared');
  }

  async search(query: string, options: {
    limit?: number;
    minScore?: number;
    filter?: Record<string, any>;
  } = {}): Promise<MemorySearchResult[]> {
    const { limit = 10, minScore = 0.5, filter } = options;

    let results = await this.retrieve(query, limit);

    results = results.filter(r => r.score >= minScore);

    if (filter) {
      results = results.filter(r => {
        return Object.entries(filter).every(([key, value]) => {
          return r.entry.metadata[key] === value;
        });
      });
    }

    return results;
  }

  async getStats(): Promise<{
    totalEntries: number;
    provider: string;
    persistence: boolean;
  }> {
    let totalEntries = this.entries.size;
    if (this.config.provider === 'chromadb' && this.collection) {
      totalEntries = await this.collection.count();
    }

    return {
      totalEntries,
      provider: this.config.provider,
      persistence: this.config.persistence,
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.config.openaiApiKey) {
      return this.generateOpenAIEmbedding(text);
    }
    return this.generateSimpleEmbedding(text);
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const apiKey = this.config.openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key required for embeddings');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  private generateSimpleEmbedding(text: string): number[] {
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
      hash = hash & hash;
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
    const fs = await import('fs/promises');
    const path = await import('path');

    const storagePath = path.join(process.cwd(), '.agent-memory.json');

    try {
      const data = await fs.readFile(storagePath, 'utf-8');
      const parsed = JSON.parse(data) as Array<MemoryEntry & { timestamp: string }>;

      for (const entry of parsed) {
        this.entries.set(entry.id, {
          ...entry,
          timestamp: new Date(entry.timestamp),
        });
        this.embeddings.set(entry.id, entry.embedding);
      }

      this.logger.debug({ count: this.entries.size }, 'Loaded memories from storage');
    } catch {
      this.logger.debug('No existing memory storage found');
    }
  }

  private async saveToStorage(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const storagePath = path.join(process.cwd(), '.agent-memory.json');
    const entries = Array.from(this.entries.values());

    await fs.writeFile(storagePath, JSON.stringify(entries, null, 2));
  }

  private async clearStorage(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const storagePath = path.join(process.cwd(), '.agent-memory.json');

    try {
      await fs.unlink(storagePath);
    } catch {
      // File doesn't exist, ignore
    }
  }
}