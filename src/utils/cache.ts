import { join } from 'pathe';
import { exists, readJSON, writeJSON, ensureDir } from './fs.js';
import { logger } from './logger.js';
import type { AnalysisResult } from '../models/results.js';

/**
 * Cache Utility
 * 
 * Caches analysis results and cloned repositories.
 * 
 * Why caching matters:
 * 1. Cloning repos is slow (especially large ones)
 * 2. LLM analysis costs money (re-running wastes $$$)
 * 3. Iterating on prompts is faster with cached repos
 * 
 * Cache structure:
 * .pd-scout-cache/
 *   ├── repos/          # Cloned repositories
 *   │   └── github-com-org-design-system/
 *   └── results/        # Analysis results
 *       └── [hash].json
 */

export class Cache {
  private cacheDir: string;
  private enabled: boolean;

  constructor(cacheDir: string, enabled = true) {
    this.cacheDir = cacheDir;
    this.enabled = enabled;
  }

  /**
   * Initialize cache directories
   */
  async init(): Promise<void> {
    if (!this.enabled) return;

    await ensureDir(this.cacheDir);
    await ensureDir(join(this.cacheDir, 'repos'));
    await ensureDir(join(this.cacheDir, 'results'));

    logger.debug(`Cache initialized at ${this.cacheDir}`);
  }

  /**
   * Get path for a cached repository
   */
  getRepoPath(repoName: string): string {
    return join(this.cacheDir, 'repos', repoName);
  }

  /**
   * Check if a repository is cached
   */
  async hasRepo(repoName: string): Promise<boolean> {
    if (!this.enabled) return false;
    const repoPath = this.getRepoPath(repoName);
    return exists(repoPath);
  }

  /**
   * Generate a cache key from analysis parameters
   * This creates a unique identifier for a specific analysis configuration
   * If any parameter changes, we get a different cache key
   */
  private generateCacheKey(params: {
    template: string;
    pattern: string;
    filePatterns: string[];
    repo: string;
  }): string {
    const normalized = JSON.stringify(params);
    // Simple hash function (not cryptographic, just for cache keys)
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get cached analysis result
   */
  async getResult(params: {
    template: string;
    pattern: string;
    filePatterns: string[];
    repo: string;
  }): Promise<AnalysisResult | null> {
    if (!this.enabled) return null;

    const cacheKey = this.generateCacheKey(params);
    const cachePath = join(this.cacheDir, 'results', `${cacheKey}.json`);

    if (await exists(cachePath)) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return readJSON<AnalysisResult>(cachePath);
    }

    logger.debug(`Cache miss for ${cacheKey}`);
    return null;
  }

  /**
   * Save analysis result to cache
   */
  async saveResult(
    params: {
      template: string;
      pattern: string;
      filePatterns: string[];
      repo: string;
    },
    result: AnalysisResult
  ): Promise<void> {
    if (!this.enabled) return;

    const cacheKey = this.generateCacheKey(params);
    const cachePath = join(this.cacheDir, 'results', `${cacheKey}.json`);

    await writeJSON(cachePath, result);
    logger.debug(`Cached result as ${cacheKey}`);
  }

  /**
   * Clear all cached results
   * (Keeps cloned repos since they're expensive to re-download)
   */
  async clearResults(): Promise<void> {
    if (!this.enabled) return;

    const resultsDir = join(this.cacheDir, 'results');
    const { remove } = await import('./fs.js');
    await remove(resultsDir);
    await ensureDir(resultsDir);

    logger.info('Cache cleared');
  }
}

