import { loadUserConfig, userConfigPath } from "../user-config.js";
import { workspaceState } from "../workspace.js";
import { commandExists } from "./process.js";
import { hindsightPid, isProcessRunning } from "./daemon.js";
export async function doctorCommand(json = false) {
    const userConfig = loadUserConfig();
    const root = process.env.INTENTIR_REPOSITORY_ROOT ?? process.cwd();
    const workspace = workspaceState(root);
    const [uvx, codegraph, hindsight] = await Promise.all([
        commandExists("uvx"),
        commandExists(process.env.CODEGRAPH_COMMAND ?? "codegraph"),
        checkHindsight(userConfig?.env.HINDSIGHT_BASE_URL ?? "http://localhost:8888"),
    ]);
    const pid = hindsightPid();
    const report = {
        ok: Boolean(userConfig) && hindsight.ok && codegraph && workspace.initialized,
        userConfig: {
            ok: Boolean(userConfig),
            path: userConfigPath(),
            mode: userConfig?.hindsightMode ?? null,
        },
        hindsight: {
            ...hindsight,
            managedPid: pid ?? null,
            managedProcessRunning: pid ? isProcessRunning(pid) : false,
        },
        dependencies: { uvx, codegraph },
        workspace,
    };
    if (json) {
        console.log(JSON.stringify(report, null, 2));
    }
    else {
        console.log(`Intentir doctor: ${report.ok ? "OK" : "attention required"}`);
        console.log(`- user config: ${report.userConfig.ok ? "found" : "missing"} (${report.userConfig.path})`);
        console.log(`- Hindsight: ${hindsight.ok ? "healthy" : hindsight.detail}`);
        console.log(`- uvx: ${uvx ? "available" : "missing"}`);
        console.log(`- CodeGraph: ${codegraph ? "available" : "missing"}`);
        console.log(`- repository: ${workspace.intentirInitialized ? "initialized" : "run intentir init --bank <bank-id>"}`);
        console.log(`- CodeGraph index: ${workspace.codegraphInitialized ? "initialized" : "missing"}`);
    }
    if (!report.ok)
        process.exitCode = 1;
}
async function checkHindsight(baseUrl) {
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
            signal: AbortSignal.timeout(3_000),
        });
        return response.ok
            ? { ok: true, detail: `healthy (${response.status})` }
            : { ok: false, detail: `HTTP ${response.status}` };
    }
    catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
}
//# sourceMappingURL=doctor.js.map