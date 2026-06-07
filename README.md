# Playbook

**runchr shared monorepo** — conventions, tools, and documentation for how we build.

## What's here

| Package | Description |
|---------|-------------|
| [agent-hub](./agent-hub) | One-step setup for coding agent MCP tools |

## Philosophy

We use MCP (Model Context Protocol) to give our coding agents direct access to the
best tools available. No thin proxies, no filtered features — agents connect directly
to Hindsight for memory, CodeGraph for code intelligence, and context-mode for
session tracking.

**agent-hub** handles the setup complexity so humans don't have to.

## Getting Started

```bash
# Install agent-hub
npm install -g github:runchr-works/playbook

# Run onboarding
agent-hub onboard

# Initialize a repository
cd /path/to/project
agent-hub init --bank <bank-id>
```

## Development

```bash
git clone https://github.com/runchr-works/playbook.git
cd playbook/agent-hub
npm install
npm run check
npm test
```
