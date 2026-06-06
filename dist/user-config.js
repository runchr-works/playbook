import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
export function intentirHome(env = process.env) {
    return path.resolve(env.INTENTIR_HOME ??
        (env.XDG_CONFIG_HOME
            ? path.join(env.XDG_CONFIG_HOME, "intentir")
            : path.join(os.homedir(), ".config", "intentir")));
}
export function userConfigPath(env = process.env) {
    return path.join(intentirHome(env), "config.json");
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
    rmSync(intentirHome(env), { recursive: true, force: true });
}
//# sourceMappingURL=user-config.js.map