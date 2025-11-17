import { z } from 'zod';

/**
 * Configuration Schema
 * 
 * This defines the structure of the .pd-scout.yaml config file.
 * Uses Zod for runtime validation - if a user's config is malformed,
 * we catch it early with helpful error messages.
 */

// Context source (e.g., design system documentation)
// The "@" prefix in URLs triggers cloning from Git
export const ContextSourceSchema = z.object({
  url: z.string().describe('URL or path to documentation (prefix with @ for Git repos)'),
  type: z.string().default('design-system').describe('Type of documentation'),
  docPaths: z
    .array(z.string())
    .optional()
    .describe('Glob patterns for documentation files within the repo'),
});

// Main configuration schema
export const ConfigSchema = z.object({
  // Project metadata
  project: z.object({
    name: z.string().describe('Project name for display in outputs'),
    designSystem: z
      .string()
      .default('Design System')
      .describe('Name of design system (appears in prompts)'),
    repo: z.string().optional().describe('Repository URL or local path to analyze'),
  }),

  // Analysis settings - controls the LLM behavior and budget
  analysis: z.object({
    tokenBudget: z
      .number()
      .default(100000)
      .describe('Max tokens to spend (controls cost/depth)'),
    maxRounds: z.number().default(10).describe('Max exploration rounds'),
    model: z.string().default('gpt-4-turbo').describe('OpenAI model to use'),
    apiKey: z.string().optional().describe('OpenAI API key (or use OPENAI_API_KEY env var)'),
  }),

  // Reference documentation to include in analysis
  context: z.array(ContextSourceSchema).optional(),

  // File paths
  paths: z.object({
    patterns: z.string().default('./patterns').describe('Directory for pattern YAML files'),
    templates: z.string().default('./templates').describe('Directory for template YAML files'),
    output: z.string().default('./output').describe('Where to save analysis results'),
  }),

  // Caching to avoid re-cloning repos and re-running expensive operations
  cache: z.object({
    enabled: z.boolean().default(true),
    directory: z.string().default('./.pd-scout-cache'),
  }),
});

// Inferred TypeScript types from the schema
export type Config = z.infer<typeof ConfigSchema>;
export type ContextSource = z.infer<typeof ContextSourceSchema>;

// Partial config for CLI overrides
// Users can override config values via CLI flags
export type PartialConfig = Partial<Config>;

