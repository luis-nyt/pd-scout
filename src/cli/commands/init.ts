import { Command } from 'commander';
import { stringify as stringifyYAML } from 'yaml';
import { writeText, exists } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { promptForConfig, confirmAction } from '../ui/prompts.js';
import * as clack from '@clack/prompts';

/**
 * Init Command
 * 
 * Creates a new .pd-scout.yaml configuration file interactively.
 * 
 * Usage:
 *   pd-scout init
 */

export const initCommand = new Command('init')
  .description('Initialize a new pd-scout configuration')
  .option('-y, --yes', 'Use defaults without prompting')
  .action(async (options) => {
    try {
      clack.intro('🔍 pd-scout setup');

      // Check if config already exists
      const configPath = '.pd-scout.yaml';
      if (await exists(configPath)) {
        logger.warn(`Configuration file already exists: ${configPath}`);

        const overwrite = await confirmAction('Overwrite existing configuration?');

        if (!overwrite) {
          clack.outro('Cancelled');
          return;
        }
      }

      // Get config from user
      let configData;
      if (options.yes) {
        configData = {
          projectName: 'my-project',
          designSystem: 'Design System',
          repo: '',
          tokenBudget: '100000',
        };
      } else {
        configData = await promptForConfig();
      }

      // Build config object
      const config = {
        project: {
          name: configData.projectName,
          designSystem: configData.designSystem,
          ...(configData.repo ? { repo: configData.repo } : {}),
        },
        analysis: {
          tokenBudget: Number.parseInt(configData.tokenBudget as string, 10),
          maxRounds: 10,
          model: 'gpt-4-turbo',
        },
        paths: {
          patterns: './patterns',
          templates: './templates',
          output: './output',
        },
        cache: {
          enabled: true,
          directory: './.pd-scout-cache',
        },
      };

      // Convert to YAML
      const yaml = stringifyYAML(config);

      // Write file
      await writeText(configPath, yaml);

      clack.outro(`✅ Configuration created: ${configPath}`);
      logger.info('\nNext steps:');
      logger.info('  1. Run: pd-scout analyze --template typography-audit');
      logger.info('  2. Or create custom patterns in ./patterns/');
      logger.info('  3. Or create custom templates in ./templates/');
    } catch (error) {
      logger.error('Init failed:', error);
      process.exit(1);
    }
  });

