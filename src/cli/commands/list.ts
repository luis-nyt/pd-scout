import { Command } from 'commander';
import { PatternLoader } from '../../patterns/loader.js';
import { TemplateLoader } from '../../templates/loader.js';
import { loadConfig } from '../config-loader.js';
import { logger } from '../../utils/logger.js';

/**
 * List Command
 * 
 * Lists available patterns and templates.
 * 
 * Usage:
 *   pd-scout list patterns
 *   pd-scout list templates
 */

export const listCommand = new Command('list')
  .description('List available patterns or templates')
  .argument('<type>', 'Type to list (patterns or templates)')
  .option('-c, --config <path>', 'Config file path')
  .action(async (type: string, options) => {
    try {
      const config = await loadConfig(options.config);

      if (type === 'patterns') {
        const loader = new PatternLoader(config.paths.patterns);
        const patterns = await loader.listAvailable();

        logger.info('\n📦 Available Patterns:\n');

        const builtin = patterns.filter((p) => p.source === 'builtin');
        const user = patterns.filter((p) => p.source === 'user');

        if (builtin.length > 0) {
          logger.info('Built-in:');
          for (const pattern of builtin) {
            logger.info(`  • ${pattern.name}`);
          }
        }

        if (user.length > 0) {
          logger.info('\nUser:');
          for (const pattern of user) {
            logger.info(`  • ${pattern.name}`);
          }
        }

        if (patterns.length === 0) {
          logger.warn('No patterns found');
        }
      } else if (type === 'templates') {
        const loader = new TemplateLoader(config.paths.templates);
        const templates = await loader.listAvailable();

        logger.info('\n📦 Available Templates:\n');

        const builtin = templates.filter((t) => t.source === 'builtin');
        const user = templates.filter((t) => t.source === 'user');

        if (builtin.length > 0) {
          logger.info('Built-in:');
          for (const template of builtin) {
            logger.info(`  • ${template.name}`);
          }
        }

        if (user.length > 0) {
          logger.info('\nUser:');
          for (const template of user) {
            logger.info(`  • ${template.name}`);
          }
        }

        if (templates.length === 0) {
          logger.warn('No templates found');
        }
      } else {
        logger.error('Invalid type. Use "patterns" or "templates"');
        process.exit(1);
      }
    } catch (error) {
      logger.error('List failed:', error);
      process.exit(1);
    }
  });

