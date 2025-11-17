import { z } from 'zod';

/**
 * Analysis Results Schema
 * 
 * Defines the structure of analysis outputs.
 * This is what gets saved to output/[timestamp].json
 * 
 * The LLM's findings are wrapped with metadata about the analysis:
 * - Cost (how much we spent on OpenAI API)
 * - Duration (how long it took)
 * - Files analyzed (scope of analysis)
 * - Token usage (for budget tracking)
 */

// Individual opportunity/finding
// The LLM returns an array of these
export const OpportunitySchema = z.object({
  file: z.string().describe('Relative file path'),
  lines: z.string().describe('Line number or range (e.g., "42" or "42-45")'),
  category: z.string().describe('Category ID from the pattern'),
  description: z.string().describe('Clear explanation of the finding'),
  current: z.string().describe('Current implementation (code snippet)'),
  suggested: z.string().describe('Suggested design system token/component'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

// Pattern summary
// Aggregated view of a specific pattern's occurrence
export const PatternSummarySchema = z.object({
  pattern: z.string().describe('Pattern description'),
  occurrences: z.number().describe('How many times this pattern appears'),
  files: z.array(z.string()).describe('Files where this pattern was found'),
  category: z.string().optional().describe('Primary category for this pattern'),
});

// Usage metrics
// Tracks OpenAI API usage for cost control and optimization
export const UsageMetricsSchema = z.object({
  totalTokens: z.number().describe('Total tokens used'),
  promptTokens: z.number().describe('Tokens in prompts (input)'),
  completionTokens: z.number().describe('Tokens in responses (output)'),
  estimatedCost: z.number().describe('Estimated cost in USD'),
  rounds: z.number().describe('Number of exploration rounds'),
});

// Main analysis result schema
export const AnalysisResultSchema = z.object({
  // Metadata
  metadata: z.object({
    projectName: z.string(),
    designSystem: z.string(),
    template: z.string(),
    pattern: z.string(),
    timestamp: z.string().describe('ISO 8601 timestamp'),
    duration: z.number().describe('Analysis duration in milliseconds'),
    version: z.string().describe('pd-scout version'),
  }),

  // Analysis configuration
  config: z.object({
    model: z.string(),
    tokenBudget: z.number(),
    maxRounds: z.number(),
    filePatterns: z.array(z.string()),
  }),

  // Results from the LLM
  results: z.object({
    opportunities: z.array(OpportunitySchema).describe('Individual findings'),
    patterns: z.array(PatternSummarySchema).describe('Pattern summaries'),
    summary: z.string().describe('High-level analysis summary'),
  }),

  // Usage and cost tracking
  usage: UsageMetricsSchema,

  // Status
  status: z.enum(['complete', 'incomplete', 'error']),
  error: z.string().optional().describe('Error message if status is "error"'),
});

// Inferred TypeScript types
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type PatternSummary = z.infer<typeof PatternSummarySchema>;
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;

// Helper type for partial results during analysis
export type PartialAnalysisResult = Partial<AnalysisResult>;

