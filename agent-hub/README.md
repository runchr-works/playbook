# agent-hub

One-step setup CLI for MCP-powered coding agent tools.

`agent-hub` installs and configures three tools for your coding agent — no thin proxy,
no filtered features. Your agent connects directly to each tool's full MCP interface.

## What it sets up

| Tool | Purpose | MCP connection |
|------|---------|---------------|
| [Hindsight](https://github.com/vectorize-io/hindsight) | Shared memory across agents | `http://localhost:8888/mcp/<bank-id>/` |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | Local code graph index | `command: "codegraph"` |
| [context-mode](https://github.com/mksglu/context-mode) | Session event capture | `command: "context-mode"` |

## Quick Start

```bash
# Install globally
npm install -g github:runchr-works/playbook

# Run onboarding (installs all three tools)
agent-hub onboard

# Initialize a repository
cd /path/to/project
agent-hub init --bank <bank-id>

# Verify everything
agent-hub doctor
```

After `init`, your project's `.mcp.json` is ready. Restart your agent.

## Commands

| Command | Purpose |
|---------|---------|
| `agent-hub onboard` | Install and configure Hindsight, CodeGraph, context-mode |
| `agent-hub init [path] --bank <bank-id>` | Initialize repository memory and CodeGraph |
| `agent-hub doctor [--json]` | Check all tools are installed and connected |
| `agent-hub workspace status` | Show workspace and CodeGraph index status |
| `agent-hub workspace sync` | Sync the CodeGraph index |
| `agent-hub workspace remove [--purge-graph]` | Remove workspace state |
| `agent-hub agents list` | List supported agent clients |
| `agent-hub agents config <agent>` | Print MCP config for a specific agent |
| `agent-hub uninstall [--purge]` | Remove global configuration |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_HUB_REPOSITORY_ROOT` | cwd | Repository root |
| `AGENT_HUB_HOME` | `~/.config/agent-hub` | Config directory |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API URL |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph executable |
| `CODEGRAPH_ARGS` | `serve,--mcp` | CodeGraph arguments |

## How it works

1. `onboard` installs Hindsight (via uvx), CodeGraph (npm), and context-mode (npm).
   It asks for Hindsight's LLM provider and storage backend, then starts Hindsight
   and generates `.mcp.json` in your project.

2. Your agent connects directly to each tool. No agent-hub runtime, no filtered
   tool list — you get all 29 Hindsight tools, full CodeGraph power, and
   context-mode session tracking.

3. `doctor` verifies all three tools are installed, running, and connected.

## Prerequisites

- Node.js 22.5+
- Git
- [uv/uvx](https://docs.astral.sh/uv/) (for Hindsight)
- A supported MCP coding agent (Pi, Claude Code, Cursor, Codex, etc.)

## License

Apache 2.0 — see [LICENSE](../LICENSE)
