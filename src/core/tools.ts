import type { ChatCompletionTool } from 'openai/resources/index.mjs';
import type { RepoHandler } from './repo-handler.js';
import type { ContextHandler } from './context-handler.js';
import { logger } from '../utils/logger.js';

/**
 * Tool Registry
 * 
 * This is the "toolbox" we give the LLM.
 * Each tool is a function the LLM can call to gather information.
 * 
 * Think of it like apps on a phone:
 * - list_files: File explorer
 * - read_files: Text editor
 * - search_code: Find/grep
 * - get_dependencies: Package viewer
 * - read_context_docs: Documentation reader
 * - finish_analysis: Save/submit button
 * 
 * The LLM decides which tools to use and when, based on the task.
 */

export class ToolRegistry {
  private repoHandler: RepoHandler;
  private contextHandler?: ContextHandler;
  private finishCalled = false;
  private analysisResults: unknown = null;

  constructor(repoHandler: RepoHandler, contextHandler?: ContextHandler) {
    this.repoHandler = repoHandler;
    this.contextHandler = contextHandler;
  }

  /**
   * Get tool definitions for OpenAI function calling
   * These describe what each tool does and what parameters it takes
   */
  getDefinitions(): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [
      this.listFilesTool(),
      this.readFilesTool(),
      this.searchCodeTool(),
      this.getDependenciesTool(),
      this.finishAnalysisTool(),
    ];

    // Add context tools if context handler is available
    if (this.contextHandler) {
      tools.push(this.listContextDocsTool(), this.readContextDocTool());
    }

    return tools;
  }

  /**
   * List files tool definition
   */
  private listFilesTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'list_files',
        description:
          'List files in the repository. Use glob patterns to filter (e.g., "**/*.tsx"). ' +
          'Useful for understanding codebase structure before diving into specific files.',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob pattern to filter files (e.g., "**/*.tsx", "src/**/*.css")',
            },
          },
          required: ['pattern'],
        },
      },
    };
  }

  /**
   * Read files tool definition
   */
  private readFilesTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'read_files',
        description:
          'Read the contents of one or more files. Returns full file contents. ' +
          'Use this after listing files to examine actual code.',
        parameters: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths to read (relative to repo root)',
            },
          },
          required: ['files'],
        },
      },
    };
  }

  /**
   * Search code tool definition
   */
  private searchCodeTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'search_code',
        description:
          'Search for a pattern across the codebase. Returns matches with file, line number, and content. ' +
          'Supports regex patterns. Very useful for quantifying how widespread a pattern is.',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Pattern to search for (can be regex)',
            },
            filePattern: {
              type: 'string',
              description: 'Optional glob pattern to limit which files to search',
            },
          },
          required: ['pattern'],
        },
      },
    };
  }

  /**
   * Get dependencies tool definition
   */
  private getDependenciesTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'get_dependencies',
        description:
          'Get package.json dependencies and devDependencies. ' +
          'Useful for understanding what libraries/frameworks are available.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    };
  }

  /**
   * List context docs tool definition
   */
  private listContextDocsTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'list_context_docs',
        description:
          'List available design system documentation files. ' +
          'Use this to discover what documentation is available before reading specific docs.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    };
  }

  /**
   * Read context doc tool definition
   */
  private readContextDocTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'read_context_doc',
        description:
          'Read a design system documentation file. ' +
          'Use this to understand the correct tokens/components to suggest.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to documentation file',
            },
          },
          required: ['path'],
        },
      },
    };
  }

  /**
   * Finish analysis tool definition
   * This is how the LLM signals it's done
   */
  private finishAnalysisTool(): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'finish_analysis',
        description:
          'Call this when you have completed the analysis and have all findings ready. ' +
          'Provide the complete analysis results as structured data.',
        parameters: {
          type: 'object',
          properties: {
            opportunities: {
              type: 'array',
              description: 'Array of opportunities/findings',
              items: {
                type: 'object',
                properties: {
                  file: { type: 'string' },
                  lines: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                  current: { type: 'string' },
                  suggested: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                },
                required: ['file', 'lines', 'category', 'description', 'current', 'suggested'],
              },
            },
            patterns: {
              type: 'array',
              description: 'Summary of patterns found',
              items: {
                type: 'object',
                properties: {
                  pattern: { type: 'string' },
                  occurrences: { type: 'number' },
                  files: { type: 'array', items: { type: 'string' } },
                  category: { type: 'string' },
                },
                required: ['pattern', 'occurrences', 'files'],
              },
            },
            summary: {
              type: 'string',
              description: 'High-level summary of the analysis',
            },
          },
          required: ['opportunities', 'patterns', 'summary'],
        },
      },
    };
  }

  /**
   * Execute a tool by name
   * This is called when the LLM requests a tool
   */
  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`);
    logger.debug(`Arguments: ${JSON.stringify(args, null, 2)}`);

    switch (name) {
      case 'list_files':
        return this.repoHandler.listFiles(args.pattern as string);

      case 'read_files':
        return this.repoHandler.readFiles(args.files as string[]);

      case 'search_code':
        return this.repoHandler.searchCode(args.pattern as string, args.filePattern as string);

      case 'get_dependencies':
        return this.repoHandler.getDependencies();

      case 'list_context_docs':
        if (!this.contextHandler) throw new Error('No context handler available');
        return this.contextHandler.listDocuments();

      case 'read_context_doc':
        if (!this.contextHandler) throw new Error('No context handler available');
        return this.contextHandler.readDocument(args.path as string);

      case 'finish_analysis':
        this.finishCalled = true;
        this.analysisResults = args;
        return { status: 'Analysis complete' };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Check if analysis is complete (finish_analysis was called)
   */
  isFinished(): boolean {
    return this.finishCalled;
  }

  /**
   * Get the analysis results
   */
  getResults(): unknown {
    return this.analysisResults;
  }
}

