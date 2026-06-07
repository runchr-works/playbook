import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
export function agentHubHome(env = process.env) {
    return path.resolve(env.AGENT_HUB_HOME ??
        (env.XDG_CONFIG_HOME
            ? path.join(env.XDG_CONFIG_HOME, "agent-hub")
            : path.join(os.homedir(), ".config", "agent-hub")));
}
export function userConfigPath(env = process.env) {
    return path.join(agentHubHome(env), "config.json");
}
export function loadUserConfig(env = process.env) {
    const filename = userConfigPath(env);
    if (!existsSync(filename))
        return undefined;
    return JSON.parse(readFileSync(filename, "utf8"));
}
export function saveUserConfig(config, env = process.env) {
    const filename = userConfigPath(env);
    mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    writeFileSync(filename, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}
export function removeUserConfig(env = process.env) {
    rmSync(agentHubHome(env), { recursive: true, force: true });
}
//# sourceMappingURL=user-config.js.map