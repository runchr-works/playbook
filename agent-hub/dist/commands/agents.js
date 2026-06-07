import path from "node:path";
import { AGENTS, agentConfig, findAgent } from "../agents.js";
function option(args, name) {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}
export function agentsCommand(action, args) {
    if (!action || action === "list") {
        console.log(JSON.stringify(AGENTS, null, 2));
        return;
    }
    if (action === "config") {
        const requested = args[0];
        if (!requested)
            throw new Error("Usage: agent-hub agents config <agent> [--root <path>]");
        const agent = findAgent(requested);
        if (!agent)
            throw new Error(`Unsupported agent: ${requested}. Run \`agent-hub agents list\`.`);
        const repositoryRoot = path.resolve(option(args, "--root") ?? process.cwd());
        console.log(`# ${agent.name}`);
        console.log(`# Hindsight upstream: ${agent.hindsightSupport}`);
        console.log(`# CodeGraph upstream: ${agent.codegraphSupport}`);
        console.log(`# Config: ${agent.configLocation}`);
        console.log(agentConfig(agent, repositoryRoot));
        return;
    }
    throw new Error("Usage: agent-hub agents <list|config>");
}
//# sourceMappingURL=agents.js.map