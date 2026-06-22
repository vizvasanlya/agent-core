import { TokenCounter } from '../src/utils/token-counter';
import { RateLimiter } from '../src/utils/rate-limiter';
import { CircuitBreaker } from '../src/utils/circuit-breaker';
import { StreamHandler, StreamCollector } from '../src/utils/stream';
import { Sandbox } from '../src/utils/sandbox';
import { Tracer, MetricsCollector } from '../src/utils/observability';

describe('TokenCounter', () => {
  let counter: TokenCounter;

  beforeEach(() => {
    counter = new TokenCounter(10000);
  });

  test('should count tokens in text', () => {
    const result = counter.count('Hello world');
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.characters).toBe(11);
    expect(result.words).toBe(2);
  });

  test('should count tokens in messages', () => {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' },
    ];
    const result = counter.countMessages(messages);
    expect(result.tokens).toBeGreaterThan(0);
  });

  test('should check if text fits within budget', () => {
    expect(counter.canFit('Hello')).toBe(true);
    expect(counter.canFit('x'.repeat(50000))).toBe(false);
  });

  test('should track token usage', () => {
    counter.track('test', 100);
    const budget = counter.getBudget();
    expect(budget.usedTokens).toBe(100);
    expect(budget.remainingTokens).toBe(9900);
  });

  test('should truncate text', () => {
    const longText = 'x'.repeat(1000);
    const truncated = counter.truncate(longText, 100);
    expect(truncated.length).toBeLessThan(longText.length);
    expect(truncated).toContain('...');
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
    });
  });

  test('should acquire rate limit', async () => {
    await limiter.acquire();
    const state = limiter.getState();
    expect(state.requests).toBe(1);
  });

  test('should throw when rate limit exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
  });

  test('should execute with rate limiting', async () => {
    const result = await limiter.execute('test', async () => 42);
    expect(result).toBe(42);
  });

  test('should reset state', () => {
    limiter.reset();
    const state = limiter.getState();
    expect(state.requests).toBe(0);
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeoutMs: 1000,
    });
  });

  test('should execute successfully', async () => {
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('closed');
  });

  test('should open after failures', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
    }
    expect(breaker.getState()).toBe('open');
  });

  test('should reject when open', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
    }
    await expect(breaker.execute(async () => 'test')).rejects.toThrow('Circuit breaker is open');
  });

  test('should reset', () => {
    breaker.reset();
    expect(breaker.getState()).toBe('closed');
  });
});

describe('StreamHandler', () => {
  test('should collect chunks', () => {
    const handler = new StreamHandler();
    handler.processChunk({ delta: 'Hello' });
    handler.processChunk({ delta: ' world' });
    handler.complete();

    expect(handler.getFullText()).toBe('Hello world');
    expect(handler.isDone()).toBe(true);
  });

  test('should call onDone callback', () => {
    const onDone = jest.fn();
    const handler = new StreamHandler({ onDone });
    handler.processChunk({ delta: 'test' });
    handler.complete();

    expect(onDone).toHaveBeenCalledWith('test');
  });
});

describe('StreamCollector', () => {
  test('should collect and return full text', () => {
    const collector = new StreamCollector();
    collector.collect({ delta: 'Hello' });
    collector.collect({ delta: ' world' });

    expect(collector.getFullText()).toBe('Hello world');
    expect(collector.getChunks().length).toBe(2);
  });
});

describe('Sandbox', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox({ timeout: 5000, memoryLimit: 1000000 });
  });

  test('should execute safe code', async () => {
    const result = await sandbox.execute('2 + 2', 'javascript');
    expect(result.success).toBe(true);
    expect(result.result).toBe(4);
  });

  test('should reject unsafe code', () => {
    const validation = sandbox.validateCode('eval("alert(1)")');
    expect(validation.valid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  test('should validate safe code', () => {
    const validation = sandbox.validateCode('const x = 1 + 2;');
    expect(validation.valid).toBe(true);
  });
});

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer();
  });

  test('should start and end spans', () => {
    const id = tracer.startSpan('test');
    tracer.endSpan(id);

    const spans = tracer.getCompletedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe('test');
    expect(spans[0].duration).toBeGreaterThanOrEqual(0);
  });

  test('should add events to spans', () => {
    const id = tracer.startSpan('test');
    tracer.addEvent(id, 'event1', { key: 'value' });
    tracer.endSpan(id);

    const spans = tracer.getCompletedSpans();
    expect(spans[0].events.length).toBe(1);
    expect(spans[0].events[0].name).toBe('event1');
  });

  test('should set attributes', () => {
    const id = tracer.startSpan('test');
    tracer.setAttribute(id, 'key', 'value');
    tracer.endSpan(id);

    const spans = tracer.getCompletedSpans();
    expect(spans[0].attributes.key).toBe('value');
  });
});

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  test('should record latency', () => {
    metrics.recordLatency(100);
    metrics.recordLatency(200);
    metrics.recordLatency(300);

    const m = metrics.getMetrics();
    expect(m.requestCount).toBe(3);
    expect(m.averageLatency).toBe(200);
  });

  test('should record errors', () => {
    metrics.recordError();
    metrics.recordError();

    const m = metrics.getMetrics();
    expect(m.errorCount).toBe(2);
  });

  test('should record token usage', () => {
    metrics.recordTokenUsage(100, 50);
    metrics.recordTokenUsage(200, 100);

    const m = metrics.getMetrics();
    expect(m.tokenUsage.prompt).toBe(300);
    expect(m.tokenUsage.completion).toBe(150);
    expect(m.tokenUsage.total).toBe(450);
  });

  test('should reset', () => {
    metrics.recordLatency(100);
    metrics.reset();

    const m = metrics.getMetrics();
    expect(m.requestCount).toBe(0);
  });
});