import { z } from 'zod';

/**
 * Pattern Schema
 * 
 * Patterns define "what to look for" in codebases.
 * They're pure data (YAML) which makes them easy to create without coding.
 * 
 * Think of a pattern like a search template - it tells pd-scout:
 * 1. Which file types to scan (filePatterns)
 * 2. What strings/regex to search for (searchPatterns)
 * 3. How to categorize findings (categories)
 */

// Individual search pattern
// Example: { pattern: "fontSize:", description: "Inline font sizes", category: "inline-style" }
const SearchPatternItemSchema = z.object({
  pattern: z.string().describe('String or regex pattern to search for'),
  description: z.string().describe('Human-readable description of what this finds'),
  category: z.string().optional().describe('Pre-tag with a category if obvious'),
});

// Categories for classifying findings
// These create a framework for the LLM to organize its findings
// Example: "Not Using Design System" vs "Using Tokens" vs "Full Integration"
const CategorySchema = z.object({
  id: z.string().describe('Unique identifier (used in analysis results)'),
  label: z.string().describe('Display label (appears in reports)'),
  description: z.string().describe('Explanation of what belongs in this category'),
  priority: z.enum(['low', 'medium', 'high']).describe('Urgency for fixing'),
});

// Main pattern schema
export const PatternSchema = z.object({
  name: z.string().describe('Unique pattern name (e.g., "typography")'),
  description: z.string().describe('What this pattern analyzes'),
  version: z.string().describe('Semantic version for pattern evolution'),

  // File patterns to scan (glob syntax)
  // Example: ["**/*.tsx", "**/*.jsx", "**/*.css"]
  filePatterns: z.array(z.string()).describe('Glob patterns for files to analyze'),

  // Search patterns organized by language/file type
  // This allows different patterns for different file types
  // Example: { typescript: [...], swift: [...], css: [...] }
  searchPatterns: z.record(z.array(SearchPatternItemSchema)).describe('Patterns to search for'),

  // Categories for classification
  categories: z.array(CategorySchema).describe('How to categorize findings'),

  // Metadata
  author: z.string().optional(),
  tags: z.array(z.string()).optional().describe('Tags for discovery/filtering'),
});

// Inferred TypeScript types
export type Pattern = z.infer<typeof PatternSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type SearchPatternItem = z.infer<typeof SearchPatternItemSchema>;

// Helper type for validated patterns with metadata
export type LoadedPattern = Pattern & {
  source: string; // File path where pattern was loaded from
};

