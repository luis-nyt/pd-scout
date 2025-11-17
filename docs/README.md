# pd-scout Documentation

`scout` is a **pattern recognition** framework for codebases.

You can use this to….
- Learn how UI's are using design systems
- Find specific kinds of design/tech debt
- Uncover any other implementation patterns

## Documentation Index

### Getting Started
- **[Getting Started Guide](GETTING-STARTED.md)** - Complete walkthrough from installation to first analysis
  - Installation (pnpm, pd-scout, OpenAI setup)
  - Quick start tutorial
  - Creating custom patterns and templates
  - Common workflows
  - Troubleshooting guide

### Understanding pd-scout
- **[How It Works](HOW-IT-WORKS.md)** - Plain-English explanation for product designers
  - The three core concepts (Patterns, Templates, Agentic Loop)
  - What makes it different from traditional linters
  - Data flow walkthrough
  - Why "agentic" vs fixed rules
  - Cost and budget controls
  - Customization points

### Technical Reference
- **[Architecture](ARCHITECTURE.md)** - Technical deep dive for engineers
  - Technology stack
  - Project structure
  - Core components (Analyzer, Tools, Patterns, Templates)
  - Data flow
  - Build and development setup
  - Testing strategy
  - Security considerations

## Quick Reference

### Installation
```bash
npm install -g pnpm
npm install -g @nyt/pd-scout
export OPENAI_API_KEY=sk-your-key-here
```

### Basic Usage
```bash
pd-scout init                                      # Create config
pd-scout analyze --template typography-audit       # Run analysis
pd-scout list patterns                             # Show patterns
pd-scout list templates                            # Show templates
```

### Common Commands
```bash
# Dry run (cost estimate)
pd-scout analyze -t typography-audit --dry-run

# Analyze specific directory
pd-scout analyze -t typography-audit --repo ./src/components

# Custom budget
pd-scout analyze -t typography-audit --budget 50000

# Verbose output
pd-scout analyze -t typography-audit --verbose
```

## Documentation for Different Audiences

### Product Designers
Start with **[How It Works](HOW-IT-WORKS.md)** to understand the concepts, then use **[Getting Started](GETTING-STARTED.md)** to run your first analysis.

### Engineers
Read **[Architecture](ARCHITECTURE.md)** for technical details, then **[Getting Started](GETTING-STARTED.md)** for setup instructions.

### Design System Teams
All three guides:
1. **[Getting Started](GETTING-STARTED.md)** - Set up and customize
2. **[How It Works](HOW-IT-WORKS.md)** - Explain to stakeholders
3. **[Architecture](ARCHITECTURE.md)** - Fork and extend

## Key Concepts

### Patterns
YAML files defining **what to look for** in codebases:
- File patterns to scan
- Search patterns (what strings/regex to find)
- Categories for classification

### Templates
YAML files defining **how to analyze** patterns:
- System prompt (LLM's instructions)
- User prompt template (the task)
- Output schema (result format)
- Analysis strategy

### Agentic Loop
The LLM explores autonomously:
1. Decides which tool to use
2. Examines results
3. Decides next step
4. Repeats until complete or budget exhausted

## File Locations

### Configuration
- `.pd-scout.yaml` - Project configuration
- `.env` - Environment variables (API keys)

### Custom Content
- `patterns/` - User-defined patterns
- `templates/` - User-defined templates
- `output/` - Analysis results

### Built-in Content
- `src/patterns/builtin/` - Built-in patterns
- `src/templates/builtin/` - Built-in templates

## Getting Help

1. **Documentation**
   - Start with [Getting Started](GETTING-STARTED.md)
   - Check [Troubleshooting](GETTING-STARTED.md#troubleshooting-guide)

2. **Verbose Logging**
   ```bash
   pd-scout analyze -t typography-audit --verbose
   ```

3. **GitHub Issues**
   - File bugs: https://github.com/nyt/pd-scout/issues
   - Request features
   - Share patterns/templates

4. **Community**
   - Share custom patterns
   - Contribute to documentation
   - Help others troubleshoot

## Contributing

See [Architecture](ARCHITECTURE.md) for:
- Development setup
- Testing strategy
- Code structure
- Extension points

## License

MIT - See LICENSE file

