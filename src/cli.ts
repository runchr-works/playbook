#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { IntentirGateway } from "./gateway.js";
import {
  CodeGraphProvider,
  DisabledCodeProvider,
} from "./providers/codegraph.js";
import { HindsightProvider } from "./providers/hindsight.js";
import { startMcpServer } from "./server.js";
import { doctorCommand } from "./commands/doctor.js";
import { onboardCommand } from "./commands/onboard.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { workspaceCommand } from "./commands/workspace.js";
import { agentsCommand } from "./commands/agents.js";

function debug(message: string): void {
  if (process.env.INTENTIR_DEBUG === "true") console.error(`intentir: ${message}`);
}

async function runServer(): Promise<void> {
  debug("loading configuration");
  const config = loadConfig();
  const memory = new HindsightProvider(config.hindsight);
  const code = config.workspace.initialized
    ? new CodeGraphProvider({
        command: config.codegraph.command,
        args: config.codegraph.args,
        cwd: config.repositoryRoot,
        timeoutMs: config.codegraph.timeoutMs,
      })
    : new DisabledCodeProvider(config.workspace.reasons);

  const gateway = new IntentirGateway(memory, code);
  debug("connecting MCP stdio transport");
  await startMcpServer(config, gateway);
  debug(`MCP transport connected; stdin ended=${process.stdin.readableEnded}`);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await code.close();
  };
  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

  const keepAlive = setInterval(() => {}, 2 ** 30);
  await new Promise<void>((resolve) => {
    process.stdin.once("end", () => {
      debug("stdin ended");
      resolve();
    });
    process.stdin.once("close", () => {
      debug("stdin closed");
      resolve();
    });
  });
  clearInterval(keepAlive);
  await shutdown();
}

async function main(): Promise<void> {
  const [command, action, ...args] = process.argv.slice(2);
  if (!command || command === "serve" || command === "--mcp") {
    await runServer();
    return;
  }
  if (command === "onboard") {
    await onboardCommand();
    return;
  }
  if (command === "init") {
    await workspaceCommand("init", [action, ...args].filter((value): value is string => Boolean(value)));
    return;
  }
  if (command === "workspace") {
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
  throw new Error(`Unknown command: ${command}. Run \`intentir help\`.`);
}

function printHelp(): void {
  console.log(`Intentir

Usage:
  intentir                         Start the MCP server
  intentir onboard                Configure Hindsight, LLMs, and CodeGraph
  intentir init [path] --bank <bank-id>
                                  Initialize repository memory and CodeGraph
  intentir workspace init [path] --bank <bank-id>
                                  Alias for intentir init
  intentir workspace status       Show workspace and CodeGraph status
  intentir workspace sync         Sync the CodeGraph index
  intentir workspace remove       Remove Intentir workspace state
  intentir agents list            List supported agent clients
  intentir agents config <agent>  Print an MCP configuration for an agent
  intentir doctor [--json]        Diagnose the installation and current workspace
  intentir uninstall [--purge]    Remove global Intentir configuration
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
