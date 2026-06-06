# Intentir

[한국어](README.ko.md)

Intentir gives multiple coding agents one MCP interface for shared memory and local code intelligence.
It combines [Hindsight](https://github.com/vectorize-io/hindsight) and
[CodeGraph](https://github.com/colbymchenry/codegraph) without forking either project.

- Each agent keeps private memories.
- Useful memories can be promoted to shared project memory automatically or explicitly.
- Users can review and remove incorrect memories.
- Repository code and the CodeGraph index stay on the local machine.
- Hindsight can store shared memory in Supabase PostgreSQL.

## Prerequisites

- Node.js 22.5 or newer
- [`uv`](https://docs.astral.sh/uv/) when Intentir should manage a local Hindsight process

The onboarding command installs CodeGraph when needed and configures Hindsight. Supabase is configured as
Hindsight's PostgreSQL database; Intentir never accesses Supabase directly.

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

## Quick Start

Run the interactive onboarding:

```bash
npx github:runchr-works/intentir onboard
```

It asks for:

- Hindsight storage: embedded local pg0, Supabase PostgreSQL, or an existing server
- Hindsight LLM provider, model, API key, and optional base URL
- Whether automatic promotion is enabled
- Whether promotion should reuse the Hindsight LLM
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

Automatic promotion currently requires an OpenAI-compatible chat-completions endpoint. Onboarding offers
LLM reuse only for compatible providers such as OpenAI, Groq, OpenRouter, Ollama, and LM Studio.
Anthropic, Gemini, Codex subscription, and Claude Code can still power Hindsight, but automatic promotion
needs a separate compatible endpoint.

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
npx github:runchr-works/intentir workspace init --org acme --project customer-portal
```

Add Intentir to your MCP client:

```json
{
  "mcpServers": {
    "intentir": {
      "command": "npx",
      "args": ["-y", "github:runchr-works/intentir"],
      "env": {
        "INTENTIR_AGENT_ID": "codex",
        "INTENTIR_REPOSITORY_ROOT": "/absolute/path/to/portal-api"
      }
    }
  }
}
```

Restart the MCP client, then ask the agent:

```text
Check Intentir health.
Find the authentication flow using project memory and the code graph.
Remember that database migrations must be backward compatible.
Show me the shared memories for this project.
Promote that memory to shared project memory.
That memory is incorrect. Forget it.
Show callers and dependencies of AuthService.
```

Run directly from GitHub:

```bash
npx github:runchr-works/intentir
```

Or install globally:

```bash
npm install --global github:runchr-works/intentir
intentir onboard
```

## Workspace Commands

Hindsight is configured once during onboarding. It is not initialized per repository. CodeGraph and
repository identity are managed per workspace:

```bash
intentir workspace init [path]     # create identity and run codegraph init -i
intentir workspace status [path]   # inspect identity and graph status
intentir workspace sync [path]     # update the CodeGraph index
intentir workspace remove [path]   # remove .intentir, preserve .codegraph
intentir workspace remove --purge-graph [path]
```

Without `workspace init`, memory tools can still work when all identity environment variables are supplied
manually. Code tools return `workspace_not_initialized`, and `intent_context` returns memory with a
CodeGraph error.

Run installation diagnostics:

```bash
intentir doctor
intentir doctor --json
```

Remove global Intentir configuration while preserving Hindsight data and repository indexes:

```bash
intentir uninstall
```

Use `intentir uninstall --purge` only to delete the managed local pg0 data as well.

## Automatic Promotion

`memory_retain` always stores new content in the agent-private bank first. To enable asynchronous automatic
promotion, configure an OpenAI-compatible model:

```json
{
  "PROMOTION_ENABLED": "true",
  "PROMOTION_LLM_BASE_URL": "https://api.openai.com/v1",
  "PROMOTION_LLM_API_KEY": "...",
  "PROMOTION_LLM_MODEL": "...",
  "PROMOTION_CONFIDENCE_THRESHOLD": "0.85"
}
```

The worker blocks likely secrets, personal data, speculative claims, and temporary state before calling the
model. Explicit `memory_promote` requests skip the model decision but still pass the deterministic security
checks.

## Identity and Isolation

Intentir identifies a caller through:

```text
orgId -> projectId -> workspaceId -> repositoryId -> agentId -> sessionId
```

Organization, project, workspace, and repository identity normally come from
`.intentir/config.json`, created by `workspace init`. `agentId` comes from onboarding or the MCP environment.
`sessionId` is optional and generated per call when omitted.

## Memory Metadata

Recall results use normalized metadata:

```text
provider, scope, bank, repository, revision, confidence, freshness,
evidenceRefs, createdByAgent, policyVersion
```

Callers may provide `confidence`, `freshness`, `evidenceRefs`, and `repositoryRevision` when retaining
memory. Intentir derives `createdByAgent` and `policyVersion`.

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `intent_context` | Retrieve Hindsight memory and CodeGraph context in parallel |
| `memory_recall` | Search private and shared memory |
| `memory_retain` | Store a private memory and optionally queue automatic promotion |
| `memory_promote` | Explicitly promote a private memory using its `sourceId` |
| `memory_review` | List private or shared memory sources and original content |
| `memory_forget` | Delete a source and its extracted memory units, then cancel pending promotion |
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
| Pi | Not explicitly documented | Not explicitly documented | Community adapter required |

Reasonix is the DeepSeek-native terminal coding agent listed in the
[DeepSeek API documentation](https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix).
Its native stdio MCP support makes it compatible with Intentir, but that does not mean CodeGraph currently
claims a dedicated Reasonix integration.

List integrations or generate a client-specific configuration:

```bash
intentir agents list
intentir agents config codex --persona backend-engineer --root /path/to/repo
intentir agents config claude-code --persona backend-engineer --root /path/to/repo
intentir agents config reasonix --persona code-reviewer --root /path/to/repo
```

`agentId` is a logical persona, not necessarily the client product. Use the same persona when Codex and
Claude should share agent-private memory, or different personas when their private experience should stay
isolated. Repository knowledge still converges in the project-shared bank.

Upstream references:

- [Hindsight integrations](https://hindsight.vectorize.io/integrations)
- [Hindsight multi-agent shared memory](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory)
- [CodeGraph supported agents](https://colbymchenry.github.io/codegraph/)
- [Reasonix MCP configuration](https://esengine.github.io/DeepSeek-Reasonix/configuration.html)

## Configuration

Required variables:

| Variable | Description |
| --- | --- |
| `INTENTIR_AGENT_ID` | Current agent identity |

`INTENTIR_ORG_ID`, `INTENTIR_PROJECT_ID`, `INTENTIR_WORKSPACE_ID`, and `INTENTIR_REPOSITORY_ID` are required
only when no workspace config is available.

Common optional variables:

| Variable | Default | Description |
| --- | --- | --- |
| `INTENTIR_REPOSITORY_ROOT` | Current directory | Repository containing `.codegraph` |
| `INTENTIR_REPOSITORY_REVISION` | Empty | Commit SHA or revision recorded in memory metadata |
| `HINDSIGHT_BASE_URL` | `http://localhost:8888` | Hindsight API URL |
| `HINDSIGHT_API_KEY` | Empty | Hindsight bearer token |
| `HINDSIGHT_TENANT` | `default` | Hindsight tenant |
| `CODEGRAPH_COMMAND` | `codegraph` | CodeGraph executable |
| `CODEGRAPH_ARGS` | `serve,--mcp` | Comma-separated CodeGraph arguments |
| `PROMOTION_ENABLED` | `true` | Enable automatic promotion when model settings exist |
| `PROMOTION_DATABASE_PATH` | `.intentir/outbox.db` | Local durable promotion state |
| `PROMOTION_CONFIDENCE_THRESHOLD` | `0.85` | Minimum automatic-promotion confidence |

See [.env.example](.env.example) for the complete list.

## Troubleshooting

Run `intentir_health` first.

- Hindsight unavailable: verify `HINDSIGHT_BASE_URL`, credentials, and `curl /health`.
- CodeGraph unavailable: run `codegraph status` in `INTENTIR_REPOSITORY_ROOT`; initialize with
  `intentir workspace init` if needed.
- Automatic promotion inactive: set both `PROMOTION_LLM_API_KEY` and `PROMOTION_LLM_MODEL`.
- Memory not found during promotion: use the `sourceId` returned by `memory_retain` or `memory_review` with
  the same organization, project, workspace, repository, and agent identity.

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
