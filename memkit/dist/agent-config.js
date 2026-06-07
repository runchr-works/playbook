import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { AGENTS, findAgent } from "./agents.js";
const CODEX_BLOCK_START = "# >>> memkit MCP servers";
const CODEX_BLOCK_END = "# <<< memkit MCP servers";
const CODEX_CONTEXT_START = "# >>> memkit context-mode";
const CODEX_CONTEXT_END = "# <<< memkit context-mode";
function readJson(filename) {
    if (!existsSync(filename))
        return {};
    return JSON.parse(readFileSync(filename, "utf8"));
}
function writeJson(filename, value) {
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}
function standardServers(connections) {
    const servers = {
        codegraph: {
            command: connections.codegraphCommand,
            args: connections.codegraphArgs,
        },
    };
    if (connections.hindsightUrl) {
        servers.hindsight = { url: connections.hindsightUrl };
    }
    return servers;
}
function mergeStandardJson(filename, connections) {
    const doc = readJson(filename);
    const servers = doc.mcpServers ?? {};
    Object.assign(servers, standardServers(connections));
    doc.mcpServers = servers;
    writeJson(filename, doc);
}
function mergeOpenCodeJson(filename, connections) {
    const doc = readJson(filename);
    const servers = doc.mcp ?? {};
    servers.codegraph = {
        type: "local",
        command: [connections.codegraphCommand, ...connections.codegraphArgs],
        enabled: true,
    };
    if (connections.hindsightUrl) {
        servers.hindsight = {
            type: "remote",
            url: connections.hindsightUrl,
            enabled: true,
        };
    }
    doc.$schema ??= "https://opencode.ai/config.json";
    doc.mcp = servers;
    writeJson(filename, doc);
}
function tomlString(value) {
    return JSON.stringify(value);
}
export function renderCodexConfig(connections) {
    return renderCodexConfigBlock(connections, true, true);
}
function renderCodexConfigBlock(connections, includeHindsight, includeCodegraph) {
    const lines = [CODEX_BLOCK_START];
    if (connections.hindsightUrl && includeHindsight) {
        lines.push("[mcp_servers.hindsight]", `url = ${tomlString(connections.hindsightUrl)}`, "");
    }
    if (includeCodegraph) {
        lines.push("[mcp_servers.codegraph]", `command = ${tomlString(connections.codegraphCommand)}`, `args = ${JSON.stringify(connections.codegraphArgs)}`);
    }
    lines.push(CODEX_BLOCK_END);
    return lines.join("\n");
}
function mergeCodexToml(filename, connections) {
    const current = existsSync(filename) ? readFileSync(filename, "utf8") : "";
    const start = current.indexOf(CODEX_BLOCK_START);
    const end = current.indexOf(CODEX_BLOCK_END);
    const unmanaged = start >= 0 && end >= start
        ? `${current.slice(0, start)}${current.slice(end + CODEX_BLOCK_END.length)}`
        : current;
    const block = renderCodexConfigBlock(connections, !/^\s*\[mcp_servers\.hindsight\]\s*$/m.test(unmanaged), !/^\s*\[mcp_servers\.codegraph\]\s*$/m.test(unmanaged));
    let next;
    if (start >= 0 && end >= start) {
        next = `${current.slice(0, start)}${block}${current.slice(end + CODEX_BLOCK_END.length)}`;
    }
    else {
        next = `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${block}\n`;
    }
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, next.endsWith("\n") ? next : `${next}\n`);
}
function mergeTextBlock(filename, startMarker, endMarker, block) {
    const current = existsSync(filename) ? readFileSync(filename, "utf8") : "";
    const start = current.indexOf(startMarker);
    const end = current.indexOf(endMarker);
    let next;
    if (start >= 0 && end >= start) {
        next = `${current.slice(0, start)}${block}${current.slice(end + endMarker.length)}`;
    }
    else {
        next = `${current.trimEnd()}${current.trim() ? "\n\n" : ""}${block}\n`;
    }
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, next.endsWith("\n") ? next : `${next}\n`);
}
export function configureGlobalContextMode(agentId, home = os.homedir()) {
    try {
        if (agentId === "codex") {
            const filename = path.join(home, ".codex", "config.toml");
            const current = existsSync(filename) ? readFileSync(filename, "utf8") : "";
            if (!current.includes(CODEX_CONTEXT_START) &&
                /^\s*\[mcp_servers\.context-mode\]\s*$/m.test(current)) {
                return { agentId, path: filename, configured: true, detail: "already configured" };
            }
            const block = [
                CODEX_CONTEXT_START,
                "[mcp_servers.context-mode]",
                'command = "context-mode"',
                CODEX_CONTEXT_END,
            ].join("\n");
            mergeTextBlock(filename, CODEX_CONTEXT_START, CODEX_CONTEXT_END, block);
            return { agentId, path: filename, configured: true, detail: "configured" };
        }
        if (agentId === "cursor" || agentId === "gemini-cli") {
            const filename = agentId === "cursor"
                ? path.join(home, ".cursor", "mcp.json")
                : path.join(home, ".gemini", "settings.json");
            const doc = readJson(filename);
            const servers = doc.mcpServers ?? {};
            servers["context-mode"] = { command: "context-mode" };
            doc.mcpServers = servers;
            writeJson(filename, doc);
            return { agentId, path: filename, configured: true, detail: "configured" };
        }
        if (agentId === "opencode") {
            const filename = path.join(home, ".config", "opencode", "opencode.json");
            const doc = readJson(filename);
            const servers = doc.mcp ?? {};
            servers["context-mode"] = {
                type: "local",
                command: ["context-mode"],
                enabled: true,
            };
            doc.$schema ??= "https://opencode.ai/config.json";
            doc.mcp = servers;
            writeJson(filename, doc);
            return { agentId, path: filename, configured: true, detail: "configured" };
        }
        const detail = agentId === "claude-code"
            ? "run `/plugin install context-mode@context-mode` inside Claude Code"
            : agentId === "pi"
                ? "run `pi install npm:context-mode` inside Pi"
                : "manual context-mode setup required";
        return { agentId, configured: false, detail };
    }
    catch (error) {
        return {
            agentId,
            configured: false,
            detail: error instanceof Error ? error.message : String(error),
        };
    }
}
export function projectConfigPath(agentId, repositoryRoot) {
    switch (agentId) {
        case "codex":
            return path.join(repositoryRoot, ".codex", "config.toml");
        case "claude-code":
        case "pi":
            return path.join(repositoryRoot, ".mcp.json");
        case "cursor":
            return path.join(repositoryRoot, ".cursor", "mcp.json");
        case "opencode":
            return path.join(repositoryRoot, "opencode.json");
        case "gemini-cli":
            return path.join(repositoryRoot, ".gemini", "settings.json");
        default:
            return undefined;
    }
}
export function configureProjectAgent(agentId, repositoryRoot, connections) {
    const filename = projectConfigPath(agentId, repositoryRoot);
    if (!filename) {
        const agent = findAgent(agentId);
        return {
            agentId,
            configured: false,
            detail: agent
                ? `manual setup required: ${agent.configLocation}`
                : "unsupported agent",
        };
    }
    try {
        if (agentId === "codex") {
            mergeCodexToml(filename, connections);
        }
        else if (agentId === "opencode") {
            mergeOpenCodeJson(filename, connections);
        }
        else {
            mergeStandardJson(filename, connections);
        }
        return { agentId, path: filename, configured: true, detail: "configured" };
    }
    catch (error) {
        return {
            agentId,
            path: filename,
            configured: false,
            detail: error instanceof Error ? error.message : String(error),
        };
    }
}
export function renderAgentConfig(agent, repositoryRoot, connections) {
    if (agent.id === "codex")
        return renderCodexConfig(connections);
    if (agent.id === "opencode") {
        const doc = {};
        mergeOpenCodeJsonObject(doc, connections);
        return `${JSON.stringify(doc, null, 2)}\n`;
    }
    const filename = projectConfigPath(agent.id, repositoryRoot);
    if (!filename)
        return `Manual setup required: ${agent.configLocation}\n`;
    return `${JSON.stringify({ mcpServers: standardServers(connections) }, null, 2)}\n`;
}
function mergeOpenCodeJsonObject(doc, connections) {
    const servers = {
        codegraph: {
            type: "local",
            command: [connections.codegraphCommand, ...connections.codegraphArgs],
            enabled: true,
        },
    };
    if (connections.hindsightUrl) {
        servers.hindsight = {
            type: "remote",
            url: connections.hindsightUrl,
            enabled: true,
        };
    }
    doc.$schema = "https://opencode.ai/config.json";
    doc.mcp = servers;
}
export function normalizeAgentIds(values) {
    const ids = values
        .map((value) => findAgent(value)?.id)
        .filter((value) => Boolean(value));
    return [...new Set(ids)];
}
export function supportedAutomaticAgents() {
    return AGENTS.filter((agent) => projectConfigPath(agent.id, ".") !== undefined);
}
//# sourceMappingURL=agent-config.js.map