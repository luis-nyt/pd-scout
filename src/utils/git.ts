import { simpleGit } from 'simple-git';
import { join } from 'pathe';
import { exists } from './fs.js';
import { logger } from './logger.js';

/**
 * Git Utilities
 * 
 * Handles cloning repositories and Git operations.
 * Uses simple-git for cross-platform Git access.
 * 
 * Why we need this:
 * - Users can provide @github.com/org/repo URLs for context docs
 * - We need to clone design system repos to read their documentation
 * - Caching prevents re-cloning every time
 */

/**
 * Check if a URL is a Git repository
 * Looks for common patterns like github.com, gitlab.com, .git extension
 */
export const isGitUrl = (url: string): boolean => {
  // URLs prefixed with @ are explicitly marked as Git repos
  if (url.startsWith('@')) return true;

  // Check for common Git hosting patterns
  const gitPatterns = [
    /^https?:\/\/(github|gitlab|bitbucket)\.com/,
    /\.git$/,
    /^git@/,
    /^ssh:\/\//,
  ];

  return gitPatterns.some((pattern) => pattern.test(url));
};

/**
 * Normalize a Git URL
 * Removes @ prefix and ensures it's a valid Git URL
 */
export const normalizeGitUrl = (url: string): string => {
  return url.startsWith('@') ? url.slice(1) : url;
};

/**
 * Clone a repository to a target directory
 * Returns the path to the cloned repo
 * 
 * If the repo already exists (from cache), just returns the path
 * This saves time and bandwidth on repeated analyses
 */
export const cloneRepo = async (
  repoUrl: string,
  targetDir: string,
  options?: {
    depth?: number; // Shallow clone for faster downloads
    branch?: string; // Specific branch to clone
  }
): Promise<string> => {
  const git = simpleGit();
  const normalizedUrl = normalizeGitUrl(repoUrl);

  logger.debug(`Cloning ${normalizedUrl} to ${targetDir}`);

  // Check if already cloned
  if (await exists(targetDir)) {
    logger.debug('Repository already exists, skipping clone');
    return targetDir;
  }

  // Clone options
  const cloneOptions: string[] = [];
  if (options?.depth) {
    cloneOptions.push(`--depth=${options.depth}`);
  }
  if (options?.branch) {
    cloneOptions.push(`--branch=${options.branch}`);
  }

  await git.clone(normalizedUrl, targetDir, cloneOptions);

  return targetDir;
};

/**
 * Get the current branch name of a repository
 */
export const getCurrentBranch = async (repoPath: string): Promise<string> => {
  const git = simpleGit(repoPath);
  const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
  return branch.trim();
};

/**
 * Get the short commit hash of a repository
 * Useful for identifying which version of context docs we're using
 */
export const getCommitHash = async (repoPath: string): Promise<string> => {
  const git = simpleGit(repoPath);
  const hash = await git.revparse(['--short', 'HEAD']);
  return hash.trim();
};

/**
 * Pull latest changes for a repository
 * Used to update cached repos
 */
export const pullLatest = async (repoPath: string): Promise<void> => {
  const git = simpleGit(repoPath);
  await git.pull();
};

/**
 * Generate a cache-safe directory name from a Git URL
 * Converts URLs to safe directory names
 * 
 * Example: https://github.com/my-org/design-system
 *       -> github-com-my-org-design-system
 */
export const urlToDirectoryName = (url: string): string => {
  const normalized = normalizeGitUrl(url);

  return normalized
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(/[/:]/g, '-')
    .replace(/[^a-z0-9-]/gi, '_')
    .toLowerCase();
};

