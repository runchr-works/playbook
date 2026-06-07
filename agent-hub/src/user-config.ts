import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type HindsightMode = "local" | "supabase" | "existing";

export interface UserConfig {
  version: 1;
  hindsightMode: HindsightMode;
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export function agentHubHome(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(
    env.AGENT_HUB_HOME ??
      (env.XDG_CONFIG_HOME
        ? path.join(env.XDG_CONFIG_HOME, "agent-hub")
        : path.join(os.homedir(), ".config", "agent-hub")),
  );
}

export function userConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(agentHubHome(env), "config.json");
}

export function loadUserConfig(env: NodeJS.ProcessEnv = process.env): UserConfig | undefined {
  const filename = userConfigPath(env);
  if (!existsSync(filename)) return undefined;
  return JSON.parse(readFileSync(filename, "utf8")) as UserConfig;
}

export function saveUserConfig(config: UserConfig, env: NodeJS.ProcessEnv = process.env): void {
  const filename = userConfigPath(env);
  mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  writeFileSync(filename, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export function removeUserConfig(env: NodeJS.ProcessEnv = process.env): void {
  rmSync(agentHubHome(env), { recursive: true, force: true });
}
