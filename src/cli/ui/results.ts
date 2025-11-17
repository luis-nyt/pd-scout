import type { AnalysisResult } from '../../models/results.js';
import { logger } from '../../utils/logger.js';

/**
 * Result Display
 * 
 * Formats and displays analysis results in the terminal.
 * Creates a human-readable summary of the findings.
 */

export const displayResults = (result: AnalysisResult) => {
  const { metadata, results, usage } = result;

  logger.info('\n' + '='.repeat(60));
  logger.info(`✅ Analysis Complete: ${metadata.projectName}`);
  logger.info('='.repeat(60));

  // Summary stats
  logger.info('\n📊 Summary:');
  logger.info(`  Total opportunities: ${results.opportunities.length}`);

  // Count by priority
  const byPriority = {
    high: results.opportunities.filter((o) => o.priority === 'high').length,
    medium: results.opportunities.filter((o) => o.priority === 'medium').length,
    low: results.opportunities.filter((o) => o.priority === 'low').length,
  };

  if (byPriority.high > 0) logger.info(`  High priority: ${byPriority.high}`);
  if (byPriority.medium > 0) logger.info(`  Medium priority: ${byPriority.medium}`);
  if (byPriority.low > 0) logger.info(`  Low priority: ${byPriority.low}`);

  // Pattern summary
  if (results.patterns.length > 0) {
    logger.info('\n🔍 Top Patterns:');
    results.patterns
      .slice(0, 5)
      .forEach((pattern) => logger.info(`  ${pattern.pattern}: ${pattern.occurrences} occurrences`));
  }

  // Usage and cost
  logger.info('\n💰 Usage:');
  logger.info(`  Tokens used: ${usage.totalTokens.toLocaleString()}`);
  logger.info(`  Estimated cost: $${usage.estimatedCost.toFixed(2)}`);
  logger.info(`  Rounds: ${usage.rounds}`);
  logger.info(`  Duration: ${(metadata.duration / 1000).toFixed(1)}s`);

  // Summary text
  if (results.summary) {
    logger.info('\n📝 Summary:');
    logger.info(results.summary);
  }

  logger.info('\n' + '='.repeat(60) + '\n');
};

export const displayQuickSummary = (result: AnalysisResult) => {
  logger.info(`Found ${result.results.opportunities.length} opportunities in ${(result.metadata.duration / 1000).toFixed(1)}s`);
  logger.info(`Cost: $${result.usage.estimatedCost.toFixed(2)}`);
};

