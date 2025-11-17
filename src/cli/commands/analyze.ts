import { Command } from 'commander';
import { join } from 'pathe';
import { loadConfig, mergeConfig } from '../config-loader.js';
import { PatternLoader } from '../../patterns/loader.js';
import { TemplateLoader } from '../../templates/loader.js';
import { RepoHandler } from '../../core/repo-handler.js';
import { ContextHandler } from '../../core/context-handler.js';
import { AgenticAnalyzer } from '../../core/analyzer.js';
import { Cache } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { writeJSON, ensureDir } from '../../utils/fs.js';
import { displayResults, displayQuickSummary } from '../ui/results.js';
import { createProgressSpinner } from '../ui/progress.js';

/**
 * Analyze Command
 * 
 * The main command - runs agentic analysis on a codebase.
 * 
 * Usage:
 *   pd-scout analyze --template typography-audit
 *   pd-scout analyze -t typography-audit --repo ./src
 *   pd-scout analyze --pattern typography --budget 50000
 */

export const analyzeCommand = new Command('analyze')
  .description('Analyze a codebase using a template')
  .option('-t, --template <name>', 'Template to use for analysis')
  .option('-p, --pattern <name>', 'Pattern to use (overrides template pattern)')
  .option('-r, --repo <path>', 'Repository URL or local path')
  .option('-o, --output <path>', 'Output file path (default: auto-generated)')
  .option('-c, --config <path>', 'Config file path')
  .option('--budget <number>', 'Token budget override', (val) => Number.parseInt(val, 10))
  .option('--model <name>', 'Model override')
  .option('--dry-run', 'Show cost estimate without running')
  .option('-v, --verbose', 'Verbose logging')
  .option('-q, --quiet', 'Minimal output')
  .action(async (options) => {
    try {
      // Set log level
      if (options.verbose) logger.setVerbose(true);
      if (options.quiet) logger.setLevel('error');

      // Load base config
      const baseConfig = await loadConfig(options.config);

      // Merge with CLI overrides
      const config = mergeConfig(baseConfig, {
        project: {
          ...baseConfig.project,
          repo: options.repo || baseConfig.project.repo,
        },
        analysis: {
          ...baseConfig.analysis,
          tokenBudget: options.budget || baseConfig.analysis.tokenBudget,
          model: options.model || baseConfig.analysis.model,
        },
        paths: options.output
          ? { ...baseConfig.paths, output: options.output }
          : baseConfig.paths,
      });

      // Validate required options
      if (!options.template) {
        throw new Error('Template is required. Use --template <name>');
      }

      // Initialize cache
      const cache = new Cache(config.cache.directory, config.cache.enabled);
      await cache.init();

      // Load template
      const spinner = createProgressSpinner('Loading template and pattern...');
      const templateLoader = new TemplateLoader(config.paths.templates);
      const template = await templateLoader.load(options.template);
      spinner.succeed('Template loaded');

      // Load pattern (from template or override)
      const patternName = options.pattern || template.pattern;
      const patternLoader = new PatternLoader(config.paths.patterns);
      const pattern = await patternLoader.load(patternName);

      logger.info(`Template: ${template.name}`);
      logger.info(`Pattern: ${pattern.name}`);

      // Initialize repository handler
      const repoPath = config.project.repo || process.cwd();
      const repoSpinner = createProgressSpinner('Initializing repository...');
      const repoHandler = await RepoHandler.init(repoPath, cache);
      repoSpinner.succeed(`Repository ready: ${repoHandler.getPath()}`);

      // Initialize context handler (if context sources configured)
      let contextHandler: ContextHandler | undefined;
      if (config.context && config.context.length > 0) {
        const contextSpinner = createProgressSpinner('Loading context documentation...');
        contextHandler = new ContextHandler(config.context, cache);
        await contextHandler.init();
        contextSpinner.succeed('Context documentation loaded');
      }

      // Dry run - just show estimate
      if (options.dryRun) {
        logger.info('\n📊 Dry Run - Cost Estimate:');
        logger.info(`  Model: ${config.analysis.model}`);
        logger.info(`  Token budget: ${config.analysis.tokenBudget.toLocaleString()}`);
        logger.info(`  Max rounds: ${config.analysis.maxRounds}`);
        logger.info(`  Estimated max cost: $${((config.analysis.tokenBudget / 1000) * 0.03).toFixed(2)}`);
        logger.info('\nRun without --dry-run to execute analysis');
        return;
      }

      // Run analysis
      const analysisSpinner = createProgressSpinner('Running agentic analysis...');
      const analyzer = new AgenticAnalyzer(
        config,
        pattern,
        template,
        repoHandler,
        contextHandler
      );

      const result = await analyzer.analyze();
      analysisSpinner.succeed('Analysis complete');

      // Save results
      await ensureDir(config.paths.output);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const outputPath = options.output || join(config.paths.output, `${timestamp}_${template.name}.json`);
      await writeJSON(outputPath, result);

      logger.success(`Results saved to: ${outputPath}`);

      // Display results
      if (!options.quiet) {
        displayResults(result);
      } else {
        displayQuickSummary(result);
      }
    } catch (error) {
      logger.error('Analysis failed:', error);
      process.exit(1);
    }
  });

