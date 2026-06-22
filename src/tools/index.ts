import { ToolsConfig, Tool, ToolParameter } from '../types';

export class ToolCreator {
  private config: ToolsConfig;
  private tools: Map<string, Tool> = new Map();
  private toolUsage: Map<string, number> = new Map();

  constructor(config: ToolsConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load built-in tools
    await this.loadBuiltInTools();
  }

  async register(tool: Tool): Promise<void> {
    this.tools.set(tool.name, tool);
    this.toolUsage.set(tool.name, 0);
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
      implementation: toolDefinition.implementation
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
        const result = await tool.implementation(toolParams);
        results.push({ tool: tool.name, result });
        
        // Update usage statistics
        this.toolUsage.set(tool.name, (this.toolUsage.get(tool.name) || 0) + 1);
      }
      
      return results;
    };

    const composedParameters = this.mergeParameters(tools);

    return this.create({
      name: compositionName,
      description: `Composed tool: ${toolNames.join(' + ')}`,
      parameters: composedParameters,
      implementation: composedImplementation
    });
  }

  async execute(toolName: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Validate parameters
    this.validateParams(tool, params);

    // Execute the tool
    const result = await tool.implementation(params);

    // Update usage statistics
    this.toolUsage.set(toolName, (this.toolUsage.get(toolName) || 0) + 1);

    return result;
  }

  async getTool(name: string): Promise<Tool | undefined> {
    return this.tools.get(name);
  }

  async getAllTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  async getMostUsedTools(limit: number = 5): Promise<Tool[]> {
    const usageArray = Array.from(this.toolUsage.entries());
    usageArray.sort((a, b) => b[1] - a[1]);
    
    return usageArray
      .slice(0, limit)
      .map(([name]) => this.tools.get(name)!)
      .filter(Boolean);
  }

  async suggestTools(task: string): Promise<Tool[]> {
    // Simple tool suggestion based on task description
    const taskLower = task.toLowerCase();
    const suggestions: Tool[] = [];

    for (const [name, tool] of this.tools) {
      const descriptionLower = tool.description.toLowerCase();
      
      // Check if any word from task appears in tool description
      const taskWords = taskLower.split(/\s+/);
      const descriptionWords = descriptionLower.split(/\s+/);
      
      const overlap = taskWords.filter(word => descriptionWords.includes(word));
      
      if (overlap.length > 0) {
        suggestions.push(tool);
      }
    }

    return suggestions;
  }

  private extractParamsForTool(params: Record<string, any>, tool: Tool): Record<string, any> {
    const toolParams: Record<string, any> = {};
    
    for (const paramName of Object.keys(tool.parameters)) {
      if (params[paramName] !== undefined) {
        toolParams[paramName] = params[paramName];
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

  private validateParams(tool: Tool, params: Record<string, any>): void {
    for (const [name, param] of Object.entries(tool.parameters)) {
      if (param.required && params[name] === undefined) {
        throw new Error(`Missing required parameter '${name}' for tool '${tool.name}'`);
      }
    }
  }

  private async loadBuiltInTools(): Promise<void> {
    // Web search tool
    await this.create({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        query: {
          type: 'string',
          description: 'Search query',
          required: true
        }
      },
      implementation: async (params) => {
        // TODO: Implement actual web search
        return { results: [`Search results for: ${params.query}`] };
      }
    });

    // File read tool
    await this.create({
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        path: {
          type: 'string',
          description: 'File path',
          required: true
        }
      },
      implementation: async (params) => {
        // TODO: Implement actual file reading
        return { content: `Contents of ${params.path}` };
      }
    });

    // File write tool
    await this.create({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        path: {
          type: 'string',
          description: 'File path',
          required: true
        },
        content: {
          type: 'string',
          description: 'Content to write',
          required: true
        }
      },
      implementation: async (params) => {
        // TODO: Implement actual file writing
        return { success: true, path: params.path };
      }
    });

    // Calculator tool
    await this.create({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate',
          required: true
        }
      },
      implementation: async (params) => {
        // Simple evaluation (would use proper math parser in production)
        try {
          const result = eval(params.expression);
          return { result, expression: params.expression };
        } catch (error) {
          throw new Error(`Invalid expression: ${params.expression}`);
        }
      }
    });

    // Code execution tool
    await this.create({
      name: 'execute_code',
      description: 'Execute code in a sandboxed environment',
      parameters: {
        code: {
          type: 'string',
          description: 'Code to execute',
          required: true
        },
        language: {
          type: 'string',
          description: 'Programming language',
          required: true
        }
      },
      implementation: async (params) => {
        // TODO: Implement actual code execution in sandbox
        return { output: `Executed ${params.language} code`, code: params.code };
      }
    });
  }
}