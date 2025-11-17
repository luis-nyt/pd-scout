import { z } from 'zod';

/**
 * Template Schema
 * 
 * Templates define "how to analyze" patterns.
 * They contain the prompts and instructions for the LLM.
 * 
 * Think of a template as the "creative brief" you give the LLM:
 * - systemPrompt: The LLM's job description and strategy
 * - userPromptTemplate: The specific request (with variable interpolation)
 * - outputSchema: What format the results should be in
 */

// Output field definition
// Tells the LLM what fields are required in the results
const OutputFieldSchema = z.object({
  name: z.string().describe('Field name in result objects'),
  type: z.string().describe('Data type (string, number, boolean, array)'),
  required: z.boolean().describe('Whether this field is mandatory'),
  description: z.string().describe('What this field should contain'),
});

// Main template schema
export const TemplateSchema = z.object({
  name: z.string().describe('Unique template name'),
  description: z.string().describe('What this template does'),
  version: z.string().describe('Semantic version'),

  // Which pattern this template analyzes
  // This links the template to a pattern file
  pattern: z.string().describe('Pattern name to analyze'),

  // System prompt: Sets the LLM's role and strategy
  // This is like the "job description" - it tells the LLM:
  // - Who it is (design systems expert)
  // - What its goal is (find typography issues)
  // - How to approach it (list files, search, read samples, categorize)
  // - Constraints (budget, output format)
  systemPrompt: z.string().describe('System prompt for LLM (sets role and strategy)'),

  // User prompt template: The actual analysis request
  // Supports variable interpolation like {projectName}, {tokenBudget}
  // Variables are filled in at runtime from config
  userPromptTemplate: z.string().describe('User prompt with variable interpolation'),

  // Strategy guidance (appears in system prompt)
  // High-level steps the LLM should follow
  strategy: z
    .array(z.string())
    .describe('Step-by-step strategy for the LLM to follow'),

  // Output schema: What the results should look like
  // This structures the LLM's response so we get consistent data
  outputSchema: z.object({
    fields: z.array(OutputFieldSchema).describe('Required fields in analysis results'),
  }),

  // Variables that can be interpolated into prompts
  // Example: { designSystem: "MyDesignSystem", focusAreas: "fonts, colors" }
  // These get replaced in prompts: {designSystem} -> "MyDesignSystem"
  variables: z.record(z.string()).optional().describe('Default variable values'),
});

// Inferred TypeScript types
export type Template = z.infer<typeof TemplateSchema>;
export type OutputField = z.infer<typeof OutputFieldSchema>;

// Helper type for validated templates with metadata
export type LoadedTemplate = Template & {
  source: string; // File path where template was loaded from
};

