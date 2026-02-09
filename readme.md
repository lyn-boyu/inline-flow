# Inline Flow

> Run versioned skills on your current context — inline.

Inline Flow is a productivity system that combines a Raycast Extension with a local Bun.js Host to execute AI-powered skills on your current context (selected text or clipboard) without disrupting your workflow.

## Architecture

```
┌─────────────────────┐         HTTP          ┌──────────────────────┐
│ Raycast Extension   │────────────────────────│  Bun Host WebApp     │
│  (Input + Display)  │   POST /api/run       │  (Execution + Vault) │
└─────────────────────┘                       └──────────────────────┘
         │                                              │
         │                                              │
    Selection/                                      Skills/
    Clipboard                                      LLM/Cache/
                                                   Records
```

### Components

1. **Raycast Extension** (`packages/raycast-extension/`)
   - Captures user input (selection, clipboard, frontmost app)
   - Manages skill selection state
   - Displays results in Markdown
   - Provides 3 commands: Run Last Skill, Cycle Skill, Run Skill Picker

2. **Bun Host WebApp** (`packages/host/`)
   - Parses skill definitions from Markdown files
   - Executes skills via LLM APIs (OpenAI/Anthropic)
   - Manages intelligent caching
   - Persists results to local Vault

## Quick Start

### Prerequisites

- macOS with Raycast installed
- Bun >= 1.0
- Node.js >= 20 (for Raycast Extension development)
- OpenAI and/or Anthropic API keys

### 1. Set up the Bun Host

```bash
# Install dependencies
cd packages/host
bun install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the host
bun run src/index.ts
```

### 2. Set up the Raycast Extension

```bash
# Install dependencies
cd packages/raycast-extension
npm install

# Load in Raycast (Development Mode)
# Open Raycast → Extensions → + → Add Extension
# Select packages/raycast-extension directory

# Configure in Raycast
# Raycast → Extensions → Inline Flow → Configure
# Set Host URL: http://127.0.0.1:8787
# Set API Key: <your HOST_API_KEY>
```

### 3. Create Skills

```bash
# Create Vault directory
mkdir -p ~/Documents/InlineFlow/skills

# Add skill definitions (see docs/web-app-design.md)
```

## Usage

1. **Select text** in any application
2. **Trigger Raycast** → Run Last Skill (or use your configured shortcut)
3. **View result** with metadata and actions
4. **Re-run** with force flag or **Copy** content

## Documentation

- [PRD](docs/prd.md) - Product Requirements Document
- [Raycast Extension Plan](docs/raycast-extension-plan.md) - Extension development guide
- [Bun Host Design](docs/web-app-design.md) - Host WebApp design
- [Raycast Integration Guide](docs/raycast-integration-guide.md) - Integration instructions
- [CLAUDE.md](CLAUDE.md) - Architecture overview for Claude Code

## Development

See individual package READMEs for detailed development instructions:
- [packages/host/README.md](packages/host/README.md)
- [packages/raycast-extension/README.md](packages/raycast-extension/README.md)

## License

MIT
