import { join, resolve } from 'pathe';
import { fileURLToPath } from 'node:url';
import { parse as parseYAML } from 'yaml';
import { globby } from 'globby';
import { readText, exists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { TemplateValidator } from './validator.js';
import type { Template, LoadedTemplate } from '../models/template.js';

/**
 * Template Loader
 * 
 * Discovers and loads template YAML files.
 * Similar structure to PatternLoader - searches built-in and user directories.
 * 
 * Templates define the "how to analyze" for patterns.
 */

export class TemplateLoader {
  private validator = new TemplateValidator();
  private templatesDir: string;
  private builtInDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = resolve(templatesDir);
    // Built-in templates are in dist/templates/builtin (relative to the bundled file)
    // Since tsup bundles everything to dist/index.js, we resolve from there
    // Use fileURLToPath to properly decode URL-encoded paths (e.g., spaces as %20)
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    this.builtInDir = resolve(currentDir, 'templates/builtin');
  }

  /**
   * Load a template by name
   * Searches in order: user templates, built-in templates, explicit path
   */
  async load(nameOrPath: string): Promise<LoadedTemplate> {
    logger.debug(`Loading template: ${nameOrPath}`);

    // Try user templates directory first
    const userPath = join(this.templatesDir, `${nameOrPath}.yaml`);
    if (await exists(userPath)) {
      return this.loadFromFile(userPath);
    }

    // Try built-in templates
    const builtInPath = join(this.builtInDir, `${nameOrPath}.yaml`);
    if (await exists(builtInPath)) {
      return this.loadFromFile(builtInPath);
    }

    // Try as explicit file path
    if (await exists(nameOrPath)) {
      return this.loadFromFile(nameOrPath);
    }

    throw new Error(
      `Template not found: ${nameOrPath}\n` +
        `Searched:\n` +
        `  - ${userPath}\n` +
        `  - ${builtInPath}\n` +
        `  - ${nameOrPath}`
    );
  }

  /**
   * Load template from a file
   */
  private async loadFromFile(filePath: string): Promise<LoadedTemplate> {
    logger.debug(`Loading template from ${filePath}`);

    const content = await readText(filePath);
    const data = parseYAML(content);

    // Validate against schema
    const template = this.validator.validate(data);

    return {
      ...template,
      source: filePath,
    };
  }

  /**
   * List all available templates
   * Returns templates from both built-in and user directories
   */
  async listAvailable(): Promise<
    Array<{
      name: string;
      source: 'builtin' | 'user';
      path: string;
    }>
  > {
    const templates: Array<{ name: string; source: 'builtin' | 'user'; path: string }> = [];

    // Find built-in templates
    if (await exists(this.builtInDir)) {
      const builtInFiles = await globby('*.yaml', { cwd: this.builtInDir });
      for (const file of builtInFiles) {
        templates.push({
          name: file.replace('.yaml', ''),
          source: 'builtin',
          path: join(this.builtInDir, file),
        });
      }
    }

    // Find user templates
    if (await exists(this.templatesDir)) {
      const userFiles = await globby('*.yaml', { cwd: this.templatesDir });
      for (const file of userFiles) {
        templates.push({
          name: file.replace('.yaml', ''),
          source: 'user',
          path: join(this.templatesDir, file),
        });
      }
    }

    return templates;
  }

  /**
   * Validate a template file without loading it
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

