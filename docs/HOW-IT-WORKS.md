# How pd-scout Actually Works

> **Plain-English explanation of pd-scout's core concepts**  
> Written for product designers who want to understand and customize the tool

---

## The Big Picture

Think of pd-scout like hiring a design systems expert to audit your codebase. You give them instructions like *"Find everywhere we're not using our design system"*, they explore the code, and report back with findings.

But instead of a human, it's an LLM (like ChatGPT) with special tools that let it read files, search code, and analyze patterns.

**The key difference from traditional tools:**
- Traditional linter: Follows fixed rules → *"If fontSize !== token, flag it"*
- pd-scout: Explores and reasons → *"I see a pattern here... these 20 files all do something similar... this looks intentional vs. this looks inconsistent"*

---

## The Three Core Concepts

### 1. Patterns (What to Look For)

**What it is:** A simple YAML file that says *"search for these things in these file types"*

**Why it matters:** You can create new patterns without writing code. Just describe what you're looking for.

**Analogy:** Like creating a saved search in your email. You define the criteria once, then reuse it.

**Example:**
```yaml
# patterns/typography.yaml
name: typography
filePatterns:
  - "**/*.tsx"      # Look in React files
  - "**/*.css"      # And CSS files

searchPatterns:
  typescript:
    - pattern: "fontSize:"
      description: "Inline font sizes"
    - pattern: "font-size:"
      description: "CSS font sizes"

categories:
  - id: not_using_design_system
    label: "❌ Not Using Design System"
    priority: high
  
  - id: using_design_system
    label: "✅ Using Design System"
    priority: low
```

**What happens:** pd-scout scans all `.tsx` and `.css` files, searches for `fontSize:` and `font-size:`, then categorizes what it finds.

---

### 2. Templates (How to Analyze)

**What it is:** Instructions for the LLM on how to analyze the pattern

**Why it matters:** Controls *what* the LLM focuses on and *how* it reports findings

**Analogy:** Like a creative brief you'd give a designer. The pattern says "what to look at", the template says "what to do with it"

**Example:**
```yaml
# templates/typography-audit.yaml
name: typography-audit
pattern: typography  # ← Uses the pattern above

systemPrompt: |
  You are analyzing {projectName} for typography consistency.
  
  Your goal: Find every place we use fonts and categorize by design system adoption.
  
  Strategy:
  1. List files to understand the codebase
  2. Search for typography patterns
  3. Read example files
  4. Categorize each finding
  5. Report all instances with specific line numbers

outputSchema:
  - file: "path/to/file.tsx"
  - lines: "42-45"
  - category: "not_using_design_system"
  - current: "fontSize: '16px'"
  - suggested: "fontSize: tokens.body.size"
```

**What happens:** The LLM reads these instructions and follows them as it explores. The `systemPrompt` is like its "job description."

---

### 3. The Agentic Loop (How It Explores)

**What it is:** The LLM decides what to do next based on what it's learned so far

**Why it matters:** More flexible than hardcoded steps. Can adapt to different codebases.

**Analogy:** 
- **Traditional script:** Follow a recipe step-by-step (1. Open file A, 2. Search for X, 3. Count matches)
- **Agentic approach:** Like a chef improvising (taste as you go, adjust seasoning, decide what's needed)

**How it works:**

```
┌─────────────────────────────────────────┐
│ You: "Analyze typography in this repo" │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ LLM: "Let me start by listing files..." │
│ Uses tool: list_files("**/*.tsx")       │
└──────────────┬──────────────────────────┘
               │
               ▼ (sees 200 files)
┌─────────────────────────────────────────┐
│ LLM: "That's a lot. Let me search for   │
│       'fontSize' first to narrow down"  │
│ Uses tool: search_code("fontSize:")     │
└──────────────┬──────────────────────────┘
               │
               ▼ (finds 47 files with matches)
┌─────────────────────────────────────────┐
│ LLM: "Now let me read a few examples"   │
│ Uses tool: read_files([...])            │
└──────────────┬──────────────────────────┘
               │
               ▼ (reads 5 files, sees pattern)
┌─────────────────────────────────────────┐
│ LLM: "I see the pattern now. These 20   │
│       use design tokens, these 27 don't" │
│ Uses tool: finish_analysis([results])   │
└──────────────┬──────────────────────────┘
               │
               ▼
         Your Results
```

**Key point:** The LLM chose this path itself. A different codebase might require a different exploration strategy, and it adapts automatically.

---

## The Tools (What the LLM Can Do)

Think of these as "apps" the LLM can open to get information:

### `list_files`
**What it does:** Shows what files exist  
**Example:** `list_files("src/**/*.tsx")` → Returns list of all React files  
**When LLM uses it:** First step to understand codebase structure

### `read_files`
**What it does:** Reads actual file contents  
**Example:** `read_files(["Button.tsx", "Card.tsx"])` → Returns full file contents  
**When LLM uses it:** When it needs to see actual code to understand patterns

### `search_code`
**What it does:** Finds all occurrences of a pattern  
**Example:** `search_code("fontSize:")` → Returns every file with "fontSize:"  
**When LLM uses it:** To quantify how widespread a pattern is

### `get_file_dependencies`
**What it does:** Shows what a file imports  
**Example:** Returns `["@design-system/tokens", "react"]`  
**When LLM uses it:** To see if design system is already imported

### `read_context_docs` (optional)
**What it does:** Reads your design system documentation  
**Example:** `read_context_docs("typography.md")` → Your typography guidelines  
**When LLM uses it:** To verify recommendations against your actual design system

### `finish_analysis`
**What it does:** Signals "I'm done, here are my findings"  
**Example:** Returns structured JSON with all opportunities found  
**When LLM uses it:** When it has enough information to complete the audit

---

## Data Flow (Step-by-Step)

Let's trace what happens when you run:
```bash
pd-scout analyze --template typography-audit
```

### Step 1: Configuration Loading
```
Loads:
├── .pd-scout.yaml (project config)
│   ├── Project name: "My App"
│   ├── Design system: "MyDesignSystem"
│   └── Token budget: 100,000
├── Pattern: patterns/typography.yaml
│   ├── File types to scan: *.tsx, *.css
│   └── Search patterns: fontSize, font-size
└── Template: templates/typography-audit.yaml
    ├── Instructions for LLM
    └── Output format

Result: Complete configuration merged together
```

### Step 2: Pre-Search (Optional Speed Optimization)
```
Before calling the LLM (expensive), do cheap regex search:

Scan all *.tsx files for "fontSize:" → Found in 47 files
Scan all *.css files for "font-size:" → Found in 23 files

Result: Only analyze 70 files instead of 500 total files
Cost savings: ~75%
```

### Step 3: LLM Initialization
```
Build the system prompt:
┌────────────────────────────────────────────┐
│ You are analyzing My App for typography.  │
│ Design system: MyDesignSystem              │
│ Budget: 100,000 tokens                     │
│ Strategy: [from template]                  │
│ Output format: [from template]             │
└────────────────────────────────────────────┘

Add available tools:
- list_files ✓
- read_files ✓
- search_code ✓
- finish_analysis ✓

Start the conversation:
User: "Find all typography usage and categorize by design system adoption"
```

### Step 4: Agentic Exploration Loop
```
Round 1:
├── LLM: "Let me list files first"
├── Tool call: list_files("**/*.tsx")
├── Result: 200 files
└── Tokens used: 2,000

Round 2:
├── LLM: "Now search for fontSize patterns"
├── Tool call: search_code("fontSize:")
├── Result: 47 files with matches
└── Tokens used: 5,000

Round 3:
├── LLM: "Let me read a few examples"
├── Tool call: read_files(["Button.tsx", "Card.tsx", "Header.tsx"])
├── Result: [file contents]
└── Tokens used: 12,000

Round 4:
├── LLM: "I see the pattern. Let me quantify..."
├── Tool call: search_code("tokens.typography")
├── Result: 23 files using tokens
└── Tokens used: 15,000

Round 5:
├── LLM: "I have enough info. Here are findings:"
├── Tool call: finish_analysis([89 opportunities])
└── Tokens used: 18,000

Total tokens: 52,000 / 100,000 budget
Total cost: ~$1.50
```

### Step 5: Result Processing
```
LLM returns structured data:
{
  opportunities: [
    {
      file: "Button.tsx",
      lines: "23",
      category: "not_using_design_system",
      current: "fontSize: '16px'",
      suggested: "fontSize: tokens.typography.body"
    },
    // ... 88 more
  ],
  patterns: [
    {
      pattern: "Hardcoded fontSize",
      occurrences: 47,
      files: [...]
    }
  ]
}

Enrich with metadata:
- Cost: $1.50
- Duration: 2m 34s
- Files analyzed: 47
- Opportunities found: 89

Save to: output/20241028_143022.json
```

### Step 6: Display Results
```
Terminal output:
┌─────────────────────────────────────┐
│ ✅ Analysis Complete                │
├─────────────────────────────────────┤
│ Opportunities: 89                   │
│ High priority: 47                   │
│ Medium priority: 32                 │
│ Low priority: 10                    │
├─────────────────────────────────────┤
│ Cost: $1.50                         │
│ Duration: 2m 34s                    │
│ Budget used: 52%                    │
└─────────────────────────────────────┘
```

---

## Why "Agentic" Instead of Fixed Rules?

### Fixed Rules Approach (Traditional Linter)
```javascript
// This is how a traditional linter works:
for each file:
  if (file contains "fontSize:") AND (NOT contains "tokens."):
    flag as error
```

**Limitations:**
- ❌ Doesn't understand context (maybe inline styles are intentional)
- ❌ Can't see patterns across files
- ❌ Can't prioritize by impact
- ❌ Gives same advice regardless of codebase structure

### Agentic Approach (pd-scout)
```
LLM explores → Understands context → Makes nuanced recommendations

Examples of nuance:
✓ "These 5 files all have hardcoded fonts, but they're in a legacy folder - lower priority"
✓ "This one file has 30 instances - probably autogenerated, different fix needed"
✓ "These use tokens but not components - easy upgrade path"
✓ "These match design system values but aren't using tokens - quick wins"
```

**Advantages:**
- ✅ Understands context and intent
- ✅ Finds patterns you didn't think to look for
- ✅ Prioritizes intelligently
- ✅ Adapts to different codebases

**Trade-offs:**
- Slower (minutes vs. seconds)
- Costs money (API calls)
- Non-deterministic (might explore differently each time)
- Requires prompt engineering (tuning the instructions)

---

## Cost & Budget Control

### Why Track Tokens?

**Tokens = Money**
- OpenAI charges per token (roughly per word)
- GPT-4: ~$0.03 per 1,000 output tokens
- Typical analysis: 50,000-150,000 tokens = $1.50-$4.50

**Tokens = Time**
- More tokens = longer processing
- Budget helps limit analysis duration

### How Budget Controls Work

```typescript
// Inside the agentic loop
for (let round = 0; round < maxRounds; round++) {
  const response = await openai.chat.completions.create({...});
  
  tokensUsed += response.usage.total_tokens;
  
  // Check if we're near budget limit
  if (tokensUsed > tokenBudget * 0.8) {
    // Force LLM to finish with what it knows
    return forceCompletion();
  }
}
```

**Budget strategies:**
| Budget | Use Case | Typical Cost |
|--------|----------|--------------|
| 25,000 | Quick scan | $0.50-$1.00 |
| 100,000 | Thorough audit | $2.00-$5.00 |
| 300,000 | Deep dive | $5.00-$15.00 |

---

## Customization Points (What You Can Change)

### ✅ No Code Required

**Change project settings:**
```yaml
# .pd-scout.yaml
project:
  name: "Your App"
  designSystem: "YourSystem"  # Shows up in prompts
```

**Create custom patterns:**
```yaml
# patterns/your-pattern.yaml
name: animation
searchPatterns:
  typescript:
    - pattern: "transition:"
```

**Create custom templates:**
```yaml
# templates/your-audit.yaml
name: your-audit
systemPrompt: |
  Custom instructions for your team...
```

**Adjust analysis settings:**
```yaml
analysis:
  tokenBudget: 50000      # Lower for faster/cheaper
  maxRounds: 5            # Fewer iterations
  model: "gpt-4-turbo"    # Cheaper model
```

### ⚠️ Code Changes Required

**Add new tools** - Requires TypeScript in `src/core/tools.ts`  
**Change LLM provider** - Requires updating `src/core/analyzer.ts`  
**Add file format support** - Requires updating parsers  

---

## Common Scenarios

### Scenario 1: "I want to check typography in my React app"

```bash
pd-scout analyze --template typography-audit
```

**What happens:**
1. Loads typography pattern (searches for fontSize, font-size, etc.)
2. Loads typography-audit template (instructions for LLM)
3. LLM explores your React files
4. Reports findings categorized by design system adoption

### Scenario 2: "I want to create a custom check for animations"

```bash
# 1. Create pattern
cat > patterns/animation.yaml << EOF
name: animation
searchPatterns:
  typescript:
    - pattern: "transition:"
    - pattern: "@keyframes"
EOF

# 2. Create template
cat > templates/animation-audit.yaml << EOF
name: animation-audit
pattern: animation
systemPrompt: |
  Find custom animations that should use our motion system.
EOF

# 3. Run it
pd-scout analyze --template animation-audit
```

### Scenario 3: "I want to analyze just one feature directory"

```bash
pd-scout analyze \
  --template typography-audit \
  --file-pattern "src/features/checkout/**/*.tsx"
```

**What changes:** Only analyzes files in the checkout feature, dramatically reducing cost/time.

### Scenario 4: "I want to analyze 20 different directories"

```yaml
# batch-config.yaml
directories:
  - name: "Home"
    path: "src/features/home"
  - name: "Search"
    path: "src/features/search"
  # ... 18 more

analysis:
  template: "typography-audit"
```

```bash
pd-scout batch --config batch-config.yaml
```

**What happens:** Runs analysis on each directory separately, creates one JSON per directory, plus a summary across all.

---

## Troubleshooting

### "No files matched"

**What this means:** Your file pattern didn't find any files

**Why:**
- Wrong glob pattern for your structure
- Wrong directory
- Files excluded by .gitignore

**Fix:**
```bash
# See what files would match
pd-scout analyze --file-pattern "**/*.tsx" --verbose

# Try absolute path
pd-scout analyze --repo /absolute/path/to/repo
```

### "Cost estimate is $50"

**What this means:** Analysis would use tons of tokens

**Why:**
- Too many files
- Budget too high
- Design system docs are huge

**Fix:**
```bash
# Reduce budget
pd-scout analyze --budget 25000

# Narrow scope
pd-scout analyze --file-pattern "src/components/**"
```

### "Analysis incomplete"

**What this means:** LLM ran out of budget/rounds before finishing

**Why:**
- Codebase larger than expected
- LLM exploring inefficiently
- Budget too low

**Fix:**
```bash
# Increase budget
pd-scout analyze --budget 200000

# Narrow scope first
pd-scout analyze --file-pattern "src/features/home/**"
```

---

## Technical Deep Dive: Inside the Agentic Loop

For those who want to understand the code:

```typescript
// Simplified version of src/core/analyzer.ts
export class AgenticAnalyzer {
  async analyze(prompt: string): Promise<AnalysisResult> {
    // 1. Initialize conversation with system prompt + user prompt
    this.history = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: prompt }
    ];
    
    // 2. Main exploration loop
    for (let round = 0; round < this.maxRounds; round++) {
      // 3. Call OpenAI with tools available
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: this.history,
        tools: this.tools.getDefinitions(), // ← Tools the LLM can use
      });
      
      // 4. Track token usage for budget control
      this.tokensUsed += response.usage.total_tokens;
      
      const message = response.choices[0].message;
      this.history.push(message); // Add LLM response to history
      
      // 5. Did LLM want to use any tools?
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          // Execute the tool (e.g., read_files, search_code)
          const result = await this.tools.execute(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          
          // Add tool result back to conversation
          this.history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      }
      
      // 6. Did LLM call finish_analysis?
      if (this.isComplete()) {
        return this.formatResults();
      }
      
      // 7. Budget check
      if (this.tokensUsed > this.tokenBudget * 0.8) {
        return this.forceCompletion(); // Ask LLM to wrap up
      }
    }
    
    // Max rounds reached - force completion
    return this.forceCompletion();
  }
}
```

**Key concepts in this code:**

1. **Conversation History** - Each round adds to the history, giving LLM context
2. **Tool Calls** - LLM can request tools, we execute them, add results to history
3. **Budget Control** - Track tokens and force completion when near limit
4. **Max Rounds** - Prevent infinite loops with round limit

---

## Summary

**pd-scout in three sentences:**
1. You define **what to look for** (patterns) and **how to analyze** (templates) in YAML
2. An LLM explores your code using **tools** (read files, search, etc.) in an **agentic loop**
3. It returns **structured findings** categorized by your design system adoption framework

**Why it's different:**
- Flexible (adapts to different codebases)
- Intelligent (understands context and patterns)
- Forkable (customize via YAML, no code changes)

**When to use it:**
- Design system adoption audits
- Finding inconsistencies across large codebases
- Pattern detection that's too nuanced for fixed rules

**When NOT to use it:**
- Real-time linting (use ESLint/Prettier)
- Deterministic checks (use traditional linters)
- When you can't spend $1-5 on analysis

