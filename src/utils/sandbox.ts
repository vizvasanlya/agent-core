export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  allowedModules?: string[];
  blockedModules?: string[];
}

export interface SandboxResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
}

export class Sandbox {
  private config: Required<SandboxConfig>;

  constructor(config: SandboxConfig) {
    this.config = {
      timeout: config.timeout || 5000,
      memoryLimit: config.memoryLimit || 100 * 1024 * 1024, // 100MB
      allowedModules: config.allowedModules || [],
      blockedModules: config.blockedModules || [],
    };
  }

  async execute(code: string, language: string = 'javascript'): Promise<SandboxResult> {
    const startTime = Date.now();

    if (language !== 'javascript' && language !== 'typescript') {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      const result = await this.executeJavaScript(code);
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async executeJavaScript(code: string): Promise<any> {
    // Create a sandboxed context
    const sandbox = this.createSandbox();

    // Check if code has explicit return
    const hasReturn = code.includes('return ');
    
    // Wrap code in async function for await support
    const wrappedCode = hasReturn
      ? `(async () => { ${code} })()`
      : `(async () => { return ${code}; })()`;

    // Execute with timeout
    return Promise.race([
      this.executeInSandbox(wrappedCode, sandbox),
      this.createTimeout(),
    ]);
  }

  private createSandbox(): Record<string, any> {
    // Create a limited global scope
    const sandbox: Record<string, any> = {
      console: {
        log: (...args: any[]) => console.log('[sandbox]', ...args),
        error: (...args: any[]) => console.error('[sandbox]', ...args),
        warn: (...args: any[]) => console.warn('[sandbox]', ...args),
      },
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    // Add allowed modules
    if (this.config.allowedModules) {
      for (const mod of this.config.allowedModules) {
        try {
          sandbox[mod] = require(mod);
        } catch {
          // Module not available
        }
      }
    }

    return sandbox;
  }

  private async executeInSandbox(code: string, sandbox: Record<string, any>): Promise<any> {
    // Create function with sandboxed context
    const sandboxKeys = Object.keys(sandbox);
    const sandboxValues = Object.values(sandbox);

    // eslint-disable-next-line no-new-func
    const fn = new Function(...sandboxKeys, `return ${code}`);
    return fn(...sandboxValues);
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  validateCode(code: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for dangerous patterns
    if (code.includes('eval(')) {
      issues.push('Contains eval() which is not allowed');
    }

    if (code.includes('new Function(')) {
      issues.push('Contains new Function() which is not allowed');
    }

    if (code.includes('process.')) {
      issues.push('Contains process access which is not allowed');
    }

    if (code.includes('require(')) {
      issues.push('Contains require() which is not allowed');
    }

    if (code.includes('import(')) {
      issues.push('Contains dynamic import() which is not allowed');
    }

    if (code.includes('globalThis')) {
      issues.push('Contains globalThis access which is not allowed');
    }

    if (code.includes('window')) {
      issues.push('Contains window access which is not allowed');
    }

    if (code.includes('document')) {
      issues.push('Contains document access which is not allowed');
    }

    // Check for infinite loops
    if (code.match(/while\s*\(\s*true\s*\)/)) {
      issues.push('Contains while(true) loop which may cause infinite execution');
    }

    if (code.match(/for\s*\(\s*;\s*;\s*\)/)) {
      issues.push('Contains infinite for loop');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}