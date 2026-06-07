# Playbook

**runchr shared monorepo** — conventions, tools, and documentation for how we build.

## What's here

| Package | Description |
|---------|-------------|
| [memkit](./memkit) | One-step setup for coding agent MCP tools |

## Philosophy

We build products. Along the way, we find tools, patterns, and conventions that
actually work. Playbook is where we share them — not as theory, but as things we
use every day.

Current focus: giving coding agents direct access to the best MCP tools —
Hindsight for memory, CodeGraph for code intelligence, and context-mode for
session tracking. No thin proxies, no filtered features.

## Development

```bash
git clone https://github.com/runchr-works/playbook.git
cd playbook/memkit
npm install
npm run check
npm test
```
