import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { intentirHome, loadUserConfig } from "../user-config.js";
function pidPath(env = process.env) {
    return path.join(intentirHome(env), "hindsight.pid");
}
export function hindsightPid(env = process.env) {
    const filename = pidPath(env);
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
export async function startHindsightDaemon(hindsightEnv, processEnv = process.env) {
    const existing = hindsightPid(processEnv);
    if (existing && isProcessRunning(existing))
        return existing;
    const home = intentirHome(processEnv);
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const log = await open(path.join(home, "hindsight.log"), "a");
    const child = spawn("uvx", ["--from", "hindsight-api", "hindsight-local-mcp"], {
        detached: true,
        env: { ...processEnv, ...hindsightEnv },
        stdio: ["ignore", log.fd, log.fd],
    });
    try {
        await new Promise((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", reject);
        });
    }
    catch (error) {
        await log.close();
        throw new Error(`Failed to start Hindsight. Check that \`uvx\` is available: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!child.pid) {
        await log.close();
        throw new Error("Failed to start Hindsight.");
    }
    child.unref();
    writeFileSync(pidPath(processEnv), `${child.pid}\n`, { mode: 0o600 });
    await log.close();
    return child.pid;
}
export function stopHindsightDaemon(env = process.env) {
    const pid = hindsightPid(env);
    if (!pid)
        return false;
    if (isProcessRunning(pid))
        process.kill(pid, "SIGTERM");
    rmSync(pidPath(env), { force: true });
    return true;
}
export async function checkHindsightHealth(baseUrl, timeoutMs = 3_000) {
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
            signal: AbortSignal.timeout(timeoutMs),
        });
        return response.ok
            ? { ok: true, detail: `healthy (${response.status})` }
            : { ok: false, detail: `HTTP ${response.status}` };
    }
    catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
}
export async function waitForHindsight(baseUrl, timeoutMs = 180_000, intervalMs = 1_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if ((await checkHindsightHealth(baseUrl)).ok)
            return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
}
export async function runHindsightDaemon(hindsightEnv, processEnv = process.env) {
    const existing = hindsightPid(processEnv);
    if (existing && isProcessRunning(existing)) {
        throw new Error(`Hindsight is already running with PID ${existing}.`);
    }
    const home = intentirHome(processEnv);
    mkdirSync(home, { recursive: true, mode: 0o700 });
    rmSync(pidPath(processEnv), { force: true });
    const child = spawn("uvx", ["--from", "hindsight-api", "hindsight-local-mcp"], {
        env: { ...processEnv, ...hindsightEnv },
        stdio: "inherit",
    });
    if (!child.pid)
        throw new Error("Failed to start Hindsight");
    writeFileSync(pidPath(processEnv), `${child.pid}\n`, { mode: 0o600 });
    const forward = (signal) => {
        if (isProcessRunning(child.pid))
            child.kill(signal);
    };
    const onSigint = () => forward("SIGINT");
    const onSigterm = () => forward("SIGTERM");
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);
    try {
        return await new Promise((resolve, reject) => {
            child.once("error", reject);
            child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
        });
    }
    finally {
        process.off("SIGINT", onSigint);
        process.off("SIGTERM", onSigterm);
        rmSync(pidPath(processEnv), { force: true });
    }
}
export async function daemonCommand(action, args, env = process.env) {
    const config = loadUserConfig(env);
    if (!config)
        throw new Error("Intentir is not onboarded. Run `intentir onboard` first.");
    const baseUrl = config.env.HINDSIGHT_BASE_URL ?? "http://localhost:8888";
    if (action === "status") {
        const pid = hindsightPid(env);
        const health = await checkHindsightHealth(baseUrl);
        console.log(JSON.stringify({
            mode: config.hindsightMode,
            baseUrl,
            managedPid: pid ?? null,
            managedProcessRunning: pid ? isProcessRunning(pid) : false,
            ...health,
        }, null, 2));
        if (!health.ok)
            process.exitCode = 1;
        return;
    }
    if (config.hindsightMode === "existing") {
        throw new Error("Hindsight daemon commands are unavailable in existing-server mode.");
    }
    if (action === "stop") {
        console.log(JSON.stringify({ stopped: stopHindsightDaemon(env) }, null, 2));
        return;
    }
    if (action === "run") {
        process.exitCode = await runHindsightDaemon(config.env, env);
        return;
    }
    if (action === "start") {
        const pid = await startHindsightDaemon(config.env, env);
        const wait = !args.includes("--no-wait");
        const ready = wait
            ? await waitForHindsight(baseUrl, Number(env.INTENTIR_DAEMON_START_TIMEOUT_MS ?? 180_000))
            : (await checkHindsightHealth(baseUrl)).ok;
        console.log(JSON.stringify({ started: true, pid, ready, baseUrl }, null, 2));
        if (wait && !ready)
            process.exitCode = 1;
        return;
    }
    throw new Error("Usage: intentir daemon <start|stop|status|run> [--no-wait]");
}
//# sourceMappingURL=daemon.js.map