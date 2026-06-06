import path from "node:path";
import { loadUserConfig } from "./user-config.js";
import { workspaceState } from "./workspace.js";
function required(name, value) {
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
function optionalLlm(env) {
    const apiKey = env.PROMOTION_LLM_API_KEY;
    const model = env.PROMOTION_LLM_MODEL;
    if (!apiKey || !model)
        return undefined;
    return {
        baseUrl: env.PROMOTION_LLM_BASE_URL ?? "https://api.openai.com/v1",
        apiKey,
        model,
    };
}
export function loadConfig(env = process.env) {
    const userConfig = loadUserConfig(env);
    const mergedEnv = { ...userConfig?.env, ...env };
    const repositoryRoot = path.resolve(mergedEnv.INTENTIR_REPOSITORY_ROOT ?? process.cwd());
    const workspace = workspaceState(repositoryRoot);
    const workspaceIdentity = workspace.config;
    const llm = optionalLlm(mergedEnv);
    return {
        identity: {
            orgId: required("INTENTIR_ORG_ID", mergedEnv.INTENTIR_ORG_ID ?? workspaceIdentity?.orgId),
            projectId: required("INTENTIR_PROJECT_ID", mergedEnv.INTENTIR_PROJECT_ID ?? workspaceIdentity?.projectId),
            workspaceId: required("INTENTIR_WORKSPACE_ID", mergedEnv.INTENTIR_WORKSPACE_ID ?? workspaceIdentity?.workspaceId),
            repositoryId: required("INTENTIR_REPOSITORY_ID", mergedEnv.INTENTIR_REPOSITORY_ID ?? workspaceIdentity?.repositoryId),
            agentId: required("INTENTIR_AGENT_ID", mergedEnv.INTENTIR_AGENT_ID),
        },
        repositoryRoot,
        workspace,
        ...(mergedEnv.INTENTIR_REPOSITORY_REVISION
            ? { repositoryRevision: mergedEnv.INTENTIR_REPOSITORY_REVISION }
            : {}),
        hindsight: {
            baseUrl: (mergedEnv.HINDSIGHT_BASE_URL ?? "http://localhost:8888").replace(/\/$/, ""),
            ...(mergedEnv.HINDSIGHT_API_KEY ? { apiKey: mergedEnv.HINDSIGHT_API_KEY } : {}),
            tenant: mergedEnv.HINDSIGHT_TENANT ?? "default",
            timeoutMs: Number(mergedEnv.HINDSIGHT_TIMEOUT_MS ?? 15_000),
        },
        codegraph: {
            command: mergedEnv.CODEGRAPH_COMMAND ?? "codegraph",
            args: (mergedEnv.CODEGRAPH_ARGS ?? "serve,--mcp").split(",").filter(Boolean),
            timeoutMs: Number(mergedEnv.CODEGRAPH_TIMEOUT_MS ?? 15_000),
        },
        promotion: {
            enabled: mergedEnv.PROMOTION_ENABLED !== "false",
            confidenceThreshold: Number(mergedEnv.PROMOTION_CONFIDENCE_THRESHOLD ?? 0.85),
            databasePath: path.resolve(mergedEnv.PROMOTION_DATABASE_PATH ?? path.join(repositoryRoot, ".intentir", "outbox.db")),
            pollIntervalMs: Number(mergedEnv.PROMOTION_POLL_INTERVAL_MS ?? 2_000),
            ...(llm ? { llm } : {}),
        },
    };
}
//# sourceMappingURL=config.js.map