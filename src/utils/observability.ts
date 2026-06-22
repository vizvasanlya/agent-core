export interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  attributes: Record<string, any>;
  events: Array<{ name: string; timestamp: number; attributes: Record<string, any> }>;
}

export interface Metrics {
  requestCount: number;
  errorCount: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private completedSpans: TraceSpan[] = [];

  startSpan(name: string, attributes: Record<string, any> = {}): string {
    const id = this.generateId();
    const span: TraceSpan = {
      id,
      name,
      startTime: Date.now(),
      status: 'ok',
      attributes,
      events: [],
    };
    this.spans.set(id, span);
    return id;
  }

  endSpan(id: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.spans.get(id);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.status = status;
      this.completedSpans.push(span);
      this.spans.delete(id);
    }
  }

  addEvent(spanId: string, name: string, attributes: Record<string, any> = {}): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.events.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    }
  }

  setAttribute(spanId: string, key: string, value: any): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  getCompletedSpans(): TraceSpan[] {
    return [...this.completedSpans];
  }

  getActiveSpans(): TraceSpan[] {
    return Array.from(this.spans.values());
  }

  private generateId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class MetricsCollector {
  private latencies: number[] = [];
  private errorCount: number = 0;
  private requestCount: number = 0;
  private tokenUsage = {
    prompt: 0,
    completion: 0,
    total: 0,
  };

  recordLatency(latency: number): void {
    this.latencies.push(latency);
    this.requestCount++;
  }

  recordError(): void {
    this.errorCount++;
  }

  recordTokenUsage(prompt: number, completion: number): void {
    this.tokenUsage.prompt += prompt;
    this.tokenUsage.completion += completion;
    this.tokenUsage.total += prompt + completion;
  }

  getMetrics(): Metrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageLatency: this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0,
      tokenUsage: { ...this.tokenUsage },
    };
  }

  reset(): void {
    this.latencies = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0, total: 0 };
  }
}