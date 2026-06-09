#!/usr/bin/env node
import { doctorCommand } from "./commands/doctor.js";
import { onboardCommand } from "./commands/onboard.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { workspaceCommand } from "./commands/workspace.js";
import { agentsCommand } from "./commands/agents.js";
function debug(message) {
    if (process.env.MEMKIT_DEBUG === "true")
        console.error(`memkit: ${message}`);
}
async function main() {
    const [command, action, ...args] = process.argv.slice(2);
    if (command === "onboard") {
        await onboardCommand();
        return;
    }
    if (command === "init") {
        await workspaceCommand("init", [action, ...args].filter((value) => Boolean(value)));
        return;
    }
    if (command === "workspace") {
        if (action === "init") {
            throw new Error("Use `memkit init [path] --bank <bank-id>` to initialize a repository.");
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
        console.error("memkit is a setup CLI, not an MCP server.");
        console.error("Run `memkit onboard` to install and configure your MCP tools.");
        console.error("Then your agent connects directly to Hindsight, CodeGraph, context-mode, and rtk.");
        console.error("See `memkit help` for all commands.");
        process.exitCode = 1;
        return;
    }
    throw new Error(`Unknown command: ${command}. Run \`memkit help\`.`);
}
function printHelp() {
    console.log(`memkit

Usage:
  memkit onboard                Install and configure MCP tools for your agent
  memkit init [path] --bank <bank-id>
                                    Initialize repository memory and CodeGraph
  memkit workspace status        Show workspace and CodeGraph status
  memkit workspace sync          Sync the CodeGraph index
  memkit workspace remove        Remove memkit workspace state
  memkit agents list             List supported agent clients
  memkit agents select <agents>  Select agents and configure global context-mode
  memkit agents apply [path]     Write selected agents' repository configurations
  memkit agents config <agent>   Print an MCP configuration for an agent
  memkit doctor [--json]         Diagnose the installation and current workspace
  memkit uninstall [--purge]     Remove global memkit configuration
`);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map