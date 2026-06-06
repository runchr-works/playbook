#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { IntentirGateway } from "./gateway.js";
import { CodeGraphProvider, DisabledCodeProvider, } from "./providers/codegraph.js";
import { HindsightProvider } from "./providers/hindsight.js";
import { OpenAICompatiblePromotionClassifier } from "./promotion/classifier.js";
import { PromotionOutbox } from "./promotion/outbox.js";
import { PromotionWorker } from "./promotion/worker.js";
import { startMcpServer } from "./server.js";
import { doctorCommand } from "./commands/doctor.js";
import { onboardCommand } from "./commands/onboard.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { workspaceCommand } from "./commands/workspace.js";
import { agentsCommand } from "./commands/agents.js";
function debug(message) {
    if (process.env.INTENTIR_DEBUG === "true")
        console.error(`intentir: ${message}`);
}
async function runServer() {
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
    const outbox = new PromotionOutbox(config.promotion.databasePath);
    let worker;
    if (config.promotion.enabled && config.promotion.llm) {
        const classifier = new OpenAICompatiblePromotionClassifier(config.promotion.llm);
        worker = new PromotionWorker(outbox, memory, classifier, config.promotion.confidenceThreshold, config.promotion.pollIntervalMs);
        worker.start();
    }
    else if (config.promotion.enabled) {
        console.error("intentir: automatic promotion disabled because PROMOTION_LLM_API_KEY or PROMOTION_LLM_MODEL is missing");
    }
    const gateway = new IntentirGateway(memory, code, outbox, Boolean(config.promotion.enabled && config.promotion.llm), config.repositoryRevision);
    debug("connecting MCP stdio transport");
    await startMcpServer(config, gateway);
    debug(`MCP transport connected; stdin ended=${process.stdin.readableEnded}`);
    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        await worker?.stop();
        outbox?.close();
        await code.close();
    };
    process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
    process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
    const keepAlive = setInterval(() => { }, 2 ** 30);
    await new Promise((resolve) => {
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
async function main() {
    const [command, action, ...args] = process.argv.slice(2);
    if (!command || command === "serve" || command === "--mcp") {
        await runServer();
        return;
    }
    if (command === "onboard") {
        await onboardCommand();
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
function printHelp() {
    console.log(`Intentir

Usage:
  intentir                         Start the MCP server
  intentir onboard                Configure Hindsight, LLMs, and CodeGraph
  intentir workspace init [path]  Initialize repository identity and CodeGraph
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
//# sourceMappingURL=cli.js.map