#!/usr/bin/env node
import { doctorCommand } from "./commands/doctor.js";
import { onboardCommand } from "./commands/onboard.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { workspaceCommand } from "./commands/workspace.js";
import { agentsCommand } from "./commands/agents.js";

function debug(message: string): void {
  if (process.env.AGENT_HUB_DEBUG === "true") console.error(`agent-hub: ${message}`);
}

async function main(): Promise<void> {
  const [command, action, ...args] = process.argv.slice(2);

  if (command === "onboard") {
    await onboardCommand();
    return;
  }
  if (command === "init") {
    await workspaceCommand("init", [action, ...args].filter((value): value is string => Boolean(value)));
    return;
  }
  if (command === "workspace") {
    if (action === "init") {
      throw new Error("Use `agent-hub init [path] --bank <bank-id>` to initialize a repository.");
    }
    await workspaceCommand(action, args);
    return;
  }
  if (command === "agents") {
    agentsCommand(action, args);
    return;
  }
  if (command === "doctor") {
    await doctorCommand(action === "--json" || args.includes("--json"));
    return;
  }
  if (command === "uninstall") {
    uninstallCommand(action === "--purge" || args.includes("--purge"));
    return;
  }
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (!command || command === "serve" || command === "--mcp") {
    console.error("agent-hub is a setup CLI, not an MCP server.");
    console.error("Run `agent-hub onboard` to install and configure your MCP tools.");
    console.error("Then your agent connects directly to Hindsight, CodeGraph, and context-mode.");
    console.error("See `agent-hub help` for all commands.");
    process.exitCode = 1;
    return;
  }
  throw new Error(`Unknown command: ${command}. Run \`agent-hub help\`.`);
}

function printHelp(): void {
  console.log(`agent-hub

Usage:
  agent-hub onboard                Install and configure MCP tools for your agent
  agent-hub init [path] --bank <bank-id>
                                    Initialize repository memory and CodeGraph
  agent-hub workspace status        Show workspace and CodeGraph status
  agent-hub workspace sync          Sync the CodeGraph index
  agent-hub workspace remove        Remove agent-hub workspace state
  agent-hub agents list             List supported agent clients
  agent-hub agents config <agent>   Print an MCP configuration for an agent
  agent-hub doctor [--json]         Diagnose the installation and current workspace
  agent-hub uninstall [--purge]     Remove global agent-hub configuration
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
