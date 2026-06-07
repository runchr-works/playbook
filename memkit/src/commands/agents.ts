import path from "node:path";
import { AGENTS, findAgent } from "../agents.js";
import {
  configureProjectAgent,
  configureGlobalContextMode,
  normalizeAgentIds,
  renderAgentConfig,
} from "../agent-config.js";
import { loadUserConfig, saveUserConfig } from "../user-config.js";
import { workspaceState } from "../workspace.js";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function agentsCommand(action: string | undefined, args: string[]): void {
  if (!action || action === "list") {
    console.log(JSON.stringify(AGENTS, null, 2));
    return;
  }
  if (action === "config") {
    const requested = args[0];
    if (!requested) throw new Error("Usage: memkit agents config <agent> [--root <path>]");
    const agent = findAgent(requested);
    if (!agent) throw new Error(`Unsupported agent: ${requested}. Run \`memkit agents list\`.`);
    const repositoryRoot = path.resolve(option(args, "--root") ?? process.cwd());
    console.log(`# ${agent.name}`);
    console.log(`# Hindsight upstream: ${agent.hindsightSupport}`);
    console.log(`# CodeGraph upstream: ${agent.codegraphSupport}`);
    console.log(`# Config: ${agent.configLocation}`);
    console.log(renderAgentConfig(agent, repositoryRoot, {
      hindsightUrl: "http://localhost:8888/mcp/<bank-id>/",
      codegraphCommand: "codegraph",
      codegraphArgs: ["serve", "--mcp"],
    }));
    return;
  }
  if (action === "select") {
    const requested = args.flatMap((value) => value.split(",")).filter(Boolean);
    const agents = normalizeAgentIds(requested);
    if (agents.length === 0) {
      throw new Error("Usage: memkit agents select <agent>[,<agent>...]");
    }
    const config = loadUserConfig();
    if (!config) throw new Error("Run `memkit onboard` before selecting agents");
    config.agents = agents;
    config.updatedAt = new Date().toISOString();
    saveUserConfig(config);
    const contextMode = agents.map((agentId) => configureGlobalContextMode(agentId));
    console.log(JSON.stringify({ agents, contextMode }, null, 2));
    return;
  }
  if (action === "apply") {
    const positional = args.find((value) => !value.startsWith("-"));
    const repositoryRoot = path.resolve(option(args, "--root") ?? positional ?? process.cwd());
    const workspace = workspaceState(repositoryRoot);
    if (!workspace.config) {
      throw new Error("Workspace is not initialized. Run `memkit init --bank <bank-id>` first");
    }
    const config = loadUserConfig();
    if (!config) throw new Error("Run `memkit onboard` before applying agent configuration");
    const baseUrl = config.env.HINDSIGHT_BASE_URL;
    const connections = {
      ...(baseUrl
        ? {
            hindsightUrl:
              `${baseUrl.replace(/\/$/, "")}/mcp/${encodeURIComponent(workspace.config.bankId)}/`,
          }
        : {}),
      codegraphCommand: process.env.CODEGRAPH_COMMAND ?? "codegraph",
      codegraphArgs: process.env.CODEGRAPH_ARGS?.split(",").filter(Boolean) ?? ["serve", "--mcp"],
    };
    const results = (config.agents ?? []).map((agentId) =>
      configureProjectAgent(agentId, repositoryRoot, connections)
    );
    console.log(JSON.stringify({ repositoryRoot, agents: results }, null, 2));
    return;
  }
  throw new Error("Usage: memkit agents <list|config|select|apply>");
}
