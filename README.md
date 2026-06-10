# Playbook

**runchr shared monorepo** — conventions, tools, and documentation for how we build.

## What's here
### Packages
| Package | Description |
|---------|-------------|
| [memkit](./memkit) | One-step setup for coding agent MCP tools |

### Favorites
| Favorite | Description |
|---------|-------------|
| [makeable.me](https://makeable.me/en) | Makeable extracts the design system and recreates the visible frontend as editable React code. |
| [designmd](https://www.designmd.supply/) | A supply of design md, generated. Drop in any public domain — get back a Google-spec DESIGN.md ready to feed an AI agent. |
| [herdr](https://herdr.dev/) | Herdr is an agent runtime that runs inside your terminal. Keep your shell, SSH setup, fonts, and keybinds; add tmux-style persistence, mouse-native panes, blocked, working, and done agent state, and an API agents can drive. |
| [ui-skills](https://www.ui-skills.com/) | Skills for Design Engineers |
| [skillui](https://skillui.vercel.app/) | Point skillui at any URL, repo, or folder. Get exact colors, fonts, spacing, components, animations, and scroll journeys packaged as a .skill file. Then open Claude Code and build the UI. |
| [moonpi](https://github.com/galatolofederico/moonpi) | opinionated set of extensions for pi |

#### Skills
- https://github.com/garrytan/gstack
- http://github.com/obra/superpowers
- http://github.com/EveryInc/compound-engineering-plugin

## Tips
### Pi mono
- https://pi.dev/packages/pi-intercom
- https://pi.dev/packages/pi-subagents
- https://pi.dev/packages/pi-web-access
- https://pi.dev/packages/pi-lens
- https://pi.dev/packages/@juicesharp/rpiv-ask-user-question
- https://pi.dev/packages/@juicesharp/rpiv-todo
- https://pi.dev/packages/pi-mcp-adapter
- https://pi.dev/packages/context-mode
- https://pi.dev/packages/pi-observational-memory
- https://pi.dev/packages/pi-bar

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
