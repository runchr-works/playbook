import path from "node:path";
import { removeWorkspaceState, workspaceState, writeMcpJson, writeWorkspaceConfig, } from "../workspace.js";
import { runCommand } from "./process.js";
function option(args, name) {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}
function parse(args) {
    const valueOptions = new Set(["--bank"]);
    let positional;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (!arg)
            continue;
        if (valueOptions.has(arg)) {
            index += 1;
            continue;
        }
        if (!arg.startsWith("-")) {
            positional = arg;
            break;
        }
    }
    const bankId = option(args, "--bank");
    return {
        path: path.resolve(positional ?? process.cwd()),
        ...(bankId ? { bankId } : {}),
        purgeGraph: args.includes("--purge-graph"),
    };
}
export async function workspaceCommand(action, args) {
    const input = parse(args);
    if (action === "init") {
        const bankId = input.bankId ?? process.env.AGENT_HUB_BANK_ID;
        if (!bankId) {
            throw new Error("agent-hub init requires --bank <bank-id>");
        }
        const config = writeWorkspaceConfig(input.path, { bankId });
        const command = process.env.CODEGRAPH_COMMAND ?? "codegraph";
        const result = await runCommand(command, ["init", input.path, "-i"], {
            cwd: input.path,
            inherit: true,
        });
        if (result.code !== 0) {
            throw new Error(`agent-hub bank '${bankId}' was configured, but CodeGraph init failed with exit code ${result.code}`);
        }
        // Load hindsight URL from user config for mcp.json generation
        const { loadUserConfig } = await import("../user-config.js");
        const userConfig = loadUserConfig();
        const hindsightBaseUrl = userConfig?.env.HINDSIGHT_BASE_URL;
        const mcpJson = writeMcpJson(input.path, bankId, hindsightBaseUrl);
        const mcpServers = Object.keys(mcpJson.mcpServers);
        console.log(JSON.stringify({ initialized: true, mcpServers, ...config }, null, 2));
        return;
    }
    if (action === "status") {
        const state = workspaceState(input.path);
        let codegraph = { ok: false, detail: "workspace_not_initialized" };
        if (state.initialized) {
            const result = await runCommand(process.env.CODEGRAPH_COMMAND ?? "codegraph", ["status", input.path, "--json"], { cwd: input.path });
            codegraph = result.code === 0
                ? parseJsonOrText(result.stdout)
                : { ok: false, detail: result.stderr.trim() || `exit ${result.code}` };
        }
        console.log(JSON.stringify({ workspace: state, codegraph }, null, 2));
        return;
    }
    if (action === "sync") {
        const state = workspaceState(input.path);
        if (!state.initialized) {
            throw new Error(`workspace_not_initialized: ${state.reasons.join("; ")}`);
        }
        const result = await runCommand(process.env.CODEGRAPH_COMMAND ?? "codegraph", ["sync", input.path], { cwd: input.path, inherit: true });
        if (result.code !== 0)
            throw new Error(`CodeGraph sync failed with exit code ${result.code}`);
        return;
    }
    if (action === "remove") {
        removeWorkspaceState(input.path, input.purgeGraph);
        console.log(JSON.stringify({
            removed: true,
            repositoryRoot: input.path,
            graphRemoved: input.purgeGraph,
        }, null, 2));
        return;
    }
    throw new Error("Usage: agent-hub workspace <status|sync|remove> [path]");
}
function parseJsonOrText(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return { ok: true, output: value.trim() };
    }
}
//# sourceMappingURL=workspace.js.map