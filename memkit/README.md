# memkit

One-step setup CLI for MCP-powered coding agent tools.

`memkit` installs and configures three tools for your coding agent — no thin proxy,
no filtered features. Your agent connects directly to each tool's full MCP interface.

## What it sets up

| Tool | Purpose | MCP connection |
|------|---------|---------------|
| [Hindsight](https://github.com/vectorize-io/hindsight) | Shared memory across agents | `http://localhost:8888/mcp/<bank-id>/` |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | Local code graph index | `command: "codegraph"` |
| [context-mode](https://github.com/mksglu/context-mode) | Session event capture | `command: "context-mode"` |

## Why these tools

Coding agents are powerful, but they lack three things out of the box:

1. **Memory** — every session starts from zero. The agent doesn't remember what you
   decided yesterday, what failed last week, or which approach worked.
2. **Code intelligence** — grep can only go so far. To refactor safely, navigate a
   large codebase, or understand dependency chains, you need a graph.
3. **Session awareness** — context windows are expensive. Without tracking what
   matters, sessions bloat with noise or lose critical decisions.

`memkit` wires up the three best-in-class tools that solve each problem — without
thin proxies, without filtered features. Your agent gets the full MCP interface
for all three.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Your Coding Agent                           │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐     │
│  │  Hindsight   │   │  CodeGraph   │   │  context-mode    │     │
│  │  29 tools    │   │  full graph  │   │  event capture   │     │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘     │
└─────────┼──────────────────┼────────────────────┼───────────────┘
          │ MCP (HTTP)       │ MCP (stdio)        │ MCP (stdio)
          ▼                  ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   Hindsight     │  │   CodeGraph     │  │   context-mode      │
│   Server        │  │   Index         │  │   Knowledge Base    │
│   :8888         │  │   (local graph) │  │   (FTS5 + SQLite)   │
│                 │  │                 │  │                     │
│  • Shared banks │  │  • References   │  │  • Session events   │
│  • LLM-powered  │  │  • Symbols      │  │  • Auto-memory      │
│  • Multi-agent  │  │  • Call graph   │  │  • Searchable       │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

`memkit` doesn't sit in the middle — there is no runtime, no proxy, no API
throttling. Your agent talks directly to each tool over standard MCP.

### Use cases

| Scenario | How the tools help |
|----------|-------------------|
| **Long-running project** | Hindsight remembers decisions across weeks. CodeGraph keeps code context current. context-mode tracks what happened each session. |
| **New team member onboarding** | CodeGraph lets the agent navigate an unfamiliar codebase by symbol and reference — not just grep. Hindsight holds project conventions and decisions. |
| **Complex refactoring** | CodeGraph finds every reference to the target. Hindsight holds the refactoring plan. context-mode captures errors and rejected approaches so you don't repeat them. |
| **Multi-agent workflows** | Different agents (Pi, Claude Code, Cursor) share the same Hindsight bank — one writes the plan, another implements, another reviews. |
| **Session continuity** | context-mode auto-captures decisions, errors, and plans. Next session, the agent knows where you left off — no "let me re-read the codebase" tax. |
| **Code review & analysis** | CodeGraph traces data flow and dependency chains. Hindsight remembers review patterns. context-mode indexes the review session for later retrieval. |

## Quick Start

```bash
# Install globally
npm install -g github:runchr-works/playbook

# Run onboarding (installs all three tools)
memkit onboard

# Initialize a repository
cd /path/to/project
memkit init --bank <bank-id>

# Verify everything
memkit doctor
```

After `init`, your project's `.mcp.json` is ready. Restart your agent.

## Commands

| Command | Purpose |
|---------|---------|
| `memkit onboard` | Install and configure Hindsight, CodeGraph, context-mode |
| `memkit init [path] --bank <bank-id>` | Create Hindsight bank, build CodeGraph index, write `.mcp.json` |
| `memkit doctor [--json]` | Check all tools are installed and connected |
| `memkit workspace status` | Show workspace and CodeGraph index status |
| `memkit workspace sync` | Sync the CodeGraph index |
| `memkit workspace remove [--purge-graph]` | Remove workspace state |
| `memkit agents list` | List supported agent clients |
| `memkit agents config <agent>` | Print MCP config for a specific agent |
| `memkit uninstall [--purge]` | Remove global configuration |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMKIT_REPOSITORY_ROOT` | cwd | Repository root |
| `MEMKIT_HOME` | `~/.config/memkit` | Config directory |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API URL |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph executable |
| `CODEGRAPH_ARGS` | `serve,--mcp` | CodeGraph arguments |

## How it works

1. `onboard` installs Hindsight (via uvx), CodeGraph (npm), and context-mode (npm).
   It asks for Hindsight's LLM provider and storage backend, then starts Hindsight
   and writes global config to `~/.config/memkit/config.json`.

2. `init` creates a Hindsight memory bank, runs `codegraph init` followed by
   `codegraph index` to build a local code graph (`.codegraph/codegraph.db`),
   and writes `.mcp.json` into your project root. No separate `codegraph init`
   step needed.

3. Your agent connects directly to each tool. No memkit runtime, no filtered
   tool list — you get all 27 Hindsight tools, full CodeGraph power, and
   context-mode session tracking.

4. `doctor` verifies all three tools are installed, running, and connected.

## Agent Setup

`memkit init` creates a `.mcp.json` file that agents read to load MCP servers.
Most agents need one extra step after `init` — check the table below:

| Agent | Status | What to do after `memkit init` |
|-------|--------|-------------------------------|
| **Claude Code** | Read `.mcp.json` natively | None — just restart Claude Code |
| **Cursor** | Read `.mcp.json` natively | None — restart Cursor or the Cursor CLI |
| **Pi coding agent** | Needs adapter | Install `pi-mcp-adapter`: run `pi install npm:pi-mcp-adapter` and restart |
| OpenAI Codex | Needs manual config | Copy the `mcpServers` block from `.mcp.json` into `~/.codex/config.toml` |
| Gemini CLI | Needs manual config | Copy the `mcpServers` block into `~/.gemini/settings.json` |
| OpenCode | Needs manual config | Copy the `mcpServers` block into `opencode.json` |
| Reasonix | Needs manual config | Copy the `mcpServers` block into `~/.reasonix/config.json` |
| Google Antigravity | UI-based | Paste `.mcp.json` servers in MCP Store → Manage MCP Servers → View raw config |
| Kiro | Needs manual config | Configure MCP servers through Kiro's settings UI or config |
| Hermes Agent | Needs manual config | Copy the `mcpServers` block into Hermes MCP configuration |

Run `memkit agents config <agent>` to print the exact JSON your agent needs.

## Server Management

Hindsight runs as a long-lived HTTP server on `localhost:8888`. CodeGraph runs on
demand via stdio MCP — your agent's MCP adapter spawns `codegraph serve --mcp`
automatically when it connects. context-mode runs as a native extension inside
Pi — no separate process to manage.

### Starting Hindsight

```bash
uv tool uvx --from hindsight-api hindsight-local-mcp
```

Hindsight reads its configuration from `~/.config/memkit/config.json` (created by
`memkit onboard`). The server logs to stdout.

#### Auto-start with systemd (optional)

To start Hindsight automatically on boot:

```bash
mkdir -p ~/.config/systemd/user

cat << 'EOF' > ~/.config/systemd/user/hindsight.service
[Unit]
Description=Hindsight MCP Memory Server
After=network.target

[Service]
Type=simple
ExecStart=uv tool uvx --from hindsight-api hindsight-local-mcp
Restart=on-failure
RestartSec=5
EnvironmentFile=%h/.config/memkit/config.json

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now hindsight.service
```

### CodeGraph

CodeGraph is initialized by `memkit init` — no separate `codegraph init` step
needed. The `init` command runs `codegraph init` and `codegraph index` under the
hood, creating `.codegraph/codegraph.db` in your project root.

Your agent's MCP adapter spawns `codegraph serve --mcp` automatically when it
connects. To sync the index after code changes:

```bash
memkit workspace sync
# or directly:
codegraph sync
```

### After reboot

1. Start Hindsight (if not using systemd auto-start):
   ```bash
   uv tool uvx --from hindsight-api hindsight-local-mcp
   ```
2. Restart your coding agent to reconnect MCP adapters.
3. Run `memkit doctor` to verify everything is connected.

## Prerequisites

- Node.js 22.5+
- Git
- [uv/uvx](https://docs.astral.sh/uv/) (for Hindsight)
- A supported MCP coding agent (Pi, Claude Code, Cursor, Codex, etc.)

## License

Apache 2.0 — see [LICENSE](../LICENSE)
