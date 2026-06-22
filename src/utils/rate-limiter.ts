export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  isLimited: boolean;
  retryAfterMs: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private requests: Array<{ timestamp: number; operation: string }> = [];
  private circuitOpen: boolean = false;
  private circuitOpenUntil: number = 0;
  private failureCount: number = 0;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    };
  }

  async acquire(operation: string = 'default'): Promise<void> {
    // Check circuit breaker
    if (this.circuitOpen) {
      if (Date.now() < this.circuitOpenUntil) {
        const waitTime = this.circuitOpenUntil - Date.now();
        throw new Error(`Circuit breaker open. Retry after ${waitTime}ms`);
      }
      this.circuitOpen = false;
      this.failureCount = 0;
    }

    // Clean old requests outside window
    const windowStart = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter(r => r.timestamp > windowStart);

    // Check if we're at the limit
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const retryAfter = oldestRequest.timestamp + this.config.windowMs - Date.now();
      
      if (retryAfter > 0) {
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter}ms`);
      }
    }

    // Record this request
    this.requests.push({
      timestamp: Date.now(),
      operation,
    });
  }

  async execute<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries || 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.acquire(operation);
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.message.includes('Circuit breaker')) {
          throw error;
        }

        if (error instanceof Error && error.message.includes('Rate limit')) {
          const retryAfter = this.parseRetryAfter(error.message);
          await this.delay(retryAfter);
          continue;
        }

        this.onFailure();

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelayMs || 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  private parseRetryAfter(errorMessage: string): number {
    const match = errorMessage.match(/Retry after (\d+)ms/);
    return match ? parseInt(match[1], 10) : 1000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    
    // Trip circuit breaker after 5 failures
    if (this.failureCount >= 5) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + 30000; // 30 seconds
    }
  }

  getState(): RateLimitState {
    const windowStart = Date.now() - this.config.windowMs;
    const recentRequests = this.requests.filter(r => r.timestamp > windowStart);

    return {
      requests: recentRequests.length,
      windowStart,
      isLimited: recentRequests.length >= this.config.maxRequests,
      retryAfterMs: this.circuitOpen ? this.circuitOpenUntil - Date.now() : 0,
    };
  }

  reset(): void {
    this.requests = [];
    this.failureCount = 0;
    this.circuitOpen = false;
    this.circuitOpenUntil = 0;
  }

  isCircuitOpen(): boolean {
    return this.circuitOpen && Date.now() < this.circuitOpenUntil;
  }

  getRequestCount(): number {
    const windowStart = Date.now() - this.config.windowMs;
    return this.requests.filter(r => r.timestamp > windowStart).length;
  }
}