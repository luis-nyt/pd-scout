import { TemplateSchema } from '../models/template.js';
import type { Template } from '../models/template.js';
import { logger } from '../utils/logger.js';

/**
 * Template Validator
 * 
 * Validates template YAML files against the schema.
 * Similar to pattern validator but for templates.
 */

export class TemplateValidator {
  /**
   * Validate a template object
   * Throws an error if validation fails
   */
  validate(data: unknown): Template {
    try {
      return TemplateSchema.parse(data);
    } catch (error) {
      logger.error('Template validation failed:');
      throw error;
    }
  }

  /**
   * Validate a template object and return result with errors
   * Non-throwing version for when you want to handle errors gracefully
   */
  validateSafe(data: unknown): { success: boolean; data?: Template; error?: string } {
    const result = TemplateSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: result.error.message,
    };
  }
}

