import { PerceptionConfig, PerceptionInput, PerceptionOutput, ImageAnalysis, AudioAnalysis, CodeAnalysis } from '../types';
import { getLogger, logDebug } from '../logger';
import { LLMProvider } from '../reflection';

export class PerceptionLayer {
  private config: PerceptionConfig;
  private llmProvider: LLMProvider | null = null;
  private logger = getLogger();

  constructor(config: PerceptionConfig) {
    this.config = config;
  }

  async initialize(llmProvider?: LLMProvider): Promise<void> {
    if (llmProvider) {
      this.llmProvider = llmProvider;
    }
    this.logger.info({ modalities: this.config.modalities }, 'Perception layer initialized');
  }

  async analyze(input: PerceptionInput): Promise<PerceptionOutput> {
    const output: PerceptionOutput = {};

    try {
      if (input.text && this.config.modalities.includes('text')) {
        output.text = await this.analyzeText(input.text);
      }

      if (input.image && this.config.modalities.includes('image')) {
        output.imageAnalysis = await this.analyzeImage(input.image);
      }

      if (input.audio && this.config.modalities.includes('audio')) {
        output.audioAnalysis = await this.analyzeAudio(input.audio);
      }

      if (input.code && this.config.modalities.includes('code')) {
        output.codeAnalysis = await this.analyzeCode(input.code);
      }

      if (this.config.uncertainty) {
        output.uncertainty = this.calculateUncertainty(output);
      }
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Perception analysis failed');
      throw error;
    }

    return output;
  }

  private async analyzeText(text: string): Promise<string> {
    if (this.llmProvider) {
      return this.analyzeTextWithLLM(text);
    }
    return text.trim().replace(/\s+/g, ' ');
  }

  private async analyzeTextWithLLM(text: string): Promise<string> {
    const response = await this.llmProvider!.chat([
      {
        role: 'system',
        content: 'Clean and normalize the following text. Remove extra whitespace, fix formatting issues, and return the cleaned text.',
      },
      { role: 'user', content: text },
    ]);
    return response.trim();
  }

  private async analyzeImage(imagePath: string): Promise<ImageAnalysis> {
    if (this.llmProvider && this.config.visionModel) {
      return this.analyzeImageWithLLM(imagePath);
    }
    return this.analyzeImageBasic(imagePath);
  }

