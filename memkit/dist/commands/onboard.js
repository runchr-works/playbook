import { createInterface } from "node:readline/promises";
import { stdin as input } from "node:process";
import { commandExists, runCommand } from "./process.js";
import { saveUserConfig } from "../user-config.js";
import { startHindsight, waitForHindsight } from "./daemon.js";
import { HINDSIGHT_LLM_RECOMMENDATIONS, recommendationFor, } from "../llm-recommendations.js";
import { MaskedOutput } from "./masked-output.js";
import { AGENTS } from "../agents.js";
import { configureGlobalContextMode, normalizeAgentIds, } from "../agent-config.js";
import { injectRtkAgentInstructions } from "../rtk.js";
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
const AGENT_COMMANDS = {
    codex: ["codex"],
    "claude-code": ["claude"],
    cursor: ["cursor-agent", "cursor"],
    opencode: ["opencode"],
    reasonix: ["reasonix"],
    pi: ["pi"],
    "gemini-cli": ["gemini"],
    kiro: ["kiro-cli", "kiro"],
    hermes: ["hermes"],
};
async function detectInstalledAgents() {
    const detected = [];
    for (const agent of AGENTS) {
        const commands = AGENT_COMMANDS[agent.id] ?? [];
        for (const command of commands) {
            if (await commandExists(command)) {
                detected.push(agent.id);
                break;
            }
        }
    }
    return detected;
}
async function chooseAgents(rl) {
    const detected = await detectInstalledAgents();
    console.log("\nAgent clients:");
    AGENTS.forEach((agent, index) => {
        console.log(`  ${index + 1}) ${agent.name}${detected.includes(agent.id) ? " (detected)" : ""}`);
    });
    const fallback = detected.length > 0 ? detected.join(",") : "codex";
    const answer = await ask(rl, "Agents to configure (comma-separated names or numbers)", fallback);
    const values = answer.split(",").map((value) => value.trim()).filter(Boolean);
    const expanded = values.map((value) => {
        const index = Number(value) - 1;
        return Number.isInteger(index) && AGENTS[index] ? AGENTS[index].id : value;
    });
    const selected = normalizeAgentIds(expanded);
    if (selected.length === 0)
        throw new Error("No supported agents selected");
    return selected;
}
function configureContextMode(agents) {
    console.log("\nConfiguring global context-mode integration:");
    for (const agentId of agents) {
        const agent = AGENTS.find((candidate) => candidate.id === agentId);
        const result = configureGlobalContextMode(agentId);
        console.log(`  ${(agent?.name ?? agentId).padEnd(18)} ${result.configured ? "configured" : result.detail}`);
    }
    console.log("Restart configured agents to activate context-mode.");
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
            console.log("context-mode is configured once per agent, outside repository settings.");
        }
        let rtkAvailable = await commandExists("rtk");
        if (!rtkAvailable) {
            console.log("\nrtk (https://github.com/rtk) shrinks CLI output — 60-90% fewer tokens per command.");
            console.log("It wraps git, cargo, npm, docker, jest, and 30+ other commands.");
            const installRtk = (await ask(rl, "Install rtk globally now? (Y/n)", "Y"))
                .toLowerCase() !== "n";
            if (installRtk) {
                const result = await runCommand("npm", ["install", "--global", "rtk"], { inherit: true });
                rtkAvailable = result.code === 0;
                if (!rtkAvailable) {
                    console.log("rtk installation skipped (you can install it later with npm install -g rtk)");
                }
            }
        }
        const agents = await chooseAgents(rl);
        if (contextModeInstalled)
            configureContextMode(agents);
        if (rtkAvailable) {
            console.log("\nInjecting RTK instructions into agent configs:");
            for (const agentId of agents) {
                const results = injectRtkAgentInstructions(agentId);
                for (const r of results) {
                    console.log(`  ${agentId.padEnd(18)} ${r.configured ? "injected" : r.detail}`);
                }
            }
        }
        const now = new Date().toISOString();
        const config = {
            version: 1,
            hindsightMode: mode,
            agents,
            ...(rtkAvailable ? { rtk: true } : {}),
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
        console.log(`Configured agents: ${agents.join(", ")}`);
        console.log("\nYour agent connects directly to:");
        console.log("  - Hindsight (http://localhost:8888/mcp/<bank-id>/)");
        console.log("  - CodeGraph (command: codegraph)");
        console.log("  - context-mode (global agent integration)");
        if (rtkAvailable)
            console.log("  - rtk (CLI command prefix)");
        console.log("\n`memkit init` generates each selected agent's repository configuration.");
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=onboard.js.map