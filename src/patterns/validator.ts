import { PatternSchema } from '../models/pattern.js';
import type { Pattern } from '../models/pattern.js';
import { logger } from '../utils/logger.js';

/**
 * Pattern Validator
 * 
 * Validates pattern YAML files against the schema.
 * Uses Zod for runtime type checking - if a user creates an invalid pattern,
 * we catch it early with helpful error messages instead of cryptic failures.
 */

export class PatternValidator {
  /**
   * Validate a pattern object
   * Throws an error if validation fails
   */
  validate(data: unknown): Pattern {
    try {
      return PatternSchema.parse(data);
    } catch (error) {
      logger.error('Pattern validation failed:');
      throw error;
    }
  }

  /**
   * Validate a pattern object and return result with errors
   * Non-throwing version for when you want to handle errors gracefully
   */
  validateSafe(data: unknown): { success: boolean; data?: Pattern; error?: string } {
    const result = PatternSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: result.error.message,
    };
  }
}