  private async analyzeImageWithLLM(imagePath: string): Promise<ImageAnalysis> {
    try {
      const response = await this.llmProvider!.chat([
        {
          role: 'system',
          content: `Analyze this image and provide:
1. List of objects detected
2. Scene description
3. Confidence score (0-1)
Return as JSON: {"objects": [...], "scene": "...", "confidence": 0.8}`,
        },
        { role: 'user', content: `Analyze image: ${imagePath}` },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      this.logger.warn('LLM image analysis failed, using basic analysis');
    }

    return this.analyzeImageBasic(imagePath);
  }

  private analyzeImageBasic(imagePath: string): ImageAnalysis {
    const extension = imagePath.split('.').pop()?.toLowerCase() || '';
    const sceneMap: Record<string, string> = {
      jpg: 'photograph',
      jpeg: 'photograph',
      png: 'image',
      gif: 'animation',
      svg: 'vector graphic',
      webp: 'image',
    };

    return {
      objects: [],
      scene: sceneMap[extension] || 'unknown image type',
      confidence: 0.5,
    };
  }

  private async analyzeAudio(audioPath: string): Promise<AudioAnalysis> {
    return {
      transcript: `[Audio file: ${audioPath}]`,
      language: 'unknown',
      sentiment: 'neutral',
    };
  }

  private async analyzeCode(code: string): Promise<CodeAnalysis> {
    const language = this.detectLanguage(code);
    const complexity = this.calculateComplexity(code);
    const issues = this.findIssues(code, language);
    const structure = this.parseStructure(code);

    return {
      language,
      complexity,
      issues,
      functions: structure.functions,
      classes: structure.classes,
    };
  }

  private detectLanguage(code: string): string {
    const patterns: Array<{ regex: RegExp; lang: string }> = [
      { regex: /(?:function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|import\s+.*from)/, lang: 'typescript' },
      { regex: /(?:def\s+\w+|class\s+\w+|import\s+\w+)/, lang: 'python' },
      { regex: /(?:public\s+class|private\s+void|protected\s+)/, lang: 'java' },
      { regex: /(?:#include|int\s+main|void\s+\w+\()/, lang: 'c++' },
      { regex: /(?:func\s+\w+|package\s+\w+|import\s+\")/, lang: 'go' },
      { regex: /(?:fn\s+\w+|let\s+mut|impl\s+)/, lang: 'rust' },
      { regex: /(?:SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE)/i, lang: 'sql' },
      { regex: /(?:<html|<div|<script)/i, lang: 'html' },
      { regex: /(?:\{|=>|\?:)/, lang: 'javascript' },
    ];

    for (const { regex, lang } of patterns) {
      if (regex.test(code)) {
        return lang;
      }
    }

    return 'unknown';
  }

  private calculateComplexity(code: string): number {
    const lines = code.split('\n').length;
    const functions = (code.match(/function|def|class|fn|func/g) || []).length;
    const conditionals = (code.match(/if|else|switch|case|match/g) || []).length;
    const loops = (code.match(/for|while|do|loop/g) || []).length;

    const rawComplexity = lines * 0.01 + functions * 0.1 + conditionals * 0.05 + loops * 0.05;
    return Math.min(1, rawComplexity);
  }

  private findIssues(code: string, language: string): string[] {
    const issues: string[] = [];

    if (code.includes('TODO') || code.includes('FIXME')) {
      issues.push('Contains TODO/FIXME comments');
    }

    if (code.includes('console.log') || code.includes('print(') || code.includes('System.out')) {
      issues.push('Contains debug statements');
    }

    if (language === 'typescript' && code.includes(': any')) {
      issues.push('Uses "any" type');
    }

    const longLines = code.split('\n').filter(line => line.length > 120);
    if (longLines.length > 0) {
      issues.push(`${longLines.length} line(s) exceed 120 characters`);
    }

    if (code.match(/eval\(|exec\(|subprocess/)) {
      issues.push('Contains potentially unsafe code execution');
    }

    if (code.match(/password|secret|api_key|token/i) && !code.match(/example|placeholder|your_/i)) {
      issues.push('May contain hardcoded secrets');
    }

    return issues;
  }

  private parseStructure(code: string): { functions: string[]; classes: string[] } {
    const functions: string[] = [];
    const classes: string[] = [];

    const funcMatches = code.matchAll(/(?:function|def|fn|func)\s+(\w+)/g);
    for (const match of funcMatches) {
      functions.push(match[1]);
    }

    const classMatches = code.matchAll(/(?:class|struct|interface)\s+(\w+)/g);
    for (const match of classMatches) {
      classes.push(match[1]);
    }

    return { functions, classes };
  }

  private calculateUncertainty(output: PerceptionOutput): number {
    let uncertainty = 0.5;

    if (output.text && output.text.length > 0) {
      uncertainty -= 0.15;
    }

    if (output.imageAnalysis) {
      uncertainty -= 0.1 * output.imageAnalysis.confidence;
    }

    if (output.audioAnalysis && output.audioAnalysis.transcript !== `[Audio file: ${output.audioAnalysis}]`) {
      uncertainty -= 0.1;
    }

    if (output.codeAnalysis) {
      uncertainty -= 0.1;
      if (output.codeAnalysis.language !== 'unknown') {
        uncertainty -= 0.05;
      }
    }

    return Math.max(0, Math.min(1, uncertainty));
  }

  async extractTextFromImage(imagePath: string): Promise<string> {
    logDebug('Extracting text from image', { imagePath });
    return `[OCR would extract text from: ${imagePath}]`;
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    logDebug('Transcribing audio', { audioPath });
    return `[Speech-to-text would transcribe: ${audioPath}]`;
  }

  async parseCodeStructure(code: string): Promise<any> {
    return this.parseStructure(code);
  }
}