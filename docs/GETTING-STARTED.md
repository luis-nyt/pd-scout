# Getting Started with pd-scout

> Complete guide from installation to your first analysis

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **OpenAI API key** ([get one here](https://platform.openai.com/api-keys))
- A codebase to analyze (local or Git URL)

## Installation

**Note:** pd-scout is currently not published to npm. You need to build it from source.

### Step 1: Install pnpm (Package Manager)

pd-scout uses `pnpm` for fast, efficient package management.

```bash
npm install -g pnpm
```

Verify installation:
```bash
pnpm --version
# Should show: 10.x.x or higher
```

### Step 2: Build and Install pd-scout

**Important:** pd-scout is not published to npm yet, so you need to build from source.

```bash
# Navigate to where you cloned/downloaded pd-scout
cd /path/to/pd-scout

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link globally so you can use 'pd-scout' from anywhere
npm link
```

Verify it works:
```bash
pd-scout --version
# Should show: 1.0.0
```

### Step 3: Set Up OpenAI API Key

pd-scout uses OpenAI's GPT-4 for intelligent analysis.

**Option A: Environment Variable (Recommended)**

```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY=sk-your-key-here

# Reload shell
source ~/.zshrc  # or source ~/.bashrc
```

**Option B: Configuration File**

Add to `.pd-scout.yaml`:
```yaml
analysis:
  apiKey: "sk-your-key-here"  # Not recommended for shared repos
```

**Option C: .env File**

Create `.env` in your project:
```
OPENAI_API_KEY=sk-your-key-here
```

## Quick Start

**Prerequisites:** Make sure you've completed the installation steps above (built pd-scout and linked it).

### 1. Initialize Configuration

Navigate to your project directory:

```bash
cd /path/to/your/project
pd-scout init
```

This will prompt you for:
- **Project name**: Your app name
- **Design system name**: e.g., "MyDesignSystem"
- **Repository path**: Local path or Git URL (optional)
- **Token budget**: Default 100,000 (≈ $2-5)

Creates `.pd-scout.yaml`:
```yaml
project:
  name: "my-app"
  designSystem: "MyDesignSystem"
  repo: "./src"

analysis:
  tokenBudget: 100000
  maxRounds: 10
  model: "gpt-4-turbo"

paths:
  patterns: "./patterns"
  templates: "./templates"
  output: "./output"

cache:
  enabled: true
  directory: "./.pd-scout-cache"
```

### 2. Run Your First Analysis

**Dry Run First** (See cost estimate without spending):

```bash
pd-scout analyze --template typography-audit --dry-run
```

Output:
```
📊 Dry Run - Cost Estimate:
  Model: gpt-4-turbo
  Token budget: 100,000
  Max rounds: 10
  Estimated max cost: $3.00
```

**Run Analysis**:

```bash
pd-scout analyze --template typography-audit
```

Watch the progress:
```
⏳ Loading template and pattern...
✅ Template loaded
⏳ Initializing repository...
✅ Repository ready: /path/to/your/project
⏳ Running agentic analysis...
✅ Analysis complete
✅ Results saved to: output/2024-11-08_typography-audit.json
```

### 3. View Results

Results are saved as JSON:

```bash
# Pretty print
cat output/*.json | jq .

# Or open in your editor
code output/*.json
```

## Your First Custom Pattern

Let's create a pattern to find hardcoded animations:

### 1. Create Pattern File

```bash
mkdir -p patterns
```

Create `patterns/animation.yaml`:

```yaml
name: animation
description: "Find custom animations that should use motion system"
version: 1.0.0

filePatterns:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.css"
  - "**/*.scss"

searchPatterns:
  typescript:
    - pattern: "transition:"
      description: "CSS transitions"
      category: "custom-transition"
    
    - pattern: "@keyframes"
      description: "CSS animations"
      category: "custom-animation"
    
    - pattern: "animate\\("
      description: "JS animations"
      category: "js-animation"

categories:
  - id: custom_animation
    label: "❌ Custom Animation"
    description: "Should use motion system tokens"
    priority: high
  
  - id: using_motion_system
    label: "✅ Using Motion System"
    description: "Properly using motion tokens"
    priority: low

author: "Your Team"
tags:
  - animation
  - motion
  - transitions
```

### 2. Create Template File

Create `templates/animation-audit.yaml`:

```yaml
name: animation-audit
description: "Audit animation usage"
version: 1.0.0
pattern: animation

systemPrompt: |
  You are analyzing {projectName} for animation and motion usage.
  
  Find all animations, transitions, and motion effects.
  Categorize by whether they use the motion system.
  
  Strategy:
  1. List files to understand structure
  2. Search for animation patterns
  3. Read examples to understand usage
  4. Categorize each finding
  5. Suggest motion system alternatives

userPromptTemplate: |
  Analyze animation usage in this codebase.
  
  Focus on:
  - CSS transitions and animations
  - JavaScript animation libraries
  - Spring/easing values
  
  Provide recommendations for using {designSystem} motion tokens.

strategy:
  - "Search for transition and animation patterns"
  - "Check if motion tokens are imported"
  - "Identify hardcoded timing values"
  - "Suggest motion system tokens"

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
    - name: description
      type: string
      required: true
    - name: current
      type: string
      required: true
    - name: suggested
      type: string
      required: true

variables:
  focusAreas: "transitions, animations, motion"
```

### 3. Run Custom Analysis

```bash
pd-scout analyze --template animation-audit --dry-run
```

Then:
```bash
pd-scout analyze --template animation-audit
```

## Common Workflows

### Analyze Specific Directory

```bash
pd-scout analyze \
  --template typography-audit \
  --repo ./src/features/checkout
```

### Use Different Budget

```bash
# Quick scan ($0.50-1.00)
pd-scout analyze -t typography-audit --budget 25000

# Deep dive ($5-15)
pd-scout analyze -t typography-audit --budget 300000
```

### Use Different Model

```bash
# Cheaper, faster (but less accurate)
pd-scout analyze -t typography-audit --model gpt-3.5-turbo

# More expensive, more thorough
pd-scout analyze -t typography-audit --model gpt-4
```

### Analyze Git Repository

```bash
pd-scout analyze \
  --template typography-audit \
  --repo https://github.com/your-org/your-repo
```

### Include Design System Docs

Edit `.pd-scout.yaml`:

```yaml
context:
  - url: "@https://github.com/your-org/design-system"
    type: "design-system"
    docPaths:
      - "docs/**/*.md"
      - "docs/**/*.mdx"
```

Now the LLM can read your design system docs to make better recommendations!

## Understanding Results

### Result Structure

```json
{
  "metadata": {
    "projectName": "my-app",
    "designSystem": "MyDesignSystem",
    "template": "typography-audit",
    "pattern": "typography",
    "timestamp": "2024-11-08T10:30:00Z",
    "duration": 45000  // milliseconds
  },
  "results": {
    "opportunities": [
      {
        "file": "components/Button.tsx",
        "lines": "23",
        "category": "explicit_non_adoption",
        "description": "Hardcoded font size instead of design token",
        "current": "fontSize: '16px'",
        "suggested": "fontSize: tokens.typography.body.size",
        "priority": "high"
      }
    ],
    "patterns": [
      {
        "pattern": "Hardcoded fontSize",
        "occurrences": 47,
        "files": ["Button.tsx", "Card.tsx", ...]
      }
    ],
    "summary": "Found 47 instances of hardcoded typography..."
  },
  "usage": {
    "totalTokens": 52000,
    "estimatedCost": 1.56,
    "rounds": 5
  },
  "status": "complete"
}
```

### Priority Levels

- **High**: Significant deviation from design system (fix first)
- **Medium**: Values match but infrastructure not used (easy wins)
- **Low**: Already using design system (document for reference)

### Acting on Results

1. **Review opportunities array** - Each item is an actionable fix
2. **Check patterns summary** - Understand systematic issues
3. **Read the summary** - LLM's high-level assessment
4. **Prioritize by impact** - Files with many instances first

## Next Steps

### 1. Learn the Concepts

Read the detailed guides:
- **[How It Works](HOW-IT-WORKS.md)** - Plain-English explanation
- **[Architecture](ARCHITECTURE.md)** - Technical deep dive

### 2. List Available Resources

```bash
# See built-in patterns
pd-scout list patterns

# See built-in templates
pd-scout list templates
```

### 3. Create Team Patterns

Create patterns specific to your design system:

```bash
mkdir patterns
# Create YAML files for your patterns
```

### 4. Fork and Customize

```bash
git clone https://github.com/nyt/pd-scout my-team-scout
cd my-team-scout

# Add team-specific patterns/templates
# Publish as @your-team/scout
```

### 5. Integrate with CI/CD

```bash
# In your CI pipeline
pd-scout analyze --template typography-audit --quiet > results.json

# Check for high-priority issues
jq '.results.opportunities | map(select(.priority == "high")) | length' results.json
```

## Tips for Success

### Start Small
Don't analyze your entire codebase at once:
```bash
# Start with one feature
pd-scout analyze -t typography-audit --repo ./src/features/home

# Then expand
pd-scout analyze -t typography-audit --repo ./src
```

### Use Dry Runs
Always check costs first:
```bash
pd-scout analyze -t typography-audit --dry-run
```

### Leverage Context
Provide design system docs for better suggestions:
```yaml
context:
  - url: "@https://github.com/org/design-system"
    docPaths: ["docs/**/*.md"]
```

### Iterate on Budgets
- Start with 25k tokens for quick scans
- Increase to 100k for thorough audits
- Use 300k+ only for deep analysis

### Cache Efficiently
pd-scout caches cloned repos automatically:
```bash
# First run: Clones repo (slow)
pd-scout analyze -t typography-audit --repo https://github.com/org/repo

# Second run: Uses cache (fast)
pd-scout analyze -t typography-audit --repo https://github.com/org/repo
```

Clear cache when needed:
```bash
rm -rf .pd-scout-cache
```

## Troubleshooting

See the [Troubleshooting Guide](#troubleshooting-guide) below.

---

## Troubleshooting Guide

### Installation Issues

#### "command not found: pnpm"

**Solution**:
```bash
npm install -g pnpm
```

#### "command not found: pd-scout"

**Cause:** pd-scout isn't linked globally yet

**Solution**:
```bash
# Navigate to pd-scout directory and link it
cd /path/to/pd-scout
npm link

# Verify
pd-scout --version
```

#### Build errors with TypeScript

**Solution**:
```bash
# Clean install
rm -rf node_modules dist
pnpm install
pnpm build
```

### Configuration Issues

#### "No configuration file found"

**Solution**:
```bash
pd-scout init
```

Or create `.pd-scout.yaml` manually:
```yaml
project:
  name: "my-app"
  designSystem: "Design System"

analysis:
  tokenBudget: 100000
  maxRounds: 10
  model: "gpt-4-turbo"

paths:
  patterns: "./patterns"
  templates: "./templates"
  output: "./output"

cache:
  enabled: true
  directory: "./.pd-scout-cache"
```

#### "OpenAI API key not found"

**Solution**:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or add to `.pd-scout.yaml`:
```yaml
analysis:
  apiKey: "sk-your-key-here"
```

### Analysis Issues

#### "No files matched"

**Cause**: File patterns don't match your project structure

**Solution**:
```bash
# Check what files exist
ls src/**/*.tsx

# Use correct patterns in pattern YAML
filePatterns:
  - "src/**/*.tsx"  # Include src/ if needed
```

#### "Cost estimate is very high ($50+)"

**Causes**:
- Too many files
- Budget too high
- Large design system docs

**Solutions**:
```bash
# Reduce budget
pd-scout analyze -t typography-audit --budget 25000

# Narrow scope
pd-scout analyze -t typography-audit --repo ./src/components

# Exclude large files
# Add to .gitignore or pattern filePatterns
```

#### "Analysis incomplete"

**Causes**:
- Budget exhausted
- Max rounds reached
- Codebase larger than expected

**Solutions**:
```bash
# Increase budget
pd-scout analyze -t typography-audit --budget 200000

# Narrow scope first
pd-scout analyze -t typography-audit --repo ./src/features/home
```

#### "Pattern not found"

**Solution**:
```bash
# List available patterns
pd-scout list patterns

# Check pattern name
pd-scout analyze --pattern typography  # Correct
# Not: --pattern typography.yaml
```

### Runtime Errors

#### "Cannot find module"

**Cause**: Build issue or missing dependencies

**Solution**:
```bash
pnpm install
pnpm build
```

#### ESM module errors

**Cause**: Node.js version or module type issues

**Solution**:
```bash
# Check Node version (needs 18+)
node --version

# Ensure package.json has:
# "type": "module"
```

#### "Invalid or unexpected token" in dist/index.js

**Cause**: The shebang line in the bundle

**Solution**: Run via node explicitly:
```bash
node dist/index.js --help
```

Or make executable:
```bash
chmod +x dist/index.js
./dist/index.js --help
```

### Performance Issues

#### Analysis is slow

**Causes**:
- Large codebase
- High token budget
- Many files to analyze

**Solutions**:
```bash
# Use smaller budget
pd-scout analyze -t typography-audit --budget 50000

# Analyze incrementally
pd-scout analyze -t typography-audit --repo ./src/components
pd-scout analyze -t typography-audit --repo ./src/pages

# Use faster model
pd-scout analyze -t typography-audit --model gpt-3.5-turbo
```

#### Git cloning is slow

**Solution**: Use shallow clone (automatic) or local path:
```bash
# Clone only latest commit (fast)
# This is automatic for Git URLs

# Or use local path
pd-scout analyze -t typography-audit --repo /local/path
```

### Results Issues

#### Results are not actionable

**Causes**:
- Pattern too broad
- Template doesn't provide enough context
- LLM doesn't understand design system

**Solutions**:
1. **Provide design system docs**:
   ```yaml
   context:
     - url: "@https://github.com/org/design-system"
   ```

2. **Refine template prompt**:
   ```yaml
   systemPrompt: |
     Be specific. Suggest exact tokens from {designSystem}.
     Examples: tokens.typography.heading1, not "use a heading token"
   ```

3. **Use more specific patterns**:
   ```yaml
   searchPatterns:
     typescript:
       - pattern: "fontSize: [\"'][0-9]+"
         description: "Only hardcoded numeric values"
   ```

#### Too many false positives

**Solution**: Refine categories in pattern:
```yaml
categories:
  - id: intentional_override
    label: "Intentional Override"
    description: "Edge cases that need custom values"
    priority: low
```

Add context in template:
```yaml
systemPrompt: |
  Consider context:
  - Files in /legacy/* might be intentional
  - One-off values in /experiments/* are OK
  - Focus on /components/* and /features/*
```

### Getting Help

1. **Check documentation**:
   - [How It Works](HOW-IT-WORKS.md)
   - [Architecture](ARCHITECTURE.md)
   - [README](../README.md)

2. **Enable verbose logging**:
   ```bash
   pd-scout analyze -t typography-audit --verbose
   ```

3. **Check OpenAI API status**:
   https://status.openai.com

4. **File an issue**:
   https://github.com/nyt/pd-scout/issues

---

Happy analyzing! 🔍

