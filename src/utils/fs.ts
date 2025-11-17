import { promises as fs } from 'node:fs';
import { dirname } from 'pathe';

/**
 * File System Utilities
 * 
 * Wrappers around Node's fs/promises with helpful abstractions.
 * Uses pathe for cross-platform path handling (works on Windows/Mac/Linux).
 */

/**
 * Ensure a directory exists, creating it if necessary
 * Like mkdir -p
 */
export const ensureDir = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // If it already exists, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Read a JSON file and parse it
 * Returns typed data based on generic parameter
 */
export const readJSON = async <T = unknown>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
};

/**
 * Write data to a JSON file
 * Creates parent directories if needed
 */
export const writeJSON = async (filePath: string, data: unknown): Promise<void> => {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

/**
 * Check if a file or directory exists
 */
export const exists = async (path: string): Promise<boolean> => {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read a text file
 */
export const readText = async (filePath: string): Promise<string> => {
  return fs.readFile(filePath, 'utf-8');
};

/**
 * Write text to a file
 * Creates parent directories if needed
 */
export const writeText = async (filePath: string, content: string): Promise<void> => {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
};

/**
 * Get file stats (size, modified time, etc.)
 */
export const getStats = async (filePath: string) => {
  return fs.stat(filePath);
};

/**
 * List directory contents
 */
export const listDir = async (dirPath: string): Promise<string[]> => {
  return fs.readdir(dirPath);
};

/**
 * Remove a file or directory recursively
 * Like rm -rf
 */
export const remove = async (path: string): Promise<void> => {
  try {
    await fs.rm(path, { recursive: true, force: true });
  } catch (error) {
    // If it doesn't exist, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
};

