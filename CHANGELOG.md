# Changelog

All notable changes to pd-scout will be documented in this file.

2025-11-20
- backed up the original root readme, added scout.png to the repo, and replaced the homepage copy with a simple “scout is a framework for auditing design system usage” under-construction note so visitors know a rebuild is in flight
- wired the “iOS Typography Audit” mention in the root readme to https://nyt-ios-newsreader-typography-audit.vercel.app/ so folks can click straight into the existing case study while we rebuild

## 2025-11-17

### Branch: `main`
#### 📝 Docs: Created mission-specific cursor rules for LLM agents

- created mission-rules.mdc as comprehensive primer for LLMs working on pd-scout
- documented project mission: pattern-driven codebase analysis for design system visibility using agentic LLM exploration
- explained current architecture (CLI only) and future architecture (CLI + Web UI with shared core)
- detailed the agentic loop pattern and how LLMs decide exploration strategy
- documented tool registry pattern and how to add new tools for LLM access
- included code patterns specific to pd-scout (analyzer, tools, pattern loading)
- provided task-specific guidance (adding patterns, adding tools, fixing bugs)
- listed known gaps (missing tests, error handling improvements needed)
- clarified what pd-scout is and isn't (intelligent auditor, not traditional linter)
- emphasized YAML interface as the product (extensibility without code changes)
- removed generic dual-interface-architecture.mdc in favor of mission-specific rules

### Branch: `main`
#### 📝 Docs: Comprehensive documentation improvements

- **README.md improvements:**
  - added "Who Is This For?" section with clear audience definition (design system engineers, frontend leads, product designers)
  - added "When to use / When NOT to use" guidance to set expectations
  - expanded "What Makes pd-scout Different?" with comparison table (ESLint vs pd-scout)
  - added comparison emphasizing hiring an expert vs running a spell-checker
  - created "Limitations & Known Issues" section with honest assessment
  - added "What pd-scout Is NOT" section to manage expectations
  - updated documentation links to note specific purposes (plain-English, technical)

- **ARCHITECTURE.md complete rewrite:**
  - changed from generic "Scout" to mission-focused "pd-scout Architecture"
  - added mission statement and design principles specific to pd-scout
  - documented all core components in detail (AgenticAnalyzer, ToolRegistry, RepoHandler, Loaders)
  - included detailed flow diagrams and code structure examples
  - explained the agentic pattern with comparisons to traditional approaches
  - documented data models using Zod schemas
  - added extension system documentation (creating custom patterns/templates)
  - detailed future architecture for when web UI is added (monorepo structure)
  - included build & development workflow
  - added design decisions section explaining technology choices
  - comprehensive glossary and further reading sections

- **HOW-IT-WORKS.md review:**
  - already excellent - no changes needed
  - follows all principles (analogies, progressive complexity, visual diagrams, plain English)
  - well-structured for product designers (target audience)

- **GETTING-STARTED.md review:**
  - already excellent - no changes needed
  - beginner-friendly with step-by-step instructions
  - clear prerequisites and verification steps
  - comprehensive troubleshooting guide

**Impact:** Documentation now clearly communicates pd-scout's mission, sets realistic expectations, and provides both beginner-friendly and technical-depth resources. New contributors and LLM agents have comprehensive context about the project's purpose and architecture.

## 2025-11-13

### Cursor Rules Update

- updated general-rules.mdc to modernize tech stack for Next.js projects with Tailwind CSS and Shadcn UI approach
- replaced CSS Modules mandate with Tailwind CSS + Shadcn UI + Radix UI for modern utility-first styling
- added Next.js-specific best practices including minimizing 'use client', favoring React Server Components, and implementing dynamic imports
- added comprehensive section explaining named exports vs default exports with clear examples showing why named exports improve consistency and IDE support
- included mobile-first responsive design principles and image optimization guidelines (WebP, lazy loading, Next.js Image component)
- added modern state management recommendations (Zustand, Jotai) and TanStack Query for data fetching
- integrated Zod for schema validation and type safety
- expanded error handling section with guard clause examples and early return patterns
- added security best practices including input sanitization and Next.js security features
- created dedicated "Meta-Development Practices" section highlighting when to stop, loop detection, Rule of Three refactoring, and communication style
- added JSDoc recommendation for improved IDE intellisense
- included structured development methodology (Deep Dive Analysis → Planning → Implementation → Review → Finalization)
- preserved teaching-focused documentation philosophy and code commenting approach for product designer audience
- maintained documentation hierarchy (README → HOW-IT-WORKS → ARCHITECTURE → GLOSSARY) as critical foundation

## 2025-11-08

### Build Fixes and Testing

- **MAJOR FIX**: switched from tsup bundling to tsc compilation to fix "Dynamic require of punycode is not supported" error
- tsup's bundler was incompatible with ESM + dynamic requires in dependencies (whatwg-url/punycode)
- created scripts/post-build.js to copy YAML files and add shebang after tsc compilation
- updated package.json bin path to dist/cli/index.js
- fixed TypeScript strict mode error in repo-handler.ts (cache possibly undefined)
- successfully builds and runs with npm link for global access
- fixed package.json bin path from cli.js to index.js to match tsup output
- removed duplicate shebang from src/cli/index.ts (tsup banner already adds it)
- fixed init command using parse instead of stringify for YAML generation
- added YAML file copying to tsup.config.ts onSuccess hook for built-in patterns/templates
- fixed path resolution in pattern and template loaders using fileURLToPath to handle URL-encoded paths (spaces as %20)
- verified all CLI commands work correctly: version, help, init, list patterns, list templates
- successfully tested local development workflow with npm link

### Documentation Updates

- created comprehensive getting started guide (docs/GETTING-STARTED.md) with installation, first analysis, custom patterns, troubleshooting
- updated README.md with detailed installation steps and expanded troubleshooting section
- added build and development setup instructions to ARCHITECTURE.md
- documented common build issues and solutions (pnpm installation, TypeScript errors, ESM modules)
- added troubleshooting guide covering installation, configuration, analysis, runtime, and performance issues
- included workflow examples for different use cases (specific directories, budgets, models, git repos)
- documented how to create custom patterns and templates with complete examples
- added tips for success section with best practices
- created step-by-step guide from zero to first analysis

### Initial Implementation

- implemented complete project structure with TypeScript, tsup, biome configuration
- created zod-based type definitions and schemas for config, patterns, templates, and results
- built pattern system with loader, validator, and built-in patterns (typography, color)
- built template system with loader, validator, interpolator, and built-in template (typography-audit)
- implemented utility modules: logger, filesystem helpers, git operations, caching system
- created repo handler for local and git-based codebase access with file operations
- created context handler for loading design system documentation from git or local sources
- implemented tool registry exposing six LLM function calling tools (list_files, read_files, search_code, get_dependencies, read_context_doc, finish_analysis)
- built core agentic analyzer with exploration loop, token tracking, and budget controls
- created CLI with four commands: analyze (main analysis), init (interactive setup), validate (check YAML files), list (show available patterns/templates)
- added CLI UI components with progress indicators, result display, and interactive prompts using @clack/prompts
- wrote comprehensive README with quick start, concepts, examples, and troubleshooting
- created example configuration file demonstrating all options
- integrated OpenAI API with GPT-4 Turbo for intelligent codebase exploration
- implemented caching for cloned repositories and analysis results to reduce costs
- added variable interpolation in templates for dynamic prompt generation
- set up proper module exports and TypeScript configuration for ESM

