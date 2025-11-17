import { join } from 'pathe';
import { globby } from 'globby';
import { readText } from '../utils/fs.js';
import { cloneRepo, isGitUrl, urlToDirectoryName } from '../utils/git.js';
import { logger } from '../utils/logger.js';
import type { Cache } from '../utils/cache.js';
import type { ContextSource } from '../models/config.js';

/**
 * Context Handler
 * 
 * Manages access to reference documentation (like design system docs).
 * This allows the LLM to read your design system documentation
 * to make better recommendations.
 * 
 * Example: If your design system docs define `tokens.typography.heading1`,
 * the LLM can suggest that specific token instead of generic advice.
 */

export class ContextHandler {
  private sources: ContextSource[];
  private cache?: Cache;
  private contextPaths: Map<string, string> = new Map();

  constructor(sources: ContextSource[], cache?: Cache) {
    this.sources = sources;
    this.cache = cache;
  }

  /**
   * Initialize context sources
   * Clone any Git repos and prepare file paths
   */
  async init(): Promise<void> {
    for (const source of this.sources) {
      if (isGitUrl(source.url)) {
        logger.debug(`Initializing context from Git: ${source.url}`);

        const dirName = urlToDirectoryName(source.url);
        const cacheDir = this.cache?.getRepoPath(`context-${dirName}`);

        if (cacheDir && (await this.cache?.hasRepo(`context-${dirName}`))) {
          logger.info(`Using cached context: ${dirName}`);
          this.contextPaths.set(source.url, cacheDir);
        } else if (cacheDir) {
          logger.info(`Cloning context repository: ${source.url}`);
          const path = await cloneRepo(source.url, cacheDir, { depth: 1 });
          this.contextPaths.set(source.url, path);
        }
      } else {
        // Local path
        this.contextPaths.set(source.url, source.url);
      }
    }
  }

  /**
   * List all available context documents
   * Returns metadata about each document
   */
  async listDocuments(): Promise<
    Array<{
      source: string;
      type: string;
      path: string;
    }>
  > {
    const docs: Array<{ source: string; type: string; path: string }> = [];

    for (const source of this.sources) {
      const basePath = this.contextPaths.get(source.url);
      if (!basePath) continue;

      const patterns = source.docPaths || ['**/*.md', '**/*.mdx'];

      const files = await globby(patterns, {
        cwd: basePath,
        gitignore: true,
        absolute: false,
      });

      for (const file of files) {
        docs.push({
          source: source.url,
          type: source.type,
          path: file,
        });
      }
    }

    return docs;
  }

  /**
   * Read a context document
   * This is one of the tools the LLM can use
   */
  async readDocument(relativePath: string, sourceUrl?: string): Promise<string> {
    // If source URL provided, use it directly
    if (sourceUrl) {
      const basePath = this.contextPaths.get(sourceUrl);
      if (!basePath) {
        throw new Error(`Context source not found: ${sourceUrl}`);
      }

      const fullPath = join(basePath, relativePath);
      return readText(fullPath);
    }

    // Otherwise, search all sources for the file
    for (const [url, basePath] of this.contextPaths.entries()) {
      try {
        const fullPath = join(basePath, relativePath);
        return await readText(fullPath);
      } catch {
        // Try next source
        continue;
      }
    }

    throw new Error(`Document not found: ${relativePath}`);
  }

  /**
   * Search context documents for a pattern
   * Similar to repo search but for design system docs
   */
  async searchDocuments(
    pattern: string
  ): Promise<Array<{ source: string; file: string; line: number; content: string }>> {
    const results: Array<{ source: string; file: string; line: number; content: string }> = [];

    const docs = await this.listDocuments();

    for (const doc of docs) {
      try {
        const content = await this.readDocument(doc.path, doc.source);
        const lines = content.split('\n');
        const regex = new RegExp(pattern, 'gi');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && regex.test(line)) {
            results.push({
              source: doc.source,
              file: doc.path,
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      } catch (error) {
        logger.debug(`Error searching ${doc.path}: ${error}`);
      }
    }

    return results;
  }
}

