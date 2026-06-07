import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
export function memkitHome(env = process.env) {
    return path.resolve(env.MEMKIT_HOME ??
        (env.XDG_CONFIG_HOME
            ? path.join(env.XDG_CONFIG_HOME, "memkit")
            : path.join(os.homedir(), ".config", "memkit")));
}
export function userConfigPath(env = process.env) {
    return path.join(memkitHome(env), "config.json");
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
    rmSync(memkitHome(env), { recursive: true, force: true });
}
//# sourceMappingURL=user-config.js.map