import { ToolsConfig, Tool, ToolParameter } from '../types';
import { getLogger, logError } from '../logger';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export class ToolCreator {
  private config: ToolsConfig;
  private tools: Map<string, Tool> = new Map();
  private toolUsage: Map<string, number> = new Map();
  private toolHistory: Array<{
    tool: string;
    params: Record<string, any>;
    result: ToolExecutionResult;
    timestamp: Date;
  }> = [];
  private logger = getLogger();

  constructor(config: ToolsConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.loadBuiltInTools();
    this.logger.info({ tools: this.tools.size }, 'Tool creator initialized');
  }

  async register(tool: Tool): Promise<void> {
    this.tools.set(tool.name, tool);
    this.toolUsage.set(tool.name, 0);
    this.logger.debug({ name: tool.name }, 'Tool registered');
  }

  async create(toolDefinition: {
    name: string;
    description: string;
    parameters: Record<string, ToolParameter>;
    implementation: (params: Record<string, any>) => Promise<any>;
  }): Promise<Tool> {
    const tool: Tool = {
      name: toolDefinition.name,
      description: toolDefinition.description,
      parameters: toolDefinition.parameters,
      implementation: toolDefinition.implementation,
    };

    await this.register(tool);
    return tool;
  }

  async compose(toolNames: string[], compositionName: string): Promise<Tool> {
    const tools = toolNames.map(name => this.tools.get(name)).filter(Boolean) as Tool[];

    if (tools.length !== toolNames.length) {
      throw new Error('Some tools not found for composition');
    }

    const composedImplementation = async (params: Record<string, any>) => {
      const results: any[] = [];

      for (const tool of tools) {
        const toolParams = this.extractParamsForTool(params, tool);
        const result = await this.execute(tool.name, toolParams);
        results.push({ tool: tool.name, result: result.result });
      }

      return results;
    };

    const composedParameters = this.mergeParameters(tools);

    return this.create({
      name: compositionName,
      description: `Composed tool: ${toolNames.join(' + ')}`,
      parameters: composedParameters,
      implementation: composedImplementation,
    });
  }

  async execute(toolName: string, params: Record<string, any>): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        executionTime: Date.now() - startTime,
      };
    }

    const validationError = this.validateParams(tool, params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      const result = await this.executeWithTimeout(tool, params);

      this.toolUsage.set(toolName, (this.toolUsage.get(toolName) || 0) + 1);

      const executionResult: ToolExecutionResult = {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };

      this.toolHistory.push({
        tool: toolName,
        params,
        result: executionResult,
        timestamp: new Date(),
      });

      return executionResult;
    } catch (error) {
      const executionResult: ToolExecutionResult = {
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime,
      };

      this.toolHistory.push({
        tool: toolName,
        params,
        result: executionResult,
        timestamp: new Date(),
      });

      logError(error as Error, { tool: toolName });
      return executionResult;
    }
  }

  private async executeWithTimeout(tool: Tool, params: Record<string, any>): Promise<any> {
    const maxTime = this.config.maxExecutionTime || 10000;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${maxTime}ms`));
      }, maxTime);

      tool
        .implementation(params)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  async getTool(name: string): Promise<Tool | undefined> {
    return this.tools.get(name);
  }

  async getAllTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  async getToolNames(): Promise<string[]> {
    return Array.from(this.tools.keys());
  }

  async getMostUsedTools(limit: number = 5): Promise<Array<{ tool: Tool; usage: number }>> {
    const usageArray = Array.from(this.toolUsage.entries());
    usageArray.sort((a, b) => b[1] - a[1]);

    return usageArray
      .slice(0, limit)
      .map(([name, usage]) => ({
        tool: this.tools.get(name)!,
        usage,
      }))
      .filter(item => item.tool);
  }

  async suggestTools(task: string): Promise<Tool[]> {
    const taskLower = task.toLowerCase();
    const suggestions: Array<{ tool: Tool; score: number }> = [];

    for (const [, tool] of this.tools) {
      const descriptionLower = tool.description.toLowerCase();
      const taskWords = taskLower.split(/\s+/);
      const descriptionWords = descriptionLower.split(/\s+/);

      const overlap = taskWords.filter(word => descriptionWords.includes(word));
      const score = overlap.length / Math.max(taskWords.length, 1);

      if (score > 0) {
        suggestions.push({ tool, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .map(item => item.tool);
  }

  async getToolHistory(toolName?: string): Promise<typeof this.toolHistory> {
    if (toolName) {
      return this.toolHistory.filter(h => h.tool === toolName);
    }
    return [...this.toolHistory];
  }

  async getToolStats(): Promise<{
    totalTools: number;
    totalExecutions: number;
    toolUsage: Record<string, number>;
  }> {
    const totalExecutions = Array.from(this.toolUsage.values()).reduce((a, b) => a + b, 0);
    const toolUsage: Record<string, number> = {};
    this.toolUsage.forEach((usage, name) => {
      toolUsage[name] = usage;
    });

    return {
      totalTools: this.tools.size,
      totalExecutions,
      toolUsage,
    };
  }

  private extractParamsForTool(params: Record<string, any>, tool: Tool): Record<string, any> {
    const toolParams: Record<string, any> = {};

    for (const paramName of Object.keys(tool.parameters)) {
      if (params[paramName] !== undefined) {
        toolParams[paramName] = params[paramName];
      } else if (tool.parameters[paramName].default !== undefined) {
        toolParams[paramName] = tool.parameters[paramName].default;
      }
    }

    return toolParams;
  }

  private mergeParameters(tools: Tool[]): Record<string, ToolParameter> {
    const merged: Record<string, ToolParameter> = {};

    for (const tool of tools) {
      for (const [name, param] of Object.entries(tool.parameters)) {
        if (!merged[name]) {
          merged[name] = param;
        }
      }
    }

    return merged;
  }

  private validateParams(tool: Tool, params: Record<string, any>): string | null {
    for (const [name, param] of Object.entries(tool.parameters)) {
      if (param.required && params[name] === undefined && param.default === undefined) {
        return `Missing required parameter '${name}' for tool '${tool.name}'`;
      }

      if (params[name] !== undefined) {
        const value = params[name];
        switch (param.type) {
          case 'string':
            if (typeof value !== 'string') {
              return `Parameter '${name}' must be a string`;
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              return `Parameter '${name}' must be a number`;
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              return `Parameter '${name}' must be a boolean`;
            }
            break;
        }
      }
    }

    return null;
  }

  private async loadBuiltInTools(): Promise<void> {
    await this.create({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
      },
      implementation: async (params) => {
        return { results: [`Search results for: ${params.query}`] };
      },
    });

    await this.create({
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        path: { type: 'string', description: 'File path', required: true },
      },
      implementation: async (params) => {
        const fs = await import('fs/promises');
        try {
          const content = await fs.readFile(params.path, 'utf-8');
          return { content, path: params.path };
        } catch (error) {
          throw new Error(`Failed to read file: ${(error as Error).message}`);
        }
      },
    });

    await this.create({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        path: { type: 'string', description: 'File path', required: true },
        content: { type: 'string', description: 'Content to write', required: true },
      },
      implementation: async (params) => {
        const fs = await import('fs/promises');
        const path = await import('path');

        const dir = path.dirname(params.path);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(params.path, params.content, 'utf-8');
        return { success: true, path: params.path };
      },
    });

    await this.create({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate', required: true },
      },
      implementation: async (params) => {
        const sanitized = params.expression.replace(/[^0-9+\-*/().]/g, '');
        try {
          const result = new Function(`return (${sanitized})`)();
          return { result, expression: params.expression };
        } catch (error) {
          throw new Error(`Invalid expression: ${params.expression}`);
        }
      },
    });

    await this.create({
      name: 'http_request',
      description: 'Make HTTP requests',
      parameters: {
        url: { type: 'string', description: 'Request URL', required: true },
        method: { type: 'string', description: 'HTTP method', required: false, default: 'GET' },
        body: { type: 'string', description: 'Request body', required: false },
      },
      implementation: async (params) => {
        const options: RequestInit = {
          method: params.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
        };

        if (params.body) {
          options.body = params.body;
        }

        const response = await fetch(params.url, options);
        const data = await response.text();

        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data,
        };
      },
    });

    await this.create({
      name: 'parse_json',
      description: 'Parse JSON string',
      parameters: {
        text: { type: 'string', description: 'JSON string to parse', required: true },
      },
      implementation: async (params) => {
        try {
          return JSON.parse(params.text);
        } catch (error) {
          throw new Error(`Invalid JSON: ${(error as Error).message}`);
        }
      },
    });

    await this.create({
      name: 'string_replace',
      description: 'Replace text in a string',
      parameters: {
        text: { type: 'string', description: 'Original text', required: true },
        search: { type: 'string', description: 'Text to search for', required: true },
        replace: { type: 'string', description: 'Replacement text', required: true },
      },
      implementation: async (params) => {
        return params.text.split(params.search).join(params.replace);
      },
    });

    await this.create({
      name: 'string_split',
      description: 'Split text by delimiter',
      parameters: {
        text: { type: 'string', description: 'Text to split', required: true },
        delimiter: { type: 'string', description: 'Delimiter', required: true },
      },
      implementation: async (params) => {
        return params.text.split(params.delimiter);
      },
    });
  }
}