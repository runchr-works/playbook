import path from "node:path";
import { AGENTS, agentConfig, findAgent } from "../agents.js";

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
    if (!requested) throw new Error("Usage: intentir agents config <agent> [--persona <id>] [--root <path>]");
    const agent = findAgent(requested);
    if (!agent) {
      throw new Error(
        `Unsupported agent: ${requested}. Run \`npx -y github:runchr-works/intentir agents list\`.`,
      );
    }
    const persona = option(args, "--persona") ?? agent.id;
    const repositoryRoot = path.resolve(option(args, "--root") ?? process.cwd());
    console.log(`# ${agent.name} (${agent.intentirTransport})`);
    console.log(`# Hindsight upstream: ${agent.hindsightSupport}`);
    console.log(`# CodeGraph upstream: ${agent.codegraphSupport}`);
    console.log(`# Config: ${agent.configLocation}`);
    console.log(`# Persona: ${persona}`);
    console.log(agentConfig(agent, persona, repositoryRoot));
    return;
  }
  throw new Error("Usage: intentir agents <list|config>");
}
