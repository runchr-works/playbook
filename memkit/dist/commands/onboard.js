import { createInterface } from "node:readline/promises";
import { stdin as input } from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { commandExists, runCommand } from "./process.js";
import { saveUserConfig } from "../user-config.js";
import { startHindsight, waitForHindsight } from "./daemon.js";
import { HINDSIGHT_LLM_RECOMMENDATIONS, recommendationFor, } from "../llm-recommendations.js";
import { MaskedOutput } from "./masked-output.js";
async function ask(rl, prompt, fallback) {
    const suffix = fallback ? ` [${fallback}]` : "";
    const value = (await rl.question(`${prompt}${suffix}: `)).trim();
    return value || fallback || "";
}
async function askSecret(rl, maskedOutput, prompt) {
    const pending = rl.question(`${prompt}: `);
    maskedOutput.muted = true;
    try {
        return (await pending).trim();
    }
    finally {
        maskedOutput.muted = false;
    }
}
async function chooseHindsightLlm(rl, maskedOutput, env) {
    console.log("Hindsight LLM providers and official default models:");
    HINDSIGHT_LLM_RECOMMENDATIONS.forEach((item, index) => {
        console.log(`  ${index + 1}) ${item.label}: ${item.defaultModel}`);
    });
    const choice = await ask(rl, "Select provider number or enter a provider name", "1");
    const index = Number(choice) - 1;
    const recommendation = Number.isInteger(index)
        ? HINDSIGHT_LLM_RECOMMENDATIONS[index]
        : recommendationFor(choice);
    const provider = recommendation?.provider ?? choice;
    env.HINDSIGHT_API_LLM_PROVIDER = provider;
    env.HINDSIGHT_API_LLM_MODEL = await ask(rl, "Hindsight LLM model", recommendation?.defaultModel);
    if (recommendation?.alternatives.length) {
        console.log(`Other verified options: ${recommendation.alternatives.join(", ")}`);
    }
    if (recommendation?.apiKeyRequired !== false) {
        env.HINDSIGHT_API_LLM_API_KEY = await askSecret(rl, maskedOutput, "Hindsight LLM API key");
    }
    const llmBaseUrl = await ask(rl, "Hindsight LLM base URL (leave empty for provider default)");
    if (llmBaseUrl)
        env.HINDSIGHT_API_LLM_BASE_URL = llmBaseUrl;
    return provider;
}
function detectAgentMcpPaths() {
    const home = homedir();
    const candidates = [
        { name: "Pi", path: join(home, ".pi", "mcp.json") },
        { name: "Claude Code", path: join(home, ".claude", "mcp.json") },
        { name: "Codex CLI", path: join(home, ".codex", "mcp.json") },
        { name: "Cursor", path: join(home, ".cursor", "mcp.json") },
        { name: "OpenCode", path: join(home, ".config", "opencode", "mcp.json") },
        { name: "Gemini CLI", path: join(home, ".gemini", "mcp.json") },
        { name: "Kiro", path: join(home, ".kiro", "settings", "mcp.json") },
    ];
    return candidates.filter((c) => existsSync(c.path));
}
function writeGlobalMcpEntry(agentPath) {
    try {
        const raw = readFileSync(agentPath, "utf8");
        const doc = JSON.parse(raw);
        doc.mcpServers ??= {};
        if (doc.mcpServers["context-mode"])
            return false; // already exists
        doc.mcpServers["context-mode"] = { command: "context-mode" };
        writeFileSync(agentPath, `${JSON.stringify(doc, null, 2)}\n`);
        return true;
    }
    catch {
        return false;
    }
}
function printContextModeSetup() {
    console.log("\ncontext-mode is a global MCP server — configure it once per agent.");
    console.log("Adding it to repo .mcp.json files is unnecessary (and would be duplicated).\n");
    const detected = detectAgentMcpPaths();
    const configuredAgents = [];
    if (detected.length > 0) {
        console.log("Detected agent global MCP configs:");
        let added = 0;
        for (const agent of detected) {
            const wasAdded = writeGlobalMcpEntry(agent.path);
            const status = wasAdded ? "✓ added" : "already configured";
            console.log(`  ${agent.name.padEnd(14)} ${agent.path}  ${status}`);
            if (wasAdded)
                added++;
            configuredAgents.push(agent.name);
        }
        if (added > 0) {
            console.log(`\ncontext-mode added to ${added} agent config(s).`);
        }
    }
    else {
        console.log("No known agent global MCP configs detected. Add context-mode manually:");
    }
    // Per-agent next steps
    const hasPi = configuredAgents.some((n) => n === "Pi");
    const hasClaude = configuredAgents.some((n) => n === "Claude Code");
    if (hasPi || hasClaude) {
        console.log("\n⚠️  Additional steps required for these agents:");
        if (hasPi) {
            console.log("  Pi: run this INSIDE Pi →  pi install npm:context-mode");
        }
        if (hasClaude) {
            console.log("  Claude Code: run this INSIDE Claude Code →  /plugin install context-mode@context-mode");
        }
    }
    if (configuredAgents.length > 0) {
        console.log("\nRestart the agent(s) to activate context-mode.");
    }
    console.log(`
Global MCP config — add this to your agent's global MCP settings:

  {
    "mcpServers": {
      "context-mode": { "command": "context-mode" }
    }
  }

Common locations:
  Pi:          ~/.pi/mcp.json
  Claude Code: ~/.claude/mcp.json
  Codex CLI:   ~/.codex/mcp.json
  Cursor:      ~/.cursor/mcp.json
  OpenCode:    ~/.config/opencode/mcp.json
  Gemini CLI:  ~/.gemini/mcp.json
  Kiro:        ~/.kiro/settings/mcp.json

Pi users also need:  pi install npm:context-mode  (run inside Pi)
Claude Code users:    /plugin install context-mode@context-mode  (run inside Claude Code)

Full setup: https://github.com/mksglu/context-mode#install
`);
}
export async function onboardCommand() {
    if (!process.stdin.isTTY) {
        throw new Error("memkit onboard requires an interactive terminal");
    }
    const maskedOutput = new MaskedOutput();
    const rl = createInterface({ input, output: maskedOutput, terminal: true });
    try {
        console.log("memkit onboarding");
        const modeAnswer = await ask(rl, "Hindsight storage: 1) local pg0 2) Supabase 3) existing server", "1");
        const mode = modeAnswer === "2"
            ? "supabase"
            : modeAnswer === "3" ? "existing" : "local";
        const env = {};
        if (mode === "existing") {
            env.HINDSIGHT_BASE_URL = await ask(rl, "Hindsight URL", "http://localhost:8888");
            const apiKey = await askSecret(rl, maskedOutput, "Hindsight API key (leave empty when unused)");
            if (apiKey)
                env.HINDSIGHT_API_KEY = apiKey;
        }
        else {
            if (!(await commandExists("uvx"))) {
                throw new Error([
                    "uvx is required to run Hindsight locally.",
                    "",
                    "Install uv, restart your shell, then run onboarding again:",
                    "  Linux/macOS: curl -LsSf https://astral.sh/uv/install.sh | sh",
                    "  Windows PowerShell: powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\"",
                    "",
                    "Official guide: https://docs.astral.sh/uv/getting-started/installation/",
                ].join("\n"));
            }
            env.HINDSIGHT_BASE_URL = "http://localhost:8888";
            await chooseHindsightLlm(rl, maskedOutput, env);
            // Suggest embeddings and reranker providers that match the LLM choice
            const rec = recommendationFor(env.HINDSIGHT_API_LLM_PROVIDER ?? "");
            if (rec) {
                console.log("\nMemory search quality depends on embeddings (text → vector) and reranker (result ordering).");
                console.log(`Suggested embeddings: ${rec.embeddingsProvider === "local" ? "local GPU (free, runs on your machine)" : `${rec.embeddingsProvider} cloud (uses your API key)`}`);
                if (rec.embeddingsProvider === "local") {
                    console.log("⚠️  Local embeddings require a compatible GPU. If you get CUDA errors, switch to CPU.");
                    const useCPU = (await ask(rl, "Run local embeddings on CPU instead of GPU? (Y/n)", "Y"))
                        .toLowerCase() !== "n";
                    if (useCPU) {
                        env.HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU = "true";
                        console.log("Local embeddings will use CPU.");
                    }
                }
                env.HINDSIGHT_API_EMBEDDINGS_PROVIDER = rec.embeddingsProvider;
                if (rec.embeddingsProvider === "openai") {
                    env.HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY =
                        env.HINDSIGHT_API_LLM_API_KEY ?? "";
                }
                env.HINDSIGHT_API_RERANKER_PROVIDER = rec.rerankerProvider;
            }
            if (mode === "supabase") {
                console.log("Open Supabase Dashboard > your project > Connect. Use PostgreSQL connection strings, not an anon/service_role/legacy API key.");
                console.log("Runtime: Direct connection or Session pooler on port 5432. Migrations: Direct connection on port 5432.");
                env.HINDSIGHT_API_DATABASE_URL = await askSecret(rl, maskedOutput, "Supabase runtime PostgreSQL URL");
                const migrationUrl = await askSecret(rl, maskedOutput, "Supabase direct PostgreSQL URL for migrations (recommended)");
                if (migrationUrl)
                    env.HINDSIGHT_API_MIGRATION_DATABASE_URL = migrationUrl;
            }
        }
        if (!(await commandExists("codegraph"))) {
            const install = (await ask(rl, "Install CodeGraph globally now? (Y/n)", "Y"))
                .toLowerCase() !== "n";
            if (install) {
                const result = await runCommand("npm", ["install", "--global", "@colbymchenry/codegraph"], { inherit: true });
                if (result.code !== 0)
                    throw new Error("CodeGraph installation failed");
            }
        }
        let contextModeInstalled = await commandExists("context-mode");
        if (!contextModeInstalled) {
            console.log("\ncontext-mode (https://github.com/mksglu/context-mode) captures session decisions,");
            console.log("conventions, and error fixes. Install it to track your session decisions.");
            const installCm = (await ask(rl, "Install context-mode globally now? (Y/n)", "Y"))
                .toLowerCase() !== "n";
            if (installCm) {
                const result = await runCommand("npm", ["install", "--global", "context-mode"], { inherit: true });
                contextModeInstalled = result.code === 0;
                if (!contextModeInstalled) {
                    console.log("context-mode installation skipped (you can install it later with npm install -g context-mode)");
                }
            }
        }
        if (contextModeInstalled) {
            printContextModeSetup();
        }
        const now = new Date().toISOString();
        const config = {
            version: 1,
            hindsightMode: mode,
            env,
            createdAt: now,
            updatedAt: now,
        };
        saveUserConfig(config);
        if (mode !== "existing") {
            const start = (await ask(rl, "Start Hindsight locally now? (Y/n)", "Y"))
                .toLowerCase() !== "n";
            if (start) {
                const pid = await startHindsight(env);
                console.log(`Hindsight started (PID ${pid}). Waiting until it is ready...`);
                const ready = await waitForHindsight(env.HINDSIGHT_BASE_URL);
                console.log(ready
                    ? "Hindsight is ready."
                    : "Hindsight is still initializing. Check with `memkit doctor`.");
            }
        }
        console.log("Onboarding complete. Run `memkit init --bank <bank-id>` in each repository.");
        console.log("Then run `memkit doctor` to verify the environment.");
        console.log("Run `memkit agents list` and `memkit agents config <agent>` for client-specific MCP setup.");
        console.log("\nYour agent connects directly to:");
        console.log("  - Hindsight (http://localhost:8888/mcp/<bank-id>/)");
        console.log("  - CodeGraph (command: codegraph)");
        console.log("  - context-mode (command: context-mode)");
        console.log("\nUse `memkit init --bank <bank-id>` to generate .mcp.json with these connections.");
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=onboard.js.map