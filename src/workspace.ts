import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const WORKSPACE_CONFIG_RELATIVE_PATH = path.join(".intentir", "config.json");
export const CODEGRAPH_DATABASE_RELATIVE_PATH = path.join(".codegraph", "codegraph.db");

export interface WorkspaceConfig {
  bankId: string;
}

export interface WorkspaceState {
  initialized: boolean;
  intentirInitialized: boolean;
  codegraphInitialized: boolean;
  repositoryRoot: string;
  configPath: string;
  codegraphDatabasePath: string;
  config?: WorkspaceConfig;
  reasons: string[];
}

export function workspaceState(repositoryRoot: string): WorkspaceState {
  const root = path.resolve(repositoryRoot);
  const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
  const codegraphDatabasePath = path.join(root, CODEGRAPH_DATABASE_RELATIVE_PATH);
  const reasons: string[] = [];
  let config: WorkspaceConfig | undefined;

  if (!existsSync(configPath)) {
    reasons.push("missing .intentir/config.json");
  } else {
    try {
      const parsed = JSON.parse(readFileSync(configPath, "utf8")) as WorkspaceConfig;
      if (!parsed.bankId) {
        reasons.push("invalid .intentir/config.json");
      } else {
        config = parsed;
      }
    } catch {
      reasons.push("invalid .intentir/config.json");
    }
  }
  const intentirInitialized = Boolean(config) && reasons.length === 0;
  const codegraphInitialized = existsSync(codegraphDatabasePath);
  if (!codegraphInitialized) {
    reasons.push("missing .codegraph/codegraph.db");
  }

  return {
    initialized: intentirInitialized && codegraphInitialized,
    intentirInitialized,
    codegraphInitialized,
    repositoryRoot: root,
    configPath,
    codegraphDatabasePath,
    ...(config ? { config } : {}),
    reasons,
  };
}

export function writeWorkspaceConfig(
  repositoryRoot: string,
  input: Pick<WorkspaceConfig, "bankId">,
): WorkspaceConfig {
  const root = path.resolve(repositoryRoot);
  const config: WorkspaceConfig = {
    ...input,
  };
  const configPath = path.join(root, WORKSPACE_CONFIG_RELATIVE_PATH);
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return config;
}

export function removeWorkspaceState(repositoryRoot: string, purgeGraph: boolean): void {
  const root = path.resolve(repositoryRoot);
  rmSync(path.join(root, ".intentir"), { recursive: true, force: true });
  if (purgeGraph) rmSync(path.join(root, ".codegraph"), { recursive: true, force: true });
}
