export interface TokenBudget {
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
}

export interface TokenCountResult {
  tokens: number;
  characters: number;
  words: number;
}

export class TokenCounter {
  private maxTokens: number;
  private usedTokens: number = 0;
  private tokenHistory: Array<{
    operation: string;
    tokens: number;
    timestamp: Date;
  }> = [];

  constructor(maxTokens: number = 128000) {
    this.maxTokens = maxTokens;
  }

  count(text: string): TokenCountResult {
    const characters = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;

    // Approximate token count (1 token ≈ 4 characters for English)
    const tokens = Math.ceil(characters / 4);

    return { tokens, characters, words };
  }

  countMessages(messages: Array<{ role: string; content: string }>): TokenCountResult {
    let totalTokens = 0;
    let totalCharacters = 0;
    let totalWords = 0;

    for (const message of messages) {
      // Add overhead for role and formatting
      const overhead = 4;
      const result = this.count(message.content);
      totalTokens += result.tokens + overhead;
      totalCharacters += result.characters;
      totalWords += result.words;
    }

    return {
      tokens: totalTokens,
      characters: totalCharacters,
      words: totalWords,
    };
  }

  canFit(text: string, reservedTokens: number = 0): boolean {
    const { tokens } = this.count(text);
    return (this.usedTokens + tokens + reservedTokens) <= this.maxTokens;
  }

  canFitMessages(
    messages: Array<{ role: string; content: string }>,
    reservedTokens: number = 0
  ): boolean {
    const { tokens } = this.countMessages(messages);
    return (this.usedTokens + tokens + reservedTokens) <= this.maxTokens;
  }

  track(operation: string, tokens: number): void {
    this.usedTokens += tokens;
    this.tokenHistory.push({
      operation,
      tokens,
      timestamp: new Date(),
    });
  }

  trackMessages(operation: string, messages: Array<{ role: string; content: string }>): void {
    const { tokens } = this.countMessages(messages);
    this.track(operation, tokens);
  }

  getBudget(): TokenBudget {
    return {
      maxTokens: this.maxTokens,
      usedTokens: this.usedTokens,
      remainingTokens: this.maxTokens - this.usedTokens,
    };
  }

  reset(): void {
    this.usedTokens = 0;
    this.tokenHistory = [];
  }

  setMaxTokens(maxTokens: number): void {
    this.maxTokens = maxTokens;
  }

  getHistory(): Array<{ operation: string; tokens: number; timestamp: Date }> {
    return [...this.tokenHistory];
  }

  getUsageByOperation(): Record<string, number> {
    const usage: Record<string, number> = {};
    for (const entry of this.tokenHistory) {
      usage[entry.operation] = (usage[entry.operation] || 0) + entry.tokens;
    }
    return usage;
  }

  // Truncate text to fit within token budget
  truncate(text: string, maxTokens: number): string {
    const { tokens } = this.count(text);
    if (tokens <= maxTokens) {
      return text;
    }

    // Approximate character limit
    const charLimit = maxTokens * 4;
    return text.substring(0, charLimit) + '...';
  }

  // Truncate messages to fit within token budget
  truncateMessages(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];
    let currentTokens = 0;

    // Always keep system message
    if (messages.length > 0 && messages[0].role === 'system') {
      const { tokens } = this.count(messages[0].content);
      result.push(messages[0]);
      currentTokens += tokens + 4;
    }

    // Add messages from most recent, fitting within budget
    for (let i = messages.length - 1; i >= (result.length > 0 ? 1 : 0); i--) {
      const { tokens } = this.count(messages[i].content);
      if (currentTokens + tokens + 4 <= maxTokens) {
        result.splice(result.length > 0 ? 1 : 0, 0, messages[i]);
        currentTokens += tokens + 4;
      } else {
        break;
      }
    }

    return result;
  }
}