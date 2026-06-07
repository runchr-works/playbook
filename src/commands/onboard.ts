import { createInterface } from "node:readline/promises";
import { stdin as input } from "node:process";
import { commandExists, runCommand } from "./process.js";
import { saveUserConfig, type HindsightMode, type UserConfig } from "../user-config.js";
import { startHindsightDaemon, waitForHindsight } from "./daemon.js";
import {
  HINDSIGHT_LLM_RECOMMENDATIONS,
  recommendationFor,
} from "../llm-recommendations.js";
import { MaskedOutput } from "./masked-output.js";

async function ask(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  fallback?: string,
): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : "";
  const value = (await rl.question(`${prompt}${suffix}: `)).trim();
  return value || fallback || "";
}

async function askSecret(
  rl: ReturnType<typeof createInterface>,
  maskedOutput: MaskedOutput,
  prompt: string,
): Promise<string> {
  const pending = rl.question(`${prompt}: `);
  maskedOutput.muted = true;
  try {
    return (await pending).trim();
  } finally {
    maskedOutput.muted = false;
  }
}

async function chooseHindsightLlm(
  rl: ReturnType<typeof createInterface>,
  maskedOutput: MaskedOutput,
  env: Record<string, string>,
): Promise<string> {
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
  env.HINDSIGHT_API_LLM_MODEL = await ask(
    rl,
    "Hindsight LLM model",
    recommendation?.defaultModel,
  );
  if (recommendation?.alternatives.length) {
    console.log(`Other verified options: ${recommendation.alternatives.join(", ")}`);
  }
  if (recommendation?.apiKeyRequired !== false) {
    env.HINDSIGHT_API_LLM_API_KEY = await askSecret(
      rl,
      maskedOutput,
      "Hindsight LLM API key",
    );
  }
  const llmBaseUrl = await ask(
    rl,
    "Hindsight LLM base URL (leave empty for provider default)",
  );
  if (llmBaseUrl) env.HINDSIGHT_API_LLM_BASE_URL = llmBaseUrl;
  return provider;
}

export async function onboardCommand(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error("intentir onboard requires an interactive terminal");
  }
  const maskedOutput = new MaskedOutput();
  const rl = createInterface({ input, output: maskedOutput, terminal: true });
  try {
    console.log("Intentir onboarding");
    const modeAnswer = await ask(
      rl,
      "Hindsight storage: 1) local pg0 2) Supabase 3) existing server",
      "1",
    );
    const mode: HindsightMode = modeAnswer === "2"
      ? "supabase"
      : modeAnswer === "3" ? "existing" : "local";
    const env: Record<string, string> = {};
    if (mode === "existing") {
      env.HINDSIGHT_BASE_URL = await ask(rl, "Hindsight URL", "http://localhost:8888");
      const apiKey = await askSecret(rl, maskedOutput, "Hindsight API key (leave empty when unused)");
      if (apiKey) env.HINDSIGHT_API_KEY = apiKey;
    } else {
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

      // Configure embeddings and reranker providers based on the LLM selection
      const rec = recommendationFor(env.HINDSIGHT_API_LLM_PROVIDER ?? "");
      if (rec) {
        const localCount = [rec.embeddingsProvider, rec.rerankerProvider].filter((p) => p === "local").length;
        if (localCount > 0) {
          console.log(
            `Embeddings: ${rec.embeddingsProvider}${rec.embeddingsProvider === "local" ? " (local — uses GPU)" : " (cloud)"}`,
          );
          console.log(
            `Reranker: ${rec.rerankerProvider}${rec.rerankerProvider === "local" ? " (local — uses GPU)" : ""}`,
          );
          console.log(
            "Local embeddings/reranker use the GPU. If you encounter CUDA errors or don't have a compatible GPU,",
          );
          const cpuFallback = (await ask(rl, "Force local models to use CPU? (Y/n)", "Y"))
            .toLowerCase() !== "n";
          if (cpuFallback) {
            env.HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU = "true";
            env.HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU = "true";
            console.log("Local models will run on CPU (slower but compatible).");
          }
        }
        const changeEmbeddings = await ask(
          rl,
          `Use "${rec.embeddingsProvider}" for embeddings? (Y/n)`,
          "Y",
        );
        if (changeEmbeddings.toLowerCase() !== "n") {
          env.HINDSIGHT_API_EMBEDDINGS_PROVIDER = rec.embeddingsProvider;
          if (rec.embeddingsProvider === "openai") {
            env.HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY =
              env.HINDSIGHT_API_LLM_API_KEY ?? "";
          }
        } else {
          env.HINDSIGHT_API_EMBEDDINGS_PROVIDER = await ask(
            rl,
            "Hindsight embeddings provider (openai, gemini, local)",
            "local",
          );
        }
        const changeReranker = await ask(
          rl,
          `Use "${rec.rerankerProvider}" for reranker? (Y/n)`,
          "Y",
        );
        if (changeReranker.toLowerCase() !== "n") {
          env.HINDSIGHT_API_RERANKER_PROVIDER = rec.rerankerProvider;
        } else {
          env.HINDSIGHT_API_RERANKER_PROVIDER = await ask(
            rl,
            "Hindsight reranker provider (local, cohere)",
            "local",
          );
        }
      }

      if (mode === "supabase") {
        console.log(
          "Open Supabase Dashboard > your project > Connect. Use PostgreSQL connection strings, not an anon/service_role/legacy API key.",
        );
        console.log(
          "Runtime: Direct connection or Session pooler on port 5432. Migrations: Direct connection on port 5432.",
        );
        env.HINDSIGHT_API_DATABASE_URL = await askSecret(
          rl,
          maskedOutput,
          "Supabase runtime PostgreSQL URL",
        );
        const migrationUrl = await askSecret(
          rl,
          maskedOutput,
          "Supabase direct PostgreSQL URL for migrations (recommended)",
        );
        if (migrationUrl) env.HINDSIGHT_API_MIGRATION_DATABASE_URL = migrationUrl;
      }
    }

    if (!(await commandExists("codegraph"))) {
      const install = (await ask(rl, "Install CodeGraph globally now? (Y/n)", "Y"))
        .toLowerCase() !== "n";
      if (install) {
        const result = await runCommand(
          "npm",
          ["install", "--global", "@colbymchenry/codegraph"],
          { inherit: true },
        );
        if (result.code !== 0) throw new Error("CodeGraph installation failed");
      }
    }

    const now = new Date().toISOString();
    const config: UserConfig = {
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
        console.log(`Hindsight started with PID ${pid}. Waiting until it is ready...`);
        const ready = await waitForHindsight(env.HINDSIGHT_BASE_URL);
        console.log(
          ready
            ? "Hindsight is ready."
            : "Hindsight is still initializing. Run `intentir daemon status` to check it.",
        );
      }
    }
    console.log(
      "Onboarding complete. Run `intentir init --bank <bank-id>` in each repository.",
    );
    console.log("Then run `intentir doctor` to verify the environment.");
    console.log(
      "Run `intentir agents list` and `intentir agents config <agent>` for client-specific MCP setup.",
    );
    console.log("MCP configuration:");
    console.log(JSON.stringify({
      mcpServers: {
        intentir: {
          command: "intentir",
        },
      },
    }, null, 2));
  } finally {
    rl.close();
  }
}
