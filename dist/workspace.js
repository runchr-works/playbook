import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
export const WORKSPACE_CONFIG_RELATIVE_PATH = path.join(".intentir", "config.json");
export const CODEGRAPH_DATABASE_RELATIVE_PATH = path.join(".codegraph", "codegraph.db");
export function workspaceState(repositoryRoot) {
    const root = path.resolve(repositoryRoot);
    const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
    const codegraphDatabasePath = path.join(root, CODEGRAPH_DATABASE_RELATIVE_PATH);
    const reasons = [];
    let config;
    if (!existsSync(configPath)) {
        reasons.push("missing .intentir/config.json");
    }
    else {
        try {
            config = JSON.parse(readFileSync(configPath, "utf8"));
            if (path.resolve(config.repositoryRoot) !== root) {
                reasons.push("workspace repository root does not match the current repository");
            }
        }
        catch {
            reasons.push("invalid .intentir/config.json");
        }
    }
    if (!existsSync(codegraphDatabasePath)) {
        reasons.push("missing .codegraph/codegraph.db");
    }
    return {
        initialized: reasons.length === 0,
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
        version: 1,
        repositoryRoot: root,
        ...input,
        createdAt: new Date().toISOString(),
    };
    const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    return config;
}
export function removeWorkspaceState(repositoryRoot, purgeGraph) {
    const root = path.resolve(repositoryRoot);
    rmSync(path.join(root, ".intentir"), { recursive: true, force: true });
    if (purgeGraph)
        rmSync(path.join(root, ".codegraph"), { recursive: true, force: true });
}
export function deriveWorkspaceId(repositoryRoot) {
    const digest = createHash("sha256").update(path.resolve(repositoryRoot)).digest("hex").slice(0, 12);
    return `workspace-${digest}`;
}
export function deriveRepositoryId(remoteUrl, repositoryRoot) {
    if (!remoteUrl)
        return path.basename(path.resolve(repositoryRoot));
    const cleaned = remoteUrl
        .replace(/^git@[^:]+:/, "")
        .replace(/^https?:\/\/[^/]+\//, "")
        .replace(/\.git$/, "");
    return cleaned.replace(/[^a-zA-Z0-9._/-]+/g, "-") || randomUUID();
}
//# sourceMappingURL=workspace.js.map