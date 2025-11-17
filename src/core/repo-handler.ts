import { join } from 'pathe';
import { globby } from 'globby';
import { readText, exists } from '../utils/fs.js';
import { cloneRepo, isGitUrl, urlToDirectoryName } from '../utils/git.js';
import { logger } from '../utils/logger.js';
import type { Cache } from '../utils/cache.js';

/**
 * Repository Handler
 * 
 * Manages access to code repositories (local or remote).
 * Handles cloning, caching, and file operations.
 * 
 * This is what gives the LLM access to the actual codebase files.
 */

export class RepoHandler {
  private repoPath: string;
  private cache?: Cache;

  constructor(repoPath: string, cache?: Cache) {
    this.repoPath = repoPath;
    this.cache = cache;
  }

  /**
   * Initialize repository access
   * If it's a Git URL, clone it (or use cached copy)
   * If it's a local path, just verify it exists
   */
  static async init(repoUrlOrPath: string, cache?: Cache): Promise<RepoHandler> {
    let actualPath = repoUrlOrPath;

    if (isGitUrl(repoUrlOrPath)) {
      logger.debug(`Detected Git URL: ${repoUrlOrPath}`);

      const dirName = urlToDirectoryName(repoUrlOrPath);
      const cacheDir = cache?.getRepoPath(dirName);

      if (cacheDir && cache && (await cache.hasRepo(dirName))) {
        logger.info(`Using cached repository: ${dirName}`);
        actualPath = cacheDir;
      } else if (cacheDir) {
        logger.info(`Cloning repository: ${repoUrlOrPath}`);
        actualPath = await cloneRepo(repoUrlOrPath, cacheDir, { depth: 1 });
      } else {
        throw new Error('Git URL provided but caching is disabled');
      }
    } else {
      // Local path
      if (!(await exists(actualPath))) {
        throw new Error(`Repository path does not exist: ${actualPath}`);
      }
    }

    return new RepoHandler(actualPath, cache);
  }

  /**
   * Get the repository path
   */
  getPath(): string {
    return this.repoPath;
  }

  /**
   * List files matching a glob pattern
   * This is one of the tools the LLM can use
   */
  async listFiles(pattern: string | string[]): Promise<string[]> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    logger.debug(`Listing files with patterns: ${patterns.join(', ')}`);

    const files = await globby(patterns, {
      cwd: this.repoPath,
      gitignore: true, // Respect .gitignore
      absolute: false, // Return relative paths
    });

    logger.debug(`Found ${files.length} files`);

    return files;
  }

  /**
   * Read file contents
   * This is one of the tools the LLM can use
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = join(this.repoPath, filePath);

    if (!(await exists(fullPath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    return readText(fullPath);
  }

  /**
   * Read multiple files at once
   * More efficient than calling readFile multiple times
   */
  async readFiles(filePaths: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const filePath of filePaths) {
      try {
        results[filePath] = await this.readFile(filePath);
      } catch (error) {
        logger.warn(`Failed to read ${filePath}: ${error}`);
        results[filePath] = `[Error reading file: ${error}]`;
      }
    }

    return results;
  }

  /**
   * Search for a pattern across files
   * Simple grep-like functionality
   * This is one of the tools the LLM can use
   */
  async searchCode(pattern: string, filePattern?: string): Promise<
    Array<{
      file: string;
      line: number;
      content: string;
    }>
  > {
    // Get files to search
    const files = await this.listFiles(filePattern || '**/*');

    const results: Array<{ file: string; line: number; content: string }> = [];

    // Search each file
    // Note: This is a simple implementation. In production, you might want to use
    // a faster search tool like ripgrep or ag
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        const lines = content.split('\n');

        // Check if pattern is a regex
        const regex = new RegExp(pattern, 'gi');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && regex.test(line)) {
            results.push({
              file,
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        logger.debug(`Skipping ${file}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Get package.json dependencies
   * Useful for understanding what libraries are available
   */
  async getDependencies(): Promise<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }> {
    const packagePath = join(this.repoPath, 'package.json');

    if (!(await exists(packagePath))) {
      return { dependencies: {}, devDependencies: {} };
    }

    const content = await readText(packagePath);
    const pkg = JSON.parse(content);

    return {
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  }
}

