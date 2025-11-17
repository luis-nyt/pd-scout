import { cosmiconfig } from 'cosmiconfig';
import { ConfigSchema } from '../models/config.js';
import type { Config } from '../models/config.js';
import { logger } from '../utils/logger.js';

/**
 * Config Loader
 * 
 * Uses cosmiconfig to discover and load .pd-scout configuration files.
 * Supports multiple formats: .pd-scout.yaml, .pd-scout.json, package.json (pdScout field)
 * 
 * Cosmiconfig searches up the directory tree, so users can place config
 * at project root or in a subdirectory.
 */

const explorer = cosmiconfig('pd-scout', {
  searchPlaces: [
    'package.json',
    '.pd-scout.yaml',
    '.pd-scout.yml',
    '.pd-scout.json',
    '.pd-scout.js',
    'pd-scout.config.js',
  ],
});

/**
 * Load configuration from file system
 * Searches for config files in current directory and up
 */
export const loadConfig = async (configPath?: string): Promise<Config> => {
  try {
    // If explicit path provided, load from there
    const result = configPath ? await explorer.load(configPath) : await explorer.search();

    if (!result || !result.config) {
      throw new Error(
        'No configuration file found. Run "pd-scout init" to create one, or create .pd-scout.yaml manually.'
      );
    }

    logger.debug(`Loaded config from: ${result.filepath}`);

    // Validate against schema
    const config = ConfigSchema.parse(result.config);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Merge CLI flags with loaded config
 * CLI flags take precedence over config file
 */
export const mergeConfig = (baseConfig: Config, overrides: Partial<Config>): Config => {
  return {
    ...baseConfig,
    project: {
      ...baseConfig.project,
      ...overrides.project,
    },
    analysis: {
      ...baseConfig.analysis,
      ...overrides.analysis,
    },
    paths: {
      ...baseConfig.paths,
      ...overrides.paths,
    },
    cache: {
      ...baseConfig.cache,
      ...overrides.cache,
    },
    context: overrides.context || baseConfig.context,
  };
};

