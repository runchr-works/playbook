import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
export const WORKSPACE_CONFIG_RELATIVE_PATH = path.join(".memkit", "config.json");
export const CODEGRAPH_DATABASE_RELATIVE_PATH = path.join(".codegraph", "codegraph.db");
export function workspaceState(repositoryRoot) {
    const root = path.resolve(repositoryRoot);
    const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
    const codegraphDatabasePath = path.join(root, CODEGRAPH_DATABASE_RELATIVE_PATH);
    const reasons = [];
    let config;
    if (!existsSync(configPath)) {
        reasons.push("missing .memkit/config.json");
    }
    else {
        try {
            const parsed = JSON.parse(readFileSync(configPath, "utf8"));
            if (!parsed.bankId) {
                reasons.push("invalid .memkit/config.json");
            }
            else {
                config = parsed;
            }
        }
        catch {
            reasons.push("invalid .memkit/config.json");
        }
    }
    const intentirInitialized = Boolean(config) && reasons.length === 0;
    const memkitInitialized = intentirInitialized;
    const codegraphInitialized = existsSync(codegraphDatabasePath);
    if (!codegraphInitialized) {
        reasons.push("missing .codegraph/codegraph.db");
    }
    return {
        initialized: intentirInitialized && codegraphInitialized,
        intentirInitialized,
        memkitInitialized,
        codegraphInitialized,
        repositoryRoot: root,
        configPath,
        codegraphDatabasePath,
        ...(config ? { config } : {}),
        reasons,
    };
}
export function writeWorkspaceConfig(repositoryRoot, input) {
    const root = path.resolve(repositoryRoot);
    const config = {
        ...input,
    };
    const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    return config;
}
export const MCP_JSON_RELATIVE_PATH = ".mcp.json";
const MCP_HINDSIGHT_NAME = "hindsight";
const MCP_CODEGRAPH_NAME = "codegraph";
function readMcpJson(repositoryRoot) {
    const filePath = path.join(repositoryRoot, MCP_JSON_RELATIVE_PATH);
    if (!existsSync(filePath))
        return null;
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    }
    catch {
        return null;
    }
}
export function writeMcpJson(repositoryRoot, bankId, hindsightBaseUrl, codegraphCommand = "codegraph", codegraphArgs = ["serve", "--mcp"]) {
    const root = path.resolve(repositoryRoot);
    const filePath = path.join(root, MCP_JSON_RELATIVE_PATH);
    let doc = readMcpJson(root);
    if (!doc) {
        doc = { mcpServers: {} };
    }
    // Direct connections to each tool — no memkit proxy
    if (hindsightBaseUrl) {
        doc.mcpServers[MCP_HINDSIGHT_NAME] = {
            url: `${hindsightBaseUrl.replace(/\/$/, "")}/mcp/${encodeURIComponent(bankId)}/`,
        };
    }
    doc.mcpServers[MCP_CODEGRAPH_NAME] = {
        command: codegraphCommand,
        args: codegraphArgs,
    };
    writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`);
    return doc;
}
export function removeWorkspaceState(repositoryRoot, purgeGraph) {
    const root = path.resolve(repositoryRoot);
    rmSync(path.join(root, ".memkit"), { recursive: true, force: true });
    if (purgeGraph)
        rmSync(path.join(root, ".codegraph"), { recursive: true, force: true });
}
//# sourceMappingURL=workspace.js.map