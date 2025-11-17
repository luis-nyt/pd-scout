import { Command } from 'commander';
import { PatternLoader } from '../../patterns/loader.js';
import { TemplateLoader } from '../../templates/loader.js';
import { logger } from '../../utils/logger.js';

/**
 * Validate Command
 * 
 * Validates pattern and template YAML files.
 * Useful for checking custom patterns/templates before using them.
 * 
 * Usage:
 *   pd-scout validate patterns/my-pattern.yaml
 *   pd-scout validate templates/my-template.yaml
 */

export const validateCommand = new Command('validate')
  .description('Validate pattern or template files')
  .argument('<file>', 'File path to validate')
  .action(async (file: string) => {
    try {
      logger.info(`Validating: ${file}`);

      // Determine if it's a pattern or template based on file path
      const isPattern = file.includes('pattern') || file.includes('/patterns/');
      const isTemplate = file.includes('template') || file.includes('/templates/');

      if (isPattern) {
        const loader = new PatternLoader('./patterns');
        const result = await loader.validateFile(file);

        if (result.valid) {
          logger.success('✅ Pattern is valid');
        } else {
          logger.error('❌ Pattern validation failed:');
          logger.error(result.error || 'Unknown error');
          process.exit(1);
        }
      } else if (isTemplate) {
        const loader = new TemplateLoader('./templates');
        const result = await loader.validateFile(file);

        if (result.valid) {
          logger.success('✅ Template is valid');
        } else {
          logger.error('❌ Template validation failed:');
          logger.error(result.error || 'Unknown error');
          process.exit(1);
        }
      } else {
        logger.error('Could not determine file type. Include "pattern" or "template" in path.');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Validation failed:', error);
      process.exit(1);
    }
  });

