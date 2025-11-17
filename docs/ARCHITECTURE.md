# pd-scout Architecture

> **Technical deep dive for contributors and advanced users**

This document explains pd-scout's architecture, design decisions, and technical patterns. For plain-English explanations, see [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

---

## Table of Contents

1. [Mission & Design Principles](#mission--design-principles)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [The Agentic Pattern](#the-agentic-pattern)
6. [Data Models & Types](#data-models--types)
7. [Extension System](#extension-system)
8. [Future Architecture](#future-architecture)
9. [Build & Development](#build--development)
10. [Design Decisions](#design-decisions)

---

## Mission & Design Principles

### Mission

pd-scout helps design systems teams understand how their design system is being adopted across real-world codebases through intelligent, context-aware analysis.

### Core Principles

1. **Extensibility without code changes** - Users should be able to create custom patterns and templates using YAML, not TypeScript
2. **Intelligence over rules** - Use LLM reasoning to understand context, not rigid pattern matching
3. **Cost-aware** - Track token usage, provide budget controls, estimate costs upfront
4. **Fork-friendly** - Teams should easily fork and customize for their design system
5. **Progressive complexity** - Simple for basic use cases, powerful for advanced ones

### What Makes pd-scout Unique

Unlike traditional linters (ESLint, Stylelint) that apply fixed rules:

- **Context-aware:** Understands codebase structure (legacy vs. active code)
- **Pattern recognition:** Finds patterns humans might miss
- **Prioritization:** Ranks findings by impact, not just occurrence
- **Adaptive:** Exploration strategy changes based on what it discovers

---

## Technology Stack

### Core Runtime
- **Node.js 18+** - Modern async/await, ES modules, performance
- **TypeScript 5+** - Type safety, inference, strict mode
- **pnpm** - Fast, disk-efficient package management
- **tsup** - Fast TypeScript bundling (replaced tsc for production builds)

**Why tsup over tsc?**
- Faster builds (bundling + transpilation in one step)
- Handles asset copying (YAML files)
- Better ESM support

### CLI & UI
- **commander** - Battle-tested CLI framework
- **@clack/prompts** - Beautiful, modern terminal UI
- **ora** - Spinners and progress indicators

### Data & Validation
- **zod** - Runtime schema validation + TypeScript types
- **cosmiconfig** - Standard config file discovery (`.pd-scout.yaml`, `package.json`, etc.)
- **yaml** - Official YAML parser
- **ajv** - JSON Schema validation for patterns/templates

**Why Zod?**
- Single source of truth: define schema once, get TypeScript types and runtime validation
- Better error messages than plain TypeScript
- Used throughout: config, patterns, templates, API responses

### LLM & Analysis
- **@openai/openai** - Official OpenAI SDK
- **tiktoken** - Accurate token counting (OpenAI's tokenizer)
- **Custom cost tracking** - Calculate costs based on model pricing

### File Operations
- **simple-git** - Clone and scan git repositories
- **globby** - Advanced glob patterns (respects .gitignore)
- **pathe** - Cross-platform path operations (Windows compatibility)
- **Node fs/promises** - Async-first file operations

### Development
- **vitest** - Fast, modern test runner (Jest-compatible API)
- **biome** - All-in-one linter/formatter (faster than ESLint + Prettier)
- **tsc --noEmit** - Type checking only

**Why biome over ESLint?**
- Single tool for linting + formatting
- 10-100x faster
- Zero config needed for TypeScript projects

---

## Project Structure

```
pd-scout/
├── src/                              # Source code
│   ├── cli/                          # CLI interface layer
│   │   ├── index.ts                  # Main entry (commander setup)
│   │   ├── commands/                 # Command implementations
│   │   │   ├── analyze.ts            # Main analysis command
│   │   │   ├── init.ts               # Interactive config creation
│   │   │   ├── list.ts               # List patterns/templates
│   │   │   └── validate.ts           # Validate YAML files
│   │   └── ui/                       # Terminal UI components
│   │       ├── progress.ts           # Spinners, progress bars
│   │       ├── results.ts            # Result formatting/display
│   │       └── prompts.ts            # Interactive prompts
│   │
│   ├── core/                         # Business logic (the brain)
│   │   ├── analyzer.ts               # Agentic exploration loop
│   │   ├── tools.ts                  # Tool registry for LLM
│   │   ├── repo-handler.ts           # Git + file operations
│   │   └── context-handler.ts        # Design system doc loading
│   │
│   ├── patterns/                     # Pattern system
│   │   ├── loader.ts                 # Discover and load patterns
│   │   ├── validator.ts              # Zod schema validation
│   │   ├── types.ts                  # Type definitions
│   │   └── builtin/                  # Shipped patterns
│   │       ├── typography.yaml
│   │       └── color.yaml
│   │
│   ├── templates/                    # Template system
│   │   ├── loader.ts                 # Discover and load templates
│   │   ├── validator.ts              # Zod schema validation
│   │   ├── interpolator.ts           # Variable substitution
│   │   ├── types.ts                  # Type definitions
│   │   └── builtin/                  # Shipped templates
│   │       └── typography-audit.yaml
│   │
│   ├── models/                       # Data models (Zod schemas)
│   │   ├── config.ts                 # Configuration schema
│   │   ├── results.ts                # Analysis result types
│   │   ├── pattern.ts                # Pattern schema
│   │   └── template.ts               # Template schema
│   │
│   └── utils/                        # Shared utilities
│       ├── logger.ts                 # Logging (debug, info, error)
│       ├── cache.ts                  # Repository & result caching
│       ├── git.ts                    # Git helpers
│       └── fs.ts                     # File system helpers
│
├── patterns/                         # User custom patterns
├── templates/                        # User custom templates
├── dist/                             # Compiled output (tsup)
├── docs/                             # Documentation
├── .pd-scout.yaml                    # Example configuration
├── package.json
├── tsconfig.json
└── biome.json
```

### Layered Architecture

```
┌─────────────────────────────────────┐
│   CLI Layer (terminal interface)   │
│   - Commands                        │
│   - UI formatting                   │
│   - User interaction                │
└────────────┬────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────┐
│   Core Layer (business logic)      │
│   - Agentic analyzer                │
│   - Tool registry                   │
│   - Repo handler                    │
└────────────┬────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────┐
│   Data Layer (models & validation)  │
│   - Zod schemas                     │
│   - Type definitions                │
│   - Result formatting               │
└─────────────────────────────────────┘
```

**Dependency rules:**
- CLI can import from Core and Data
- Core can import from Data
- Data has no dependencies on CLI or Core
- No circular dependencies

---

## Core Components

### 1. Agentic Analyzer

**File:** `src/core/analyzer.ts`

The heart of pd-scout. Implements the agentic exploration pattern where the LLM decides what to do next based on what it learns.

#### Key Responsibilities

1. **Initialize conversation** with system prompt (LLM's "job description")
2. **Run exploration loop** where LLM decides which tools to use
3. **Track token usage** and enforce budget limits
4. **Handle tool calls** by delegating to ToolRegistry
5. **Force completion** when budget or round limits are reached
6. **Return structured results** from LLM findings

#### Flow Diagram

```
┌─────────────────────────────────────┐
│ 1. Build System Prompt              │
│    (from template + config)         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Initialize Conversation          │
│    history = [                      │
│      { role: 'system', ... },       │
│      { role: 'user', ... }          │
│    ]                                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Exploration Loop                 │
│    for (round < maxRounds):         │
│      - Call OpenAI API              │
│      - Get LLM response             │
│      - If tool calls:               │
│        - Execute tools              │
│        - Add results to history     │
│      - If finished: return results  │
│      - If budget exceeded: force end│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. Parse & Return Results           │
│    {                                │
│      opportunities: [...],          │
│      patterns: [...],               │
│      summary: "...",                │
│      usage: { tokens, cost }        │
│    }                                │
└─────────────────────────────────────┘
```

#### Code Structure

```typescript
export class AgenticAnalyzer {
  private client: OpenAI;
  private config: Config;
  private pattern: LoadedPattern;
  private template: LoadedTemplate;
  private tools: ToolRegistry;
  private history: ChatCompletionMessageParam[] = [];
  private usage: UsageMetrics = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
    rounds: 0,
  };

  constructor(
    config: Config,
    pattern: LoadedPattern,
    template: LoadedTemplate,
    repoHandler: RepoHandler,
    contextHandler?: ContextHandler
  ) {
    this.client = new OpenAI({ apiKey: config.analysis.apiKey });
    this.config = config;
    this.pattern = pattern;
    this.template = template;
    this.tools = new ToolRegistry(repoHandler, contextHandler);
  }

  async analyze(): Promise<AnalysisResult> {
    // 1. Build prompts with variable interpolation
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt();

    // 2. Initialize conversation
    this.history = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 3. Run exploration loop
    await this.explorationLoop();

    // 4. Return results
    return this.buildAnalysisResult();
  }

  private async explorationLoop(): Promise<void> {
    for (let round = 0; round < this.config.analysis.maxRounds; round++) {
      this.usage.rounds = round + 1;

      // Call OpenAI with available tools
      const response = await this.client.chat.completions.create({
        model: this.config.analysis.model,
        messages: this.history,
        tools: this.tools.getDefinitions(),
        tool_choice: 'auto', // LLM decides when to use tools
      });

      // Track tokens for budget control
      if (response.usage) {
        this.usage.totalTokens += response.usage.total_tokens;
        this.usage.completionTokens += response.usage.completion_tokens;
        this.usage.estimatedCost = this.calculateCost(this.usage);
      }

      const message = response.choices[0]?.message;
      this.history.push(message);

      // Execute any tool calls
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const result = await this.tools.execute(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );

          this.history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Check if LLM called finish_analysis
      if (this.tools.isFinished()) return;

      // Budget control
      if (this.usage.totalTokens > this.config.analysis.tokenBudget * 0.8) {
        return this.forceCompletion();
      }
    }

    // Max rounds reached
    return this.forceCompletion();
  }
}
```

**Design decisions:**

- **Why conversation history?** LLM needs context from previous rounds to make informed decisions
- **Why budget control?** Prevent runaway costs if LLM gets stuck in a loop
- **Why force completion?** Ensure we always get results even if incomplete
- **Why track rounds?** Help debug analysis behavior and set appropriate limits

---

### 2. Tool Registry

**File:** `src/core/tools.ts`

Provides the LLM with function calling tools to interact with the codebase.

#### Available Tools

| Tool | Purpose | When LLM Uses It |
|------|---------|------------------|
| `list_files` | Browse repository structure | First step to understand codebase |
| `read_files` | Read file contents | When it needs to see actual code |
| `search_code` | Find pattern occurrences | To quantify how widespread a pattern is |
| `get_dependencies` | See package.json deps | To know what libraries are available |
| `list_context_docs` | List design system docs | To discover available reference material |
| `read_context_doc` | Read specific doc | To verify recommendations against design system |
| `finish_analysis` | Return findings | When analysis is complete |

#### Tool Definition Pattern

Each tool follows OpenAI's function calling format:

```typescript
{
  type: 'function',
  function: {
    name: 'tool_name',
    description: 'Clear description for LLM to understand when to use this',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '...' },
        param2: { type: 'number', description: '...' }
      },
      required: ['param1']
    }
  }
}
```

#### Code Structure

```typescript
export class ToolRegistry {
  private repoHandler: RepoHandler;
  private contextHandler?: ContextHandler;
  private finishCalled = false;
  private analysisResults: unknown = null;

  // Get all tool definitions for OpenAI
  getDefinitions(): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [
      this.listFilesTool(),
      this.readFilesTool(),
      this.searchCodeTool(),
      this.getDependenciesTool(),
      this.finishAnalysisTool(),
    ];

    if (this.contextHandler) {
      tools.push(this.listContextDocsTool(), this.readContextDocTool());
    }

    return tools;
  }

  // Execute a tool call from the LLM
  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'list_files':
        return this.repoHandler.listFiles(args.pattern as string);
      
      case 'read_files':
        return this.repoHandler.readFiles(args.files as string[]);
      
      case 'search_code':
        return this.repoHandler.searchCode(
          args.pattern as string,
          args.filePattern as string
        );
      
      case 'finish_analysis':
        this.finishCalled = true;
        this.analysisResults = args;
        return { status: 'Analysis complete' };
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  isFinished(): boolean {
    return this.finishCalled;
  }

  getResults(): unknown {
    return this.analysisResults;
  }
}
```

**Design decisions:**

- **Why separate tools from analyzer?** Single responsibility - analyzer orchestrates, tools execute
- **Why tool registry pattern?** Easy to add new tools without modifying analyzer
- **Why pass handlers?** Tools delegate to specialized handlers (repo, context) for actual operations

---

### 3. Repository Handler

**File:** `src/core/repo-handler.ts`

Manages access to code repositories (local or remote).

#### Responsibilities

1. **Clone git repositories** (with caching)
2. **List files** matching glob patterns
3. **Read file contents**
4. **Search code** for patterns
5. **Get dependencies** from package.json

#### Git Repository Handling

```typescript
export class RepoHandler {
  static async init(repoUrlOrPath: string, cache?: Cache): Promise<RepoHandler> {
    let actualPath = repoUrlOrPath;

    // If it's a Git URL, clone it
    if (isGitUrl(repoUrlOrPath)) {
      const dirName = urlToDirectoryName(repoUrlOrPath);
      const cacheDir = cache?.getRepoPath(dirName);

      // Use cached copy if available
      if (cacheDir && cache && (await cache.hasRepo(dirName))) {
        logger.info(`Using cached repository: ${dirName}`);
        actualPath = cacheDir;
      } else if (cacheDir) {
        logger.info(`Cloning repository: ${repoUrlOrPath}`);
        actualPath = await cloneRepo(repoUrlOrPath, cacheDir, { depth: 1 });
      }
    }

    return new RepoHandler(actualPath, cache);
  }

  async listFiles(pattern: string | string[]): Promise<string[]> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    
    return await globby(patterns, {
      cwd: this.repoPath,
      gitignore: true, // Respect .gitignore files
      absolute: false,  // Return relative paths
    });
  }

  async readFiles(files: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const file of files) {
      const fullPath = join(this.repoPath, file);
      if (await exists(fullPath)) {
        results[file] = await readText(fullPath);
      }
    }
    
    return results;
  }

  async searchCode(pattern: string, filePattern?: string): Promise<SearchResult[]> {
    // Use globby to get files, then regex search within them
    const files = await this.listFiles(filePattern || '**/*');
    const results: SearchResult[] = [];

    for (const file of files) {
      const content = await this.readFile(file);
      const lines = content.split('\n');
      const regex = new RegExp(pattern, 'g');

      lines.forEach((line, index) => {
        if (regex.test(line)) {
          results.push({
            file,
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    return results;
  }
}
```

**Design decisions:**

- **Why cache cloned repos?** Avoid re-cloning on every analysis (saves time and bandwidth)
- **Why shallow clones?** (`depth: 1`) - We only need current code, not history
- **Why respect .gitignore?** Avoid analyzing generated code, dependencies, build artifacts
- **Why relative paths?** Portable results that work regardless of where repo is cloned

---

### 4. Pattern & Template Loaders

**Files:** `src/patterns/loader.ts`, `src/templates/loader.ts`

Discover, load, and validate patterns and templates from multiple sources.

#### Loading Priority

1. **User patterns** - `./patterns/` in current directory
2. **Built-in patterns** - Shipped with pd-scout
3. **Explicit paths** - Full file paths provided

This allows users to override built-in patterns with their own.

#### Pattern Loading Flow

```
pd-scout analyze --pattern typography
           │
           ▼
PatternLoader.load('typography')
           │
           ├─> Try: ./patterns/typography.yaml
           │   └─> Found? ✓ Load it
           │
           ├─> Try: dist/patterns/builtin/typography.yaml
           │   └─> Found? ✓ Load it
           │
           └─> Try: typography (as file path)
               └─> Found? ✓ Load it
               └─> Not found? ✗ Throw error
```

#### Code Structure

```typescript
export class PatternLoader {
  async load(nameOrPath: string): Promise<LoadedPattern> {
    // Try user patterns first
    const userPath = join(this.patternsDir, `${nameOrPath}.yaml`);
    if (await exists(userPath)) {
      return this.loadFromFile(userPath);
    }

    // Try built-in patterns
    const builtInPath = join(this.builtInDir, `${nameOrPath}.yaml`);
    if (await exists(builtInPath)) {
      return this.loadFromFile(builtInPath);
    }

    // Try as explicit file path
    if (await exists(nameOrPath)) {
      return this.loadFromFile(nameOrPath);
    }

    throw new Error(`Pattern not found: ${nameOrPath}`);
  }

  private async loadFromFile(filePath: string): Promise<LoadedPattern> {
    const content = await readText(filePath);
    const data = parseYAML(content);

    // Validate against Zod schema
    const pattern = this.validator.validate(data);

    return {
      ...pattern,
      source: filePath,
    };
  }
}
```

**Design decisions:**

- **Why YAML over JSON?** More human-friendly, supports comments, less syntax noise
- **Why validation?** Catch errors early with helpful messages before LLM sees malformed data
- **Why built-in + user patterns?** Users can start immediately but also customize

---

## The Agentic Pattern

### What is "Agentic"?

Traditional tools follow fixed recipes:

```python
# Traditional approach: hardcoded steps
def analyze():
    files = list_files("**/*.tsx")
    for file in files:
        if "fontSize:" in read_file(file):
            flag_error(file)
```

Agentic approach: LLM decides the strategy:

```
# Agentic approach: LLM plans dynamically
Round 1: LLM decides "Let me list files first"
         → Calls list_files("**/*.tsx")
         → Sees 200 files

Round 2: LLM thinks "Too many to read all. Let me search first"
         → Calls search_code("fontSize:")
         → Finds 47 matches

Round 3: LLM thinks "Let me sample a few to understand patterns"
         → Calls read_files([sample files])
         → Sees some use tokens, some don't

Round 4: LLM concludes "I've seen the pattern"
         → Calls finish_analysis([findings])
```

### Why Agentic Works Better

**Adaptability:** Different codebases need different strategies
- Small codebase → Read all files
- Large codebase → Sample strategically
- Monorepo → Analyze by workspace

**Pattern Recognition:** LLM can spot patterns humans miss
- "These 20 files all use the same hardcoded color - might be a shared constant"
- "This file has 50 violations but it's in /legacy - lower priority"
- "These values match the design system but aren't using tokens - quick wins"

**Context:** LLM understands relationships
- "Button uses Text component, Text uses tokens, so Button indirectly uses tokens"
- "This pattern only appears in marketing pages, not product"

### Trade-offs

**Advantages:**
- More intelligent analysis
- Finds nuanced patterns
- Adapts to codebase structure
- Can explain reasoning

**Disadvantages:**
- Non-deterministic (results may vary)
- Slower (minutes not seconds)
- Costs money (API calls)
- Requires prompt engineering

---

## Data Models & Types

All data models use Zod for runtime validation and TypeScript type generation.

### Configuration Schema

**File:** `src/models/config.ts`

```typescript
export const ConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    designSystem: z.string().default('Design System'),
    repo: z.string().optional(),
  }),
  
  analysis: z.object({
    tokenBudget: z.number().default(100000),
    maxRounds: z.number().default(10),
    model: z.string().default('gpt-4-turbo'),
    apiKey: z.string().optional(),
  }),
  
  context: z.array(ContextSourceSchema).optional(),
  
  paths: z.object({
    patterns: z.string().default('./patterns'),
    templates: z.string().default('./templates'),
    output: z.string().default('./output'),
  }),
  
  cache: z.object({
    enabled: z.boolean().default(true),
    directory: z.string().default('./.pd-scout-cache'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### Pattern Schema

**File:** `src/models/pattern.ts`

```typescript
export const PatternSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  
  filePatterns: z.array(z.string()),
  
  searchPatterns: z.record(
    z.array(z.object({
      pattern: z.string(),
      description: z.string(),
    }))
  ),
  
  categories: z.array(z.object({
    id: z.string(),
    label: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
});

export type Pattern = z.infer<typeof PatternSchema>;
```

### Analysis Result Schema

**File:** `src/models/results.ts`

```typescript
export const AnalysisResultSchema = z.object({
  metadata: z.object({
    projectName: z.string(),
    designSystem: z.string(),
    template: z.string(),
    pattern: z.string(),
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
  
  config: z.object({
    model: z.string(),
    tokenBudget: z.number(),
    maxRounds: z.number(),
    filePatterns: z.array(z.string()),
  }),
  
  results: z.object({
    opportunities: z.array(z.record(z.unknown())),
    patterns: z.array(z.record(z.unknown())),
    summary: z.string(),
  }),
  
  usage: z.object({
    totalTokens: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    estimatedCost: z.number(),
    rounds: z.number(),
  }),
  
  status: z.enum(['complete', 'partial', 'error']),
  error: z.string().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
```

**Why Zod for everything?**
- Single source of truth: schema is documentation
- Runtime validation catches bad data early
- TypeScript types auto-generated
- Better error messages than plain TypeScript

---

## Extension System

### Creating Custom Patterns

Users can extend pd-scout without modifying code:

```yaml
# patterns/my-pattern.yaml
name: spacing
description: Find spacing inconsistencies

filePatterns:
  - "**/*.tsx"
  - "**/*.css"

searchPatterns:
  typescript:
    - pattern: "margin:|padding:"
      description: "Inline spacing values"
  css:
    - pattern: "margin:|padding:"
      description: "CSS spacing"

categories:
  - id: not_using_tokens
    label: "Not Using Spacing Tokens"
    priority: high
  - id: using_tokens
    label: "Using Spacing Tokens"
    priority: low
```

**Use it:**
```bash
pd-scout analyze --pattern spacing
```

### Creating Custom Templates

```yaml
# templates/my-audit.yaml
name: spacing-audit
pattern: spacing

systemPrompt: |
  You are analyzing {projectName} for spacing consistency.
  
  Your goal: Find all spacing usage and categorize by adoption level.
  
  Focus on:
  - Inline margin/padding values
  - CSS spacing classes
  - Component spacing props
  
  Prioritize files with the most violations.

userPromptTemplate: |
  Analyze spacing patterns in this codebase.
  Report findings with specific line numbers.

variables:
  priorityThreshold: 5

outputSchema:
  fields:
    - name: file
      type: string
      required: true
    - name: lines
      type: string
      required: true
    - name: category
      type: string
      required: true
    - name: current
      type: string
      required: true
    - name: suggested
      type: string
      required: true
```

**Use it:**
```bash
pd-scout analyze --template spacing-audit
```

### Why This Works

1. **No code changes needed** - Users edit YAML, not TypeScript
2. **Validated** - Zod schemas catch errors early
3. **Composable** - Mix and match patterns + templates
4. **Shareable** - Commit patterns to team repo
5. **Fork-friendly** - Customize for your design system

---

## Future Architecture

When web UI is added, pd-scout will be refactored into a monorepo:

```
pd-scout/
├── packages/
│   ├── core/              # Shared business logic
│   │   ├── analyzer/      # Agentic engine
│   │   ├── tools/         # Tool registry
│   │   ├── patterns/      # Pattern system
│   │   └── models/        # Data models
│   │
│   ├── cli/               # Terminal interface
│   │   ├── commands/      # CLI commands
│   │   └── ui/            # Terminal UI
│   │
│   └── web/               # Browser interface
│       ├── app/           # Next.js routes
│       ├── components/    # React components
│       └── server/        # API + database
```

**Key principles for migration:**

1. **Core stays pure** - No CLI or React dependencies
2. **CLI and Web share core** - Same analysis engine
3. **Unidirectional dependencies** - Core ← CLI, Core ← Web, never reversed
4. **Independent deployment** - CLI via npm, Web via Vercel

See [mission-rules.mdc](../.cursor/rules/mission-rules.mdc) for full details on the future architecture.

---

## Build & Development

### Build Process

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# What happens:
# 1. tsup compiles src/ → dist/
# 2. Copies YAML files (patterns, templates)
# 3. Adds shebang to CLI entry point
# 4. Generates type definitions (.d.ts files)
```

### Build Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "declaration": true,
    "sourceMap": true
  }
}
```

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  onSuccess: 'node scripts/post-build.js', // Copy YAML files
});
```

**Why ESM only?**
- Modern Node.js standard
- Better tree-shaking
- Native browser support (future web UI)
- All dependencies support ESM now

### Development Workflow

```bash
# Development mode (watch)
pnpm dev

# Link globally for testing
npm link
pd-scout --version

# Run linter
pnpm lint

# Run formatter
pnpm format

# Type check
pnpm type-check

# Run tests (when they exist!)
pnpm test
```

### Testing Strategy (Future)

Currently no tests (help wanted!). Planned structure:

```
src/
├── core/
│   ├── __tests__/
│   │   ├── analyzer.test.ts        # Unit tests
│   │   ├── tools.test.ts
│   │   └── integration/
│   │       └── full-flow.test.ts   # Integration tests
│   ├── analyzer.ts
│   └── tools.ts
```

**Test priorities:**
1. Core business logic (analyzer, tools)
2. Pattern/template loaders
3. CLI commands (integration)

**Challenges:**
- Mocking OpenAI API (use fixtures)
- Mocking file system
- Deterministic testing of non-deterministic LLM

---

## Design Decisions

### Why TypeScript Over JavaScript?

- **Type safety** - Catch errors at compile time
- **Better IDE support** - Autocomplete, refactoring
- **Self-documenting** - Types explain what functions expect
- **Zod integration** - Runtime validation + compile-time types

### Why pnpm Over npm/yarn?

- **Faster installs** - Symlinks to global store
- **Disk efficient** - Shared dependencies across projects
- **Strict** - Prevents phantom dependencies
- **Workspace support** - Ready for future monorepo

### Why OpenAI API Over Local Models?

**Current state:** OpenAI only (gpt-4-turbo)

**Reasons:**
- **Quality** - GPT-4 understands code better than smaller models
- **Reliability** - Consistent API, good uptime
- **Function calling** - Native tool support
- **Speed** - Fast enough for interactive use

**Future:** Support Claude (better for long contexts), Ollama (privacy, cost)

### Why Agentic Over Fixed Rules?

**Fixed rules:**
```typescript
// Simple but inflexible
if (hasInlineFontSize && !usesTokens) {
  report("Use design tokens");
}
```

**Agentic:**
```
LLM: "I see inline fontSize in Button.tsx line 23"
LLM: "Let me check if design tokens are imported"
LLM: "They are! Suggest using tokens.typography.body"
LLM: "This is high priority - Button is used everywhere"
```

**Why agentic wins:**
- Understands context (what's imported, what's available)
- Recognizes patterns (common violations, quick wins)
- Prioritizes intelligently (impact vs. effort)
- Explains reasoning (not just "error on line 23")

**Trade-off:** Cost and non-determinism

### Why YAML Over JSON for Patterns?

- **Human-friendly** - Less syntax noise
- **Comments** - Document pattern intent
- **Multiline strings** - Better for prompts
- **Standard** - Used by Docker, Kubernetes, CI systems

### Why CLI First, Web Later?

**Philosophy:** Start simple, add complexity when needed

**CLI advantages:**
- Faster to build
- Easier to test
- Works in CI/CD
- No deployment needed

**Web UI when:**
- Non-technical users need access
- Team collaboration features needed
- Visual browsing adds value
- Historical tracking matters

---

## Performance Considerations

### Token Usage

**Typical analysis:**
- Small codebase (< 50 files): 25,000-50,000 tokens ($0.50-$1.50)
- Medium codebase (50-200 files): 50,000-150,000 tokens ($1.50-$4.50)
- Large codebase (200+ files): 150,000-300,000 tokens ($4.50-$9.00)

**Optimization strategies:**
1. **Pre-search** - Use regex to narrow file list before LLM sees it
2. **Sampling** - Read representative files, not all files
3. **Caching** - Store repository clones
4. **Budget limits** - Force completion before runaway costs

### Analysis Speed

**Bottlenecks:**
1. **OpenAI API latency** - 2-10s per round
2. **File I/O** - Reading many files
3. **Git cloning** - First run only (cached after)

**Typical timings:**
- Configuration loading: < 1s
- Repository cloning: 5-30s (first time only)
- Analysis loop: 30s-3min (depends on rounds)
- Result formatting: < 1s

**Total:** 1-5 minutes for typical analysis

---

## Security Considerations

### API Keys

- Never commit API keys to git
- Use environment variables or config files
- Config files should be in .gitignore

### Repository Access

- Shallow clones only (no git history)
- Respect .gitignore (don't analyze sensitive files)
- Cache directory should be in .gitignore

### LLM Prompts

- Never include secrets in prompts (they're sent to OpenAI)
- Sanitize file contents if analyzing sensitive codebases
- Consider self-hosted models for sensitive projects (future)

---

## Contributing Guide

### Adding a New Tool

1. Define in `src/core/tools.ts`:
   ```typescript
   private myNewTool(): ChatCompletionTool {
     return {
       type: 'function',
       function: {
         name: 'my_tool',
         description: '...',
         parameters: { ... }
       }
     };
   }
   ```

2. Add to `getDefinitions()`:
   ```typescript
   getDefinitions() {
     return [
       ...,
       this.myNewTool(),
     ];
   }
   ```

3. Implement in `execute()`:
   ```typescript
   case 'my_tool':
     return this.customHandler(args);
   ```

4. Add tests (future)
5. Document in HOW-IT-WORKS.md

### Adding a Built-in Pattern

1. Create YAML in `src/patterns/builtin/`:
   ```yaml
   name: my-pattern
   filePatterns: ["**/*.tsx"]
   searchPatterns: { ... }
   categories: [ ... ]
   ```

2. Validate:
   ```bash
   pd-scout validate patterns/my-pattern.yaml
   ```

3. Test with real codebase
4. Document in README.md

### Code Style

Follow [general-rules.mdc](../.cursor/rules/general-rules.mdc):
- TypeScript strict mode
- Named exports only (no default exports)
- Descriptive variable names
- Comments explain "why" not "what"
- Use Zod for validation

---

## Glossary

**Agentic:** An approach where the LLM decides its own exploration strategy, rather than following fixed steps.

**Pattern:** A YAML file defining what to search for (file types, search patterns, categories).

**Template:** A YAML file defining how to analyze a pattern (system prompt, output schema).

**Tool:** A function the LLM can call (list files, read files, search code, etc.).

**Token:** A unit of text processed by the LLM (~4 characters). Used for cost calculation.

**Budget:** Maximum number of tokens to spend on an analysis.

**Round:** One iteration of the agentic loop (LLM decides → executes tools → decides again).

**Design System:** A collection of reusable components, tokens, and patterns used consistently across UIs.

---

## Further Reading

- [HOW-IT-WORKS.md](HOW-IT-WORKS.md) - Plain-English explanation for non-technical users
- [GETTING-STARTED.md](GETTING-STARTED.md) - Step-by-step setup guide
- [mission-rules.mdc](../.cursor/rules/mission-rules.mdc) - Mission and architecture for LLM agents
- [general-rules.mdc](../.cursor/rules/general-rules.mdc) - Code style and conventions

---

**Questions or ideas?** Open an issue or PR! pd-scout is designed to be forked and customized for your team's design system.
