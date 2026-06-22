export interface StreamChunk {
  delta: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class StreamHandler {
  private fullText: string = '';
  private chunks: StreamChunk[] = [];
  private isComplete: boolean = false;
  private options: StreamOptions;

  constructor(options: StreamOptions = {}) {
    this.options = options;
  }

  processChunk(chunk: StreamChunk): void {
    if (this.isComplete) return;

    this.fullText += chunk.delta;
    this.chunks.push(chunk);

    this.options.onChunk?.(chunk);

    if (chunk.finishReason) {
      this.complete();
    }
  }

  complete(): void {
    if (this.isComplete) return;
    
    this.isComplete = true;
    this.options.onDone?.(this.fullText);
  }

  error(error: Error): void {
    this.options.onError?.(error);
  }

  getFullText(): string {
    return this.fullText;
  }

  getChunks(): StreamChunk[] {
    return [...this.chunks];
  }

  isDone(): boolean {
    return this.isComplete;
  }

  getUsage(): { promptTokens: number; completionTokens: number; totalTokens: number } | null {
    const lastChunk = this.chunks[this.chunks.length - 1];
    return lastChunk?.usage || null;
  }
}

export class StreamCollector {
  private chunks: StreamChunk[] = [];
  private fullText: string = '';

  collect(chunk: StreamChunk): void {
    this.chunks.push(chunk);
    this.fullText += chunk.delta;
  }

  getFullText(): string {
    return this.fullText;
  }

  getChunks(): StreamChunk[] {
    return [...this.chunks];
  }

  getUsage(): { promptTokens: number; completionTokens: number; totalTokens: number } {
    const lastChunk = this.chunks[this.chunks.length - 1];
    return lastChunk?.usage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  reset(): void {
    this.chunks = [];
    this.fullText = '';
  }
}

export async function* streamToString(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function createStreamFromResponse(
  response: Response
): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw new Error('Response body is null');
  }
  return response.body;
}