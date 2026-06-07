import { createInterface } from "node:readline/promises";
import { stdin as input } from "node:process";
import { commandExists, runCommand } from "./process.js";
import { saveUserConfig } from "../user-config.js";
import { startHindsightDaemon } from "./daemon.js";
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
export async function onboardCommand() {
    if (!process.stdin.isTTY) {
        throw new Error("intentir onboard requires an interactive terminal");
    }
    const maskedOutput = new MaskedOutput();
    const rl = createInterface({ input, output: maskedOutput, terminal: true });
    try {
        console.log("Intentir onboarding");
        const modeAnswer = await ask(rl, "Hindsight storage: 1) local pg0 2) Supabase 3) existing server", "1");
        const mode = modeAnswer === "2"
            ? "supabase"
            : modeAnswer === "3" ? "existing" : "local";
        const env = {};
        let hindsightProvider;
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
            hindsightProvider = await chooseHindsightLlm(rl, maskedOutput, env);
            if (mode === "supabase") {
                console.log("Open Supabase Dashboard > your project > Connect. Use PostgreSQL connection strings, not an anon/service_role/legacy API key.");
                console.log("Runtime: Direct connection or Session pooler on port 5432. Migrations: Direct connection on port 5432.");
                env.HINDSIGHT_API_DATABASE_URL = await askSecret(rl, maskedOutput, "Supabase runtime PostgreSQL URL");
                const migrationUrl = await askSecret(rl, maskedOutput, "Supabase direct PostgreSQL URL for migrations (recommended)");
                if (migrationUrl)
                    env.HINDSIGHT_API_MIGRATION_DATABASE_URL = migrationUrl;
            }
        }
        env.INTENTIR_AGENT_ID = await ask(rl, "Default agent ID", "default-agent");
        const automatic = (await ask(rl, "Enable automatic memory promotion? (Y/n)", "Y"))
            .toLowerCase() !== "n";
        env.PROMOTION_ENABLED = String(automatic);
        if (automatic) {
            const recommendation = hindsightProvider
                ? recommendationFor(hindsightProvider)
                : undefined;
            const canReuse = mode !== "existing" && recommendation?.promotionCompatible === true;
            const reuse = canReuse &&
                (await ask(rl, "Reuse the OpenAI-compatible Hindsight LLM for promotion? (Y/n)", "Y"))
                    .toLowerCase() !== "n";
            if (reuse && recommendation) {
                env.PROMOTION_LLM_BASE_URL =
                    env.HINDSIGHT_API_LLM_BASE_URL ??
                        recommendation.defaultBaseUrl ??
                        "https://api.openai.com/v1";
                env.PROMOTION_LLM_API_KEY = env.HINDSIGHT_API_LLM_API_KEY ?? "";
                env.PROMOTION_LLM_MODEL = env.HINDSIGHT_API_LLM_MODEL ?? "";
            }
            else {
                if (!canReuse) {
                    console.log("Automatic promotion uses an OpenAI-compatible endpoint, so this Hindsight provider cannot be reused directly.");
                }
                env.PROMOTION_LLM_BASE_URL = await ask(rl, "Promotion LLM base URL", "https://api.openai.com/v1");
                env.PROMOTION_LLM_API_KEY = await askSecret(rl, maskedOutput, "Promotion LLM API key");
                env.PROMOTION_LLM_MODEL = await ask(rl, "Promotion LLM model");
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
            const start = (await ask(rl, "Start the local Hindsight daemon now? (Y/n)", "Y"))
                .toLowerCase() !== "n";
            if (start) {
                const pid = await startHindsightDaemon(env);
                console.log(`Hindsight started with PID ${pid}.`);
            }
        }
        const cli = "npx -y github:runchr-works/intentir";
        console.log(`Onboarding complete. Run \`${cli} workspace init\` in each repository.`);
        console.log(`Then run \`${cli} doctor\` to verify the environment.`);
        console.log(`Run \`${cli} agents list\` and \`${cli} agents config <agent> --persona <id>\` for client-specific MCP setup.`);
        console.log("MCP configuration:");
        console.log(JSON.stringify({
            mcpServers: {
                intentir: {
                    command: "npx",
                    args: ["-y", "github:runchr-works/intentir"],
                },
            },
        }, null, 2));
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=onboard.js.map