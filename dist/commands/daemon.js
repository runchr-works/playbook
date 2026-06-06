import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { intentirHome } from "../user-config.js";
function pidPath() {
    return path.join(intentirHome(), "hindsight.pid");
}
export function hindsightPid() {
    const filename = pidPath();
    if (!existsSync(filename))
        return undefined;
    const pid = Number(readFileSync(filename, "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}
export function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export async function startHindsightDaemon(env) {
    const existing = hindsightPid();
    if (existing && isProcessRunning(existing))
        return existing;
    const home = intentirHome();
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const log = await open(path.join(home, "hindsight.log"), "a");
    const child = spawn("uvx", ["--from", "hindsight-api", "hindsight-local-mcp"], {
        detached: true,
        env: { ...process.env, ...env },
        stdio: ["ignore", log.fd, log.fd],
    });
    child.unref();
    writeFileSync(pidPath(), `${child.pid}\n`, { mode: 0o600 });
    await log.close();
    return child.pid ?? 0;
}
export function stopHindsightDaemon() {
    const pid = hindsightPid();
    if (!pid)
        return false;
    if (isProcessRunning(pid))
        process.kill(pid, "SIGTERM");
    rmSync(pidPath(), { force: true });
    return true;
}
//# sourceMappingURL=daemon.js.map