# memkit

One-step setup CLI for MCP-powered coding agent tools.

`memkit` installs and configures four tools for your coding agent — MCP servers
for memory, code intelligence, and session tracking, plus a CLI output optimizer.
No thin proxy, no filtered features. Your agent connects directly to each tool.

## What it sets up

| Tool | Purpose | Connection |
|------|---------|---------------|
| [Hindsight](https://github.com/vectorize-io/hindsight) | Shared memory across agents | MCP HTTP `localhost:8888/mcp/<bank-id>/` |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | Local code graph index | MCP stdio `codegraph serve --mcp` |
| [context-mode](https://github.com/mksglu/context-mode) | Session event capture | MCP stdio `context-mode` |
| [rtk](https://github.com/rtk) | CLI output optimizer (60-90% token savings) | CLI prefix `rtk <command>` |

## Why these tools

Coding agents are powerful, but they lack four things out of the box:

1. **Memory** — every session starts from zero. The agent doesn't remember what you
   decided yesterday, what failed last week, or which approach worked.
2. **Code intelligence** — grep can only go so far. To refactor safely, navigate a
   large codebase, or understand dependency chains, you need a graph.
3. **Session awareness** — context windows are expensive. Without tracking what
   matters, sessions bloat with noise or lose critical decisions.
4. **CLI output efficiency** — build logs, test failures, git diffs — agents burn
   70-95% of their context on verbose CLI output that could be summarized.

`memkit` wires up the four best-in-class tools that solve each problem — without
thin proxies, without filtered features. Your agent gets the full MCP interface
for Hindsight, CodeGraph, context-mode, and RTK instructions injected directly
into its operating configuration.

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
throttling. Your agent talks directly to each MCP tool over standard protocol.
RTK is a CLI command prefix (not an MCP server) that shrinks command output —
memkit injects RTK usage instructions into your agent's operating config.

### Use cases

| Scenario | How the tools help |
|----------|-------------------|
| **Long-running project** | Hindsight remembers decisions across weeks. CodeGraph keeps code context current. context-mode tracks what happened each session. |
| **New team member onboarding** | CodeGraph lets the agent navigate an unfamiliar codebase by symbol and reference — not just grep. Hindsight holds project conventions and decisions. |
| **Complex refactoring** | CodeGraph finds every reference to the target. Hindsight holds the refactoring plan. context-mode captures errors and rejected approaches so you don't repeat them. |
| **Multi-agent workflows** | Different agents (Pi, Claude Code, Cursor) share the same Hindsight bank — one writes the plan, another implements, another reviews. |
| **Session continuity** | context-mode auto-captures decisions, errors, and plans. Next session, the agent knows where you left off — no "let me re-read the codebase" tax. |
| **Code review & analysis** | CodeGraph traces data flow and dependency chains. Hindsight remembers review patterns. context-mode indexes the review session for later retrieval. |
| **Token-efficient commands** | rtk wraps git, cargo, npm, docker, jest, and 30+ other commands — 60-90% fewer tokens per output. The agent stays in context longer. |

## Quick Start

```bash
# Install globally
npm install -g github:runchr-works/playbook

# Run onboarding (installs all four tools)
memkit onboard

# Initialize a repository
cd /path/to/project
memkit init --bank <bank-id>

# Verify everything
memkit doctor
```

During onboarding, select every agent you use. After `init`, memkit writes each
selected agent's native project configuration. Restart those agents.

## Commands

| Command | Purpose |
|---------|---------|
| `memkit onboard` | Install and configure Hindsight, CodeGraph, context-mode, rtk |
| `memkit init [path] --bank <bank-id>` | Create Hindsight bank, build CodeGraph index, write agent project configs |
| `memkit doctor [--json]` | Check all tools are installed and connected |
| `memkit workspace status` | Show workspace and CodeGraph index status |
| `memkit workspace sync` | Sync the CodeGraph index |
| `memkit workspace remove [--purge-graph]` | Remove workspace state |
| `memkit agents list` | List supported agent clients |
| `memkit agents select <agents>` | Change selected agents without repeating onboarding |
| `memkit agents apply [path]` | Regenerate selected agent configs without rebuilding CodeGraph |
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

1. `onboard` installs Hindsight (via uvx), CodeGraph (npm), context-mode (npm),
   and rtk (npm). It asks for Hindsight's LLM provider, storage backend, and the
   coding agents you use. It stores that selection in `~/.config/memkit/config.json`,
   configures context-mode once in each selected agent's global configuration,
   and injects RTK usage instructions into each agent's operating config.

2. `init` creates a Hindsight memory bank, runs `codegraph init` followed by
   `codegraph index` to build a local code graph (`.codegraph/codegraph.db`),
   then writes native project configuration for every selected agent. No
   separate `codegraph init` step is needed.

3. Your agent connects directly to each tool. No memkit runtime, no filtered
   tool list — you get all 27 Hindsight tools, full CodeGraph power, and
   context-mode session tracking.

4. `doctor` verifies all four tools are installed, running, and connected.

## Agent Setup

Agent configuration is not standardized. `memkit onboard` handles global
context-mode integration, while `memkit init` writes repository-specific
Hindsight and CodeGraph connections using each selected agent's native format.

| Agent | Repository configuration | context-mode |
|-------|--------------------------|--------------|
| OpenAI Codex | `.codex/config.toml` | Added to `~/.codex/config.toml` |
| Claude Code | `.mcp.json` | Install the context-mode Claude plugin |
| Cursor | `.cursor/mcp.json` | Added to `~/.cursor/mcp.json` |
| Pi coding agent | `.mcp.json` through `pi-mcp-adapter` | Install the context-mode Pi package |
| OpenCode | `opencode.json` using its native `mcp` schema | Added to global OpenCode config |
| Gemini CLI | `.gemini/settings.json` | Added to `~/.gemini/settings.json` |
| Reasonix | Manual until its project schema is verified | Manual |
| Google Antigravity | MCP Store UI | Manual |
| Kiro | Product settings or configuration | Manual |
| Hermes Agent | Product MCP configuration | Manual |

Existing files are merged; memkit does not replace unrelated settings. Run
`memkit agents config <agent>` to print that agent's native configuration.
Existing installations can run `memkit agents select codex,claude-code,opencode`
and then `memkit agents apply` to migrate without repeating Hindsight onboarding
or rebuilding the CodeGraph index.

## Server Management

Hindsight runs as a long-lived HTTP server on `localhost:8888`. CodeGraph runs on
demand via stdio MCP — your agent's MCP adapter spawns `codegraph serve --mcp`
automatically when it connects. context-mode is configured once per agent rather
than duplicated in every repository.

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
