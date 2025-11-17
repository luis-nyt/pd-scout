import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { logger } from '../utils/logger.js';
import { ToolRegistry } from './tools.js';
import { RepoHandler } from './repo-handler.js';
import { ContextHandler } from './context-handler.js';
import { TemplateInterpolator } from '../templates/interpolator.js';
import type { Config } from '../models/config.js';
import type { LoadedPattern } from '../models/pattern.js';
import type { LoadedTemplate } from '../models/template.js';
import type { AnalysisResult, UsageMetrics } from '../models/results.js';

/**
 * Agentic Analyzer
 * 
 * This is the "brain" of pd-scout - it orchestrates the agentic exploration loop.
 * 
 * "Agentic" means the LLM decides its own steps (like an expert exploring a codebase),
 * rather than following a hardcoded recipe. This makes it flexible but harder to predict.
 * 
 * The flow:
 * 1. Initialize with system prompt (LLM's job description)
 * 2. Give user prompt (the actual task)
 * 3. Loop:
 *    - LLM decides what tool to use
 *    - Execute tool
 *    - LLM sees result
 *    - LLM decides next step
 * 4. LLM calls finish_analysis when done
 * 5. Return structured results
 */

export class AgenticAnalyzer {
  private client: OpenAI;
  private config: Config;
  private pattern: LoadedPattern;
  private template: LoadedTemplate;
  private tools: ToolRegistry;
  private history: ChatCompletionMessageParam[] = [];
  private usage: UsageMetrics = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
    rounds: 0,
  };

  constructor(
    config: Config,
    pattern: LoadedPattern,
    template: LoadedTemplate,
    repoHandler: RepoHandler,
    contextHandler?: ContextHandler
  ) {
    // Initialize OpenAI client
    // API key from config or environment variable
    const apiKey = config.analysis.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found. Set OPENAI_API_KEY environment variable or provide in config.'
      );
    }

    this.client = new OpenAI({ apiKey });
    this.config = config;
    this.pattern = pattern;
    this.template = template;
    this.tools = new ToolRegistry(repoHandler, contextHandler);
  }

  /**
   * Run the analysis
   * This is the main entry point
   */
  async analyze(): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Build prompts with variable interpolation
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt();

      // Initialize conversation
      this.history = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      logger.info('Starting agentic analysis...');
      logger.debug(`Token budget: ${this.config.analysis.tokenBudget}`);
      logger.debug(`Max rounds: ${this.config.analysis.maxRounds}`);

      // Main exploration loop
      await this.explorationLoop();

      // Get results from tools (set by finish_analysis call)
      const results = this.tools.getResults() as {
        opportunities: unknown[];
        patterns: unknown[];
        summary: string;
      };

      // Build final result object
      const analysisResult: AnalysisResult = {
        metadata: {
          projectName: this.config.project.name,
          designSystem: this.config.project.designSystem,
          template: this.template.name,
          pattern: this.pattern.name,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          version: '1.0.0', // TODO: Get from package.json
        },
        config: {
          model: this.config.analysis.model,
          tokenBudget: this.config.analysis.tokenBudget,
          maxRounds: this.config.analysis.maxRounds,
          filePatterns: this.pattern.filePatterns,
        },
        results: {
          opportunities: results.opportunities as never[],
          patterns: results.patterns as never[],
          summary: results.summary,
        },
        usage: this.usage,
        status: 'complete',
      };

      return analysisResult;
    } catch (error) {
      logger.error('Analysis failed:', error);

      // Return error result
      return {
        metadata: {
          projectName: this.config.project.name,
          designSystem: this.config.project.designSystem,
          template: this.template.name,
          pattern: this.pattern.name,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          version: '1.0.0',
        },
        config: {
          model: this.config.analysis.model,
          tokenBudget: this.config.analysis.tokenBudget,
          maxRounds: this.config.analysis.maxRounds,
          filePatterns: this.pattern.filePatterns,
        },
        results: {
          opportunities: [],
          patterns: [],
          summary: 'Analysis failed',
        },
        usage: this.usage,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Main exploration loop
   * The LLM repeatedly decides what to do until it finishes or hits a limit
   */
  private async explorationLoop(): Promise<void> {
    for (let round = 0; round < this.config.analysis.maxRounds; round++) {
      this.usage.rounds = round + 1;

      logger.debug(`Round ${round + 1}/${this.config.analysis.maxRounds}`);

      // Call OpenAI with tools available
      const response = await this.client.chat.completions.create({
        model: this.config.analysis.model,
        messages: this.history,
        tools: this.tools.getDefinitions(),
        tool_choice: 'auto', // Let LLM decide when to use tools
      });

      // Track token usage for cost control
      if (response.usage) {
        this.usage.totalTokens += response.usage.total_tokens;
        this.usage.promptTokens += response.usage.prompt_tokens;
        this.usage.completionTokens += response.usage.completion_tokens;
        this.usage.estimatedCost = this.calculateCost(this.usage);
      }

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('No message in response');
      }

      // Add LLM response to history
      this.history.push(message);

      // Did LLM want to use tools?
      if (message.tool_calls && message.tool_calls.length > 0) {
        logger.debug(`LLM requested ${message.tool_calls.length} tool call(s)`);

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await this.tools.execute(toolCall.function.name, args);

            // Add tool result to history
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });

            logger.debug(`Tool ${toolCall.function.name} executed successfully`);
          } catch (error) {
            logger.error(`Tool ${toolCall.function.name} failed:`, error);

            // Add error to history so LLM knows it failed
            this.history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
      }

      // Check if LLM called finish_analysis
      if (this.tools.isFinished()) {
        logger.success('Analysis complete');
        return;
      }

      // Budget check - are we running out of tokens?
      if (this.usage.totalTokens > this.config.analysis.tokenBudget * 0.8) {
        logger.warn(
          `Approaching token budget (${this.usage.totalTokens}/${this.config.analysis.tokenBudget})`
        );

        // Force completion
        return this.forceCompletion();
      }
    }

    // Max rounds reached without finish_analysis
    logger.warn('Max rounds reached without completion');
    return this.forceCompletion();
  }

  /**
   * Force the LLM to finish with what it has
   * Called when budget or round limit is reached
   */
  private async forceCompletion(): Promise<void> {
    logger.info('Forcing completion with current findings...');

    this.history.push({
      role: 'user',
      content:
        'You have reached the budget/round limit. Please call finish_analysis now with whatever findings you have gathered so far. ' +
        'Include all opportunities you have identified, even if the analysis is not fully complete.',
    });

    // One more round to get the finish call
    const response = await this.client.chat.completions.create({
      model: this.config.analysis.model,
      messages: this.history,
      tools: this.tools.getDefinitions(),
      tool_choice: { type: 'function', function: { name: 'finish_analysis' } },
    });

    const message = response.choices[0]?.message;
    if (message?.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        await this.tools.execute(toolCall.function.name, args);
      }
    }
  }

  /**
   * Build system prompt with variable interpolation
   */
  private buildSystemPrompt(): string {
    const interpolator = new TemplateInterpolator();
    const variables = {
      projectName: this.config.project.name,
      designSystem: this.config.project.designSystem,
      tokenBudget: this.config.analysis.tokenBudget.toString(),
      maxRounds: this.config.analysis.maxRounds.toString(),
      ...this.template.variables,
    };

    return interpolator.interpolate(this.template.systemPrompt, variables);
  }

  /**
   * Build user prompt with variable interpolation
   */
  private buildUserPrompt(): string {
    const interpolator = new TemplateInterpolator();
    const variables = {
      projectName: this.config.project.name,
      designSystem: this.config.project.designSystem,
      filePatterns: this.pattern.filePatterns.join(', '),
      ...this.template.variables,
    };

    return interpolator.interpolate(this.template.userPromptTemplate, variables);
  }

  /**
   * Calculate estimated cost based on token usage
   * Pricing varies by model - these are approximate
   */
  private calculateCost(usage: UsageMetrics): number {
    // GPT-4 Turbo pricing (approximate)
    // Input: $0.01 per 1K tokens
    // Output: $0.03 per 1K tokens
    const inputCost = (usage.promptTokens / 1000) * 0.01;
    const outputCost = (usage.completionTokens / 1000) * 0.03;

    return inputCost + outputCost;
  }
}

