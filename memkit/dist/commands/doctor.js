import { existsSync } from "node:fs";
import { loadUserConfig, userConfigPath } from "../user-config.js";
import { workspaceState } from "../workspace.js";
import { commandExists } from "./process.js";
import { checkHindsightHealth } from "./daemon.js";
import { projectConfigPath } from "../agent-config.js";
import { findAgent } from "../agents.js";
export async function doctorCommand(json = false) {
    const userConfig = loadUserConfig();
    const root = process.env.MEMKIT_REPOSITORY_ROOT ?? process.cwd();
    const workspace = workspaceState(root);
    const [uvx, codegraph, contextMode, rtk, hindsight] = await Promise.all([
        commandExists("uvx"),
        commandExists(process.env.CODEGRAPH_COMMAND ?? "codegraph"),
        commandExists("context-mode"),
        commandExists("rtk"),
        checkHindsightHealth(userConfig?.env.HINDSIGHT_BASE_URL ?? "http://localhost:8888"),
    ]);
    const agents = (userConfig?.agents ?? []).map((agentId) => {
        const configPath = projectConfigPath(agentId, root);
        return {
            id: agentId,
            name: findAgent(agentId)?.name ?? agentId,
            automatic: Boolean(configPath),
            path: configPath ?? null,
            configured: configPath ? existsSync(configPath) : null,
        };
    });
    const agentConfigsOk = agents.every((agent) => !agent.automatic || agent.configured);
    const report = {
        ok: Boolean(userConfig) && hindsight.ok && codegraph && workspace.initialized && agentConfigsOk,
        userConfig: {
            ok: Boolean(userConfig),
            path: userConfigPath(),
            mode: userConfig?.hindsightMode ?? null,
        },
        hindsight: hindsight,
        dependencies: { uvx, codegraph, contextMode, rtk },
        agents,
        workspace,
        mcpJson: workspace.config
            ? {
                hindsight: userConfig?.env.HINDSIGHT_BASE_URL
                    ? `${userConfig.env.HINDSIGHT_BASE_URL.replace(/\/$/, "")}/mcp/${encodeURIComponent(workspace.config.bankId)}/`
                    : "not configured",
                codegraph: codegraph ? "codegraph (CLI)" : "missing",
                contextMode: contextMode ? "context-mode (CLI)" : "missing",
                rtk: rtk ? "rtk (CLI)" : "missing",
            }
            : null,
    };
    if (json) {
        console.log(JSON.stringify(report, null, 2));
    }
    else {
        console.log(`memkit doctor: ${report.ok ? "OK" : "attention required"}`);
        console.log(`- user config: ${report.userConfig.ok ? "found" : "missing"} (${report.userConfig.path})`);
        console.log(`- Hindsight: ${hindsight.ok ? "healthy" : hindsight.detail}`);
        console.log(`- uvx: ${uvx ? "available" : "missing"}`);
        console.log(`- CodeGraph: ${codegraph ? "available" : "missing"}`);
        console.log(`- context-mode: ${contextMode ? "available" : "missing"}`);
        console.log(`- rtk: ${rtk ? "available" : "missing"}`);
        console.log(`- repository: ${workspace.memkitInitialized ? "initialized" : "run memkit init --bank <bank-id>"}`);
        console.log(`- CodeGraph index: ${workspace.codegraphInitialized ? "initialized" : "missing"}`);
        if (agents.length > 0) {
            console.log("\nAgent project configurations:");
            for (const agent of agents) {
                const status = agent.automatic
                    ? agent.configured ? "configured" : "missing; run memkit init"
                    : "manual setup required";
                console.log(`  ${agent.name}: ${status}${agent.path ? ` (${agent.path})` : ""}`);
            }
        }
        if (report.mcpJson) {
            console.log("\nMCP connections (.mcp.json):");
            console.log(`  hindsight:    ${report.mcpJson.hindsight}`);
            console.log(`  codegraph:    ${report.mcpJson.codegraph}`);
            console.log(`  context-mode: ${report.mcpJson.contextMode}`);
            console.log(`  rtk:          ${report.mcpJson.rtk}`);
        }
    }
    if (!report.ok)
        process.exitCode = 1;
}
//# sourceMappingURL=doctor.js.map