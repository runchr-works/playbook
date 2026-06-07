import path from "node:path";
import { loadUserConfig } from "./user-config.js";
import { workspaceState } from "./workspace.js";
export function loadConfig(env = process.env) {
    const userConfig = loadUserConfig(env);
    const mergedEnv = { ...userConfig?.env, ...env };
    const repositoryRoot = path.resolve(mergedEnv.INTENTIR_REPOSITORY_ROOT ?? process.cwd());
    const workspace = workspaceState(repositoryRoot);
    const workspaceIdentity = workspace.config;
    if (!workspace.intentirInitialized || !workspaceIdentity) {
        throw new Error(`Intentir repository is not initialized. Run \`intentir init --bank <bank-id>\` in ${repositoryRoot}.`);
    }
    const contextModeDir = mergedEnv.CONTEXT_MODE_DIR?.trim() || undefined;
    const contextModeEnabled = mergedEnv.INTENTIR_CONTEXT_MODE !== "0";
    return {
        identity: {
            bankId: workspaceIdentity.bankId,
        },
        repositoryRoot,
        workspace,
        contextMode: {
            enabled: contextModeEnabled,
            ...(contextModeDir ? { sessionsDir: contextModeDir } : {}),
        },
        hindsight: {
            baseUrl: (mergedEnv.HINDSIGHT_BASE_URL ?? "http://localhost:8888").replace(/\/$/, ""),
            ...(mergedEnv.HINDSIGHT_API_KEY ? { apiKey: mergedEnv.HINDSIGHT_API_KEY } : {}),
            tenant: mergedEnv.HINDSIGHT_TENANT ?? "default",
            timeoutMs: Number(mergedEnv.HINDSIGHT_TIMEOUT_MS ?? 60_000),
        },
        codegraph: {
            command: mergedEnv.CODEGRAPH_COMMAND ?? "codegraph",
            args: (mergedEnv.CODEGRAPH_ARGS ?? "serve,--mcp").split(",").filter(Boolean),
            timeoutMs: Number(mergedEnv.CODEGRAPH_TIMEOUT_MS ?? 15_000),
        },
    };
}
//# sourceMappingURL=config.js.map