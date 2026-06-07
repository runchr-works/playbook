import path from "node:path";
import { loadUserConfig } from "./user-config.js";
import { workspaceState, type WorkspaceState } from "./workspace.js";

export interface IntentirConfig {
  identity: {
    bankId: string;
  };
  repositoryRoot: string;
  workspace: WorkspaceState;
  hindsight: {
    baseUrl: string;
    apiKey?: string;
    tenant: string;
    timeoutMs: number;
  };
  codegraph: {
    command: string;
    args: string[];
    timeoutMs: number;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IntentirConfig {
  const userConfig = loadUserConfig(env);
  const mergedEnv: NodeJS.ProcessEnv = { ...userConfig?.env, ...env };
  const repositoryRoot = path.resolve(mergedEnv.INTENTIR_REPOSITORY_ROOT ?? process.cwd());
  const workspace = workspaceState(repositoryRoot);
  const workspaceIdentity = workspace.config;
  if (!workspace.intentirInitialized || !workspaceIdentity) {
    throw new Error(
      `Intentir repository is not initialized. Run \`intentir init --bank <bank-id>\` in ${repositoryRoot}.`,
    );
  }
  return {
    identity: {
      bankId: workspaceIdentity.bankId,
    },
    repositoryRoot,
    workspace,
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
