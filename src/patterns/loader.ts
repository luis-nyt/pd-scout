import { join, resolve } from 'pathe';
import { fileURLToPath } from 'node:url';
import { parse as parseYAML } from 'yaml';
import { globby } from 'globby';
import { readText, exists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { PatternValidator } from './validator.js';
import type { Pattern, LoadedPattern } from '../models/pattern.js';

/**
 * Pattern Loader
 * 
 * Discovers and loads pattern YAML files from multiple locations:
 * 1. Built-in patterns (shipped with pd-scout)
 * 2. User patterns (in project directory)
 * 3. Explicit file paths
 * 
 * This allows users to:
 * - Use built-in patterns out of the box
 * - Create custom patterns without forking
 * - Share patterns as separate files
 */

export class PatternLoader {
  private validator = new PatternValidator();
  private patternsDir: string;
  private builtInDir: string;

  constructor(patternsDir: string) {
    this.patternsDir = resolve(patternsDir);
    // Built-in patterns are in dist/patterns/builtin (relative to the bundled file)
    // Since tsup bundles everything to dist/index.js, we resolve from there
    // Use fileURLToPath to properly decode URL-encoded paths (e.g., spaces as %20)
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    this.builtInDir = resolve(currentDir, 'patterns/builtin');
  }

  /**
   * Load a pattern by name
   * Searches in order: user patterns, built-in patterns, explicit path
   */
  async load(nameOrPath: string): Promise<LoadedPattern> {
    logger.debug(`Loading pattern: ${nameOrPath}`);

    // Try user patterns directory first
    const userPath = join(this.patternsDir, `${nameOrPath}.yaml`);
    if (await exists(userPath)) {
      return this.loadFromFile(userPath);
    }

    // Try built-in patterns
    const builtInPath = join(this.builtInDir, `${nameOrPath}.yaml`);
    if (await exists(builtInPath)) {
      return this.loadFromFile(builtInPath);
    }

    // Try as explicit file path
    if (await exists(nameOrPath)) {
      return this.loadFromFile(nameOrPath);
    }

    throw new Error(
      `Pattern not found: ${nameOrPath}\n` +
        `Searched:\n` +
        `  - ${userPath}\n` +
        `  - ${builtInPath}\n` +
        `  - ${nameOrPath}`
    );
  }

  /**
   * Load pattern from a file
   */
  private async loadFromFile(filePath: string): Promise<LoadedPattern> {
    logger.debug(`Loading pattern from ${filePath}`);

    const content = await readText(filePath);
    const data = parseYAML(content);

    // Validate against schema
    const pattern = this.validator.validate(data);

    return {
      ...pattern,
      source: filePath,
    };
  }

  /**
   * List all available patterns
   * Returns patterns from both built-in and user directories
   */
  async listAvailable(): Promise<
    Array<{
      name: string;
      source: 'builtin' | 'user';
      path: string;
    }>
  > {
    const patterns: Array<{ name: string; source: 'builtin' | 'user'; path: string }> = [];

    // Find built-in patterns
    if (await exists(this.builtInDir)) {
      const builtInFiles = await globby('*.yaml', { cwd: this.builtInDir });
      for (const file of builtInFiles) {
        patterns.push({
          name: file.replace('.yaml', ''),
          source: 'builtin',
          path: join(this.builtInDir, file),
        });
      }
    }

    // Find user patterns
    if (await exists(this.patternsDir)) {
      const userFiles = await globby('*.yaml', { cwd: this.patternsDir });
      for (const file of userFiles) {
        patterns.push({
          name: file.replace('.yaml', ''),
          source: 'user',
          path: join(this.patternsDir, file),
        });
      }
    }

    return patterns;
  }

  /**
   * Validate a pattern file without loading it
   * Useful for the "validate" CLI command
   */
  async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const content = await readText(filePath);
      const data = parseYAML(content);
      const result = this.validator.validateSafe(data);

      return {
        valid: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

