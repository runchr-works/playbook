# Intentir

[한국어](README.ko.md)

Intentir gives multiple coding agents one MCP interface for shared memory and local code intelligence.
It combines [Hindsight](https://github.com/vectorize-io/hindsight) and
[CodeGraph](https://github.com/colbymchenry/codegraph) without forking either project.

- All agents configured for a repository use its Hindsight bank directly.
- Users can review and remove incorrect memories.
- Repository code and the CodeGraph index stay on the local machine.
- Hindsight can store shared memory in Supabase PostgreSQL.

## Prerequisites

Install or prepare the following before running onboarding:

| Requirement | When needed | Verify |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) 22.5 or newer, including `npm` | Always | `node --version && npm --version` |
| [Git](https://git-scm.com/) | Always; installation and repository identity use it | `git --version` |
| `curl` or Windows PowerShell | Installing `uv` with the commands below | `curl --version` or `$PSVersionTable` |
| [`uv`](https://docs.astral.sh/uv/) and `uvx` | Local pg0 or Supabase; both run Hindsight locally | `uvx --version` |
| Hindsight URL and optional API key | Only when connecting to an existing Hindsight server | `curl <url>/health` |
| LLM provider credentials | Required by Hindsight unless using a supported subscription or local provider | Provider-specific |
| Supabase PostgreSQL connection URLs and database password | Supabase storage only | Supabase Dashboard > **Connect** |
| Ollama or LM Studio running locally | Only when selecting that local LLM provider | Provider-specific health check |
| A supported MCP coding agent | To use Intentir tools from an agent | See [Supported Agent Clients](#supported-agent-clients) |
| Outbound network access | Initial GitHub/npm/Python package downloads and hosted LLM or Supabase use | Check the relevant endpoints |

CodeGraph does not need to be installed beforehand. Onboarding can install it globally with npm. If global
npm installs require elevated permissions on your machine, configure a user-writable npm prefix or install
`@colbymchenry/codegraph` yourself before onboarding.

Supabase is configured as Hindsight's PostgreSQL database; Intentir never accesses Supabase directly.

Install `uv` before selecting local pg0 or Supabase:

```bash
# Linux and macOS
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```powershell
# Windows PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Restart the shell after installation and verify it with `uvx --version`. Intentir does not install `uv`
automatically.

Verify the minimum local toolchain before continuing:

```bash
node --version
npm --version
git --version
curl --version
uvx --version
```

On Windows, verify PowerShell instead of `curl` when using the PowerShell installer. If you select an
existing Hindsight server, `uvx` is not required.

## Quick Start

Install Intentir globally, verify the command, and run interactive onboarding:

```bash
npm install --global --install-links=true github:runchr-works/intentir
intentir --help
intentir onboard
```

It asks for:

- Hindsight storage: embedded local pg0, Supabase PostgreSQL, or an existing server
- Hindsight LLM provider, model, API key, and optional base URL
- Whether CodeGraph should be installed globally

### LLM Provider Recommendations

Onboarding shows Hindsight's current official provider defaults and lets you override the model.

| Provider | Suggested default | Other Hindsight-tested options | Notes |
| --- | --- | --- | --- |
| OpenAI | `gpt-4o-mini` | `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1-mini` | Simple hosted default |
| Anthropic | `claude-haiku-4-5-20251001` | `claude-sonnet-4-5-20250929`, `claude-sonnet-4-20250514` | Sonnet favors quality over cost |
| Gemini | `gemini-2.5-flash` | `gemini-2.5-flash-lite`, `gemini-3-pro-preview` | Good speed and cost balance |
| Groq | `openai/gpt-oss-120b` | `openai/gpt-oss-20b` | OpenAI-compatible endpoint |
| OpenRouter | `qwen/qwen3.5-9b` | `anthropic/claude-sonnet-4-20250514` | Access multiple model vendors |
| Ollama | `gemma3:12b` | `gpt-oss:20b` | Fully local; hardware requirements apply |
| LM Studio | `local-model` | User-selected local model | Fully local OpenAI-compatible server |
| OpenAI Codex | `gpt-5.4-mini` | Provider-managed | Personal local use; uses Codex login |
| Claude Code | `claude-sonnet-4-5-20250929` | Provider-managed | Personal local use; uses Claude login |

Model availability changes over time. These defaults follow the
[Hindsight models documentation](https://hindsight.vectorize.io/developer/models); the provider dashboard
remains the source of truth for account access and pricing.

### Supabase Setup

Intentir and Hindsight do not need a Supabase API key. Do not provide an `anon`, `service_role`,
`sb_publishable`, `sb_secret`, legacy JWT key, or Personal Access Token.

Hindsight connects as a PostgreSQL client:

1. Create or open a Supabase project.
2. Set or retrieve the database password.
3. Open the project Dashboard and select **Connect**.
4. Copy a runtime PostgreSQL URL:
   - Direct connection on port `5432` when the machine supports IPv6 or the project has IPv4 support.
   - Shared Pooler **Session mode** on port `5432` for an IPv4-only machine.
5. Copy the Direct connection URL on port `5432` for migrations when it is reachable.
6. Enter those values during `intentir onboard`.

Intentir stores them as:

```text
HINDSIGHT_API_DATABASE_URL=<runtime PostgreSQL URL>
HINDSIGHT_API_MIGRATION_DATABASE_URL=<direct migration PostgreSQL URL>
```

Avoid the Transaction pooler on port `6543` for this persistent Hindsight process and for migrations.
Connection URLs contain the database password and are stored in the user config with file mode `0600`.

Then initialize each repository separately:

```bash
cd /path/to/portal-api
intentir init --bank customer-portal
```

The bank ID is the shared Hindsight memory boundary. Agents and computers using the same Hindsight
backend and bank ID share project memory. Different bank IDs remain isolated. CodeGraph is still indexed
locally on each computer.

`intentir init` also creates `.mcp.json` in the project root (or merges the `intentir` entry into an
existing file). Pi, Claude Code, Cursor, and other agents that read `.mcp.json` discover Intentir
automatically after init.

Add Intentir to your MCP client — either tell your agent to do it, or create a config file:

```text
# Tell any supported agent:
Add Intentir as an MCP server with command "intentir".
```

The agent creates the appropriate config. Or do it yourself:

```json
{
  "mcpServers": {
    "intentir": {
      "command": "intentir"
    }
  }
}
```

`INTENTIR_REPOSITORY_ROOT` defaults to the agent's working directory and is not needed
when the agent starts in the repository root.

Restart the MCP client. Your agent discovers Intentir's tools and maps natural language
to the right MCP tool automatically. Try these in your agent:

```text
# Code exploration → code_search, code_callers, code_callees, code_dependencies
Show callers and dependencies of AuthService.
Find where password hashing is implemented.

# Project memory → memory_recall, memory_retain, memory_review, memory_forget
Remember that database migrations must be backward compatible.
Search project memory for authentication patterns.
Show me the shared memories for this project.
That memory is incorrect. Forget it.

# Combined context → intent_context (memory + code graph in parallel)
Find the authentication flow using project memory and the code graph.

# Health check → intentir_health
Check Intentir health.
```

To try Intentir without installing it globally:

```bash
npx -y github:runchr-works/intentir
```

## Repository Commands

Hindsight is configured once during onboarding. Each repository must then be initialized with an explicit
bank ID. The command stores the bank ID in `.intentir/config.json`, creates (or merges into) `.mcp.json`,
and initializes the local CodeGraph index:

```bash
intentir init [path] --bank <bank-id>
```

After initialization, manage the repository workspace with:

```bash
intentir workspace status [path]
intentir workspace sync [path]
intentir workspace remove [path]
intentir workspace remove --purge-graph [path]
```

`[path]` is optional and defaults to the current directory. `--bank` is required. Without repository
initialization, Intentir does not expose Hindsight or CodeGraph tools for that repository. If repository
configuration is written but CodeGraph initialization fails, Hindsight remains available and code tools
return `workspace_not_initialized`.

Run installation diagnostics:

```bash
intentir doctor
intentir doctor --json
```

## Hindsight Daemon

Onboarding can start the managed local Hindsight process, but that detached process is not registered to
start again after a reboot. Use these commands to manage it manually:

```bash
intentir daemon start          # start in the background and wait until healthy
intentir daemon start --no-wait
intentir daemon status
intentir daemon stop
intentir daemon run            # foreground mode for an OS service manager
```

`daemon start` can take time on its first run while `uvx` downloads Hindsight and Hindsight initializes
its database. `daemon run` is intended for the operating-system configurations below. These commands are
unavailable when onboarding was configured to use an existing Hindsight server, except that
`daemon status` can still check that server's health. Manage the external server separately.

### Linux: systemd user service

Find the absolute executable path with `command -v intentir`, then create
`~/.config/systemd/user/intentir-hindsight.service`:

```ini
[Unit]
Description=Intentir Hindsight daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/absolute/path/to/intentir daemon run
Environment=PATH=/absolute/node/bin:/home/USER/.local/bin:/usr/local/bin:/usr/bin:/bin
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Replace `ExecStart` with the path returned by `command -v intentir`. Set `PATH` so it includes the
directories reported by `dirname "$(command -v node)"` and `dirname "$(command -v uvx)"`, then enable
the service:

```bash
systemctl --user daemon-reload
systemctl --user enable --now intentir-hindsight.service
systemctl --user status intentir-hindsight.service
journalctl --user -u intentir-hindsight.service -f
```

The user service starts when you log in. To start it before login, enable lingering with
`loginctl enable-linger "$USER"` if your system permits it. Paths installed through a Node version
manager can change after a Node upgrade; update `ExecStart` when that happens.

If your Linux environment does not use systemd, or you are on WSL, run `intentir daemon run` from a
session startup hook instead. A simple fallback is `crontab -e` with:

```cron
@reboot /absolute/path/to/intentir daemon run >> /home/USER/.config/intentir/hindsight.log 2>&1
```

Keep the same `PATH` caveat in mind: the process must be able to find `uvx` and any Node-managed
executables. If `@reboot` is unreliable in your environment, start it from your shell profile or
desktop session startup instead.

### macOS: launchd

Find the absolute executable path with `command -v intentir`, then create
`~/Library/LaunchAgents/io.intentir.hindsight.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>io.intentir.hindsight</string>
  <key>ProgramArguments</key>
  <array>
    <string>/absolute/path/to/intentir</string>
    <string>daemon</string>
    <string>run</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/absolute/node/bin:/Users/NAME/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

Replace the executable path and set `PATH` so it includes the directories containing `node` and `uvx`,
then load it:

```bash
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/io.intentir.hindsight.plist
launchctl kickstart -k "gui/$(id -u)/io.intentir.hindsight"
```

Remove it with:

```bash
launchctl bootout "gui/$(id -u)" ~/Library/LaunchAgents/io.intentir.hindsight.plist
```

### Windows: Task Scheduler

Run `Get-Command intentir.cmd` in PowerShell to find the absolute path. In Task Scheduler, create a task
with:

- Trigger: **At log on**
- Program: `C:\Windows\System32\cmd.exe`
- Arguments: `/d /c ""C:\absolute\path\to\intentir.cmd" daemon run"`
- Settings: enable automatic restart after failure

Start the task once, then verify it with `intentir daemon status`. If the npm global directory changes
after a Node upgrade, update the command path in the task.

Remove global Intentir configuration while preserving Hindsight data and repository indexes:

```bash
intentir uninstall
```

Use `intentir uninstall --purge` only to delete the managed local pg0 data as well.

## Identity and Isolation

Intentir uses the repository's configured Hindsight bank ID without deriving additional banks:

```text
bankId
```

`bankId` comes from `.intentir/config.json`, created by `intentir init --bank <bank-id>`. Codex, Claude,
Cursor, and other configured clients use that same bank. Intentir does not append repository or agent
identifiers.

## Memory Metadata

Recall results use normalized metadata:

```text
provider, bank, revision, confidence, freshness,
evidenceRefs, createdByAgent, policyVersion
```

These fields reflect metadata returned by Hindsight.

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `intent_context` | Retrieve Hindsight memory and CodeGraph context in parallel |
| `memory_recall` | Search the configured Hindsight bank |
| `memory_retain` | Store memory in the configured Hindsight bank |
| `memory_review` | List retained sources and original content |
| `memory_forget` | Delete a source and its extracted memory units |
| `code_search` | Search local indexed symbols |
| `code_callers` | Find callers of a symbol |
| `code_callees` | Find callees of a symbol |
| `code_dependencies` | Combine callers, callees, and impact traversal |
| `intentir_health` | Check Hindsight and CodeGraph provider health |

`intent_context` returns partial results when one provider is unavailable.

## Supported Agent Clients

Intentir's support matrix follows the upstream Hindsight and CodeGraph documentation instead of assuming
that every MCP client has a first-party integration.

| Agent | Hindsight upstream | CodeGraph upstream | Intentir connection |
| --- | --- | --- | --- |
| Codex | Dedicated hooks integration | Documented | Native stdio MCP |
| Claude Code | Dedicated plugin/hooks integration | Documented | Native stdio MCP |
| Cursor | Generic MCP-compatible | Documented | Native stdio MCP |
| OpenCode (`openmcode`) | Generic MCP-compatible | Documented | Native stdio MCP |
| Gemini CLI | Generic MCP-compatible | Documented | Native stdio MCP |
| Antigravity | Generic MCP-compatible | Documented | Raw MCP config, experimental |
| Kiro | Generic MCP-compatible | Documented | Native stdio MCP |
| Hermes Agent | Community integration | Documented | Native stdio MCP |
| Reasonix (`resonix`) | Generic MCP-compatible | Not explicitly documented | Native stdio MCP |
| Pi | Not explicitly documented | Not explicitly documented | via pi-mcp-adapter |

Reasonix is the DeepSeek-native terminal coding agent listed in the
[DeepSeek API documentation](https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix).
Its native stdio MCP support makes it compatible with Intentir, but that does not mean CodeGraph currently
claims a dedicated Reasonix integration.

List integrations or generate a client-specific configuration:

```bash
intentir agents list
intentir agents config codex --root /path/to/repo
intentir agents config claude-code --root /path/to/repo
intentir agents config reasonix --root /path/to/repo
intentir agents config pi --root /path/to/repo
```

### Pi Setup

Pi uses [pi-mcp-adapter](https://github.com/nicopreme/pi-mcp-adapter) to bridge stdio MCP servers.
Install it from within Pi:

```text
# Tell Pi (this runs inside Pi, not in a regular terminal):
pi install npm:pi-mcp-adapter
```

After running `intentir init --bank <bank-id>`, `.mcp.json` is already in the project root.
If you haven't run init yet, tell Pi to create the config:

```text
# Tell Pi:
Add Intentir as an MCP server with command "intentir". Save it as project .mcp.json.
```

A working `.mcp.json` looks like:

```json
{
  "mcpServers": {
    "intentir": {
      "command": "intentir"
    }
  }
}
```

Restart Pi and use `/mcp` to inspect connected servers. Give the agent natural language
instructions as shown above — it calls the MCP tools on demand.

All configured clients for the same repository use the same bank.

Upstream references:

- [Hindsight integrations](https://hindsight.vectorize.io/integrations)
- [Hindsight multi-agent shared memory](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory)
- [CodeGraph supported agents](https://colbymchenry.github.io/codegraph/)
- [Reasonix MCP configuration](https://esengine.github.io/DeepSeek-Reasonix/configuration.html)

## Configuration

Common optional variables:

| Variable | Default | Description |
| --- | --- | --- |
| `INTENTIR_REPOSITORY_ROOT` | Current directory | Repository containing `.codegraph` |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API URL |
| `HINDSIGHT_API_KEY` | Empty | Hindsight bearer token |
| `HINDSIGHT_TENANT` | `default` | Hindsight tenant |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph executable |
| `CODEGRAPH_ARGS` | `serve,--mcp` | Comma-separated CodeGraph arguments |

See [.env.example](.env.example) for the complete list.

## Troubleshooting

Run `intentir_health` first.

- Hindsight unavailable: verify `HINDSIGHT_BASE_URL`, credentials, and `curl /health`.
- CodeGraph unavailable: run `codegraph status` in `INTENTIR_REPOSITORY_ROOT`; initialize with
  `intentir init --bank <bank-id>` if needed.

## Open Source Acknowledgements

Intentir exists because of the work of these open-source communities:

| Project | Role in Intentir | License |
| --- | --- | --- |
| [Hindsight](https://github.com/vectorize-io/hindsight) by Vectorize | Long-term memory service, banks, recall, and document lifecycle | MIT |
| [CodeGraph](https://github.com/colbymchenry/codegraph) by Colby Mchenry | Local code graph, symbol search, call relationships, and impact analysis | MIT |
| [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MCP server and client transports | MIT |
| [Zod](https://github.com/colinhacks/zod) | Runtime schemas and tool input validation | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | Language and compiler | Apache-2.0 |
| [Vitest](https://github.com/vitest-dev/vitest) | Test runner | MIT |

Hindsight and CodeGraph remain independent external providers. Intentir does not fork or redistribute
their implementations; users install and run them under their respective licenses.

Thank you to the maintainers and contributors of these projects. Their work made it possible to build
Intentir as a small composition and policy layer instead of recreating memory, code intelligence, and MCP
infrastructure.

## License

Intentir is licensed under the [Apache License 2.0](LICENSE). Third-party projects remain subject to their
own licenses.

## Development

```bash
git clone https://github.com/runchr-works/intentir.git
cd intentir
npm install
npm run check
npm test
npm run smoke
```
