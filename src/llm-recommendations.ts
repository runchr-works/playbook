export interface LlmRecommendation {
  provider: string;
  label: string;
  defaultModel: string;
  alternatives: string[];
  apiKeyRequired: boolean;
  defaultBaseUrl?: string;
  /** Hindsight embeddings provider — 'local' when the LLM provider has no embeddings API */
  embeddingsProvider: string;
  /** Hindsight reranker provider — 'none' disables reranking (recommended for non-Cohere users) */
  rerankerProvider: string;
}

export const HINDSIGHT_LLM_RECOMMENDATIONS: LlmRecommendation[] = [
  {
    provider: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    alternatives: ["gpt-5-mini", "gpt-5-nano", "gpt-4.1-mini"],
    apiKeyRequired: true,
    defaultBaseUrl: "https://api.openai.com/v1",
    embeddingsProvider: "openai",
    rerankerProvider: "rrf",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-haiku-4-5-20251001",
    alternatives: ["claude-sonnet-4-5-20250929", "claude-sonnet-4-20250514"],
    apiKeyRequired: true,
    embeddingsProvider: "local",
    rerankerProvider: "rrf",
  },
  {
    provider: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    alternatives: ["gemini-2.5-flash-lite", "gemini-3-pro-preview"],
    apiKeyRequired: true,
    embeddingsProvider: "gemini",
    rerankerProvider: "rrf",
  },
  {
    provider: "groq",
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    alternatives: ["openai/gpt-oss-20b"],
    apiKeyRequired: true,
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    embeddingsProvider: "local",
    rerankerProvider: "rrf",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    defaultModel: "qwen/qwen3.5-9b",
    alternatives: ["anthropic/claude-sonnet-4-20250514"],
    apiKeyRequired: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    embeddingsProvider: "openrouter",
    rerankerProvider: "rrf",
  },
  {
    provider: "ollama",
    label: "Ollama (local)",
    defaultModel: "gemma3:12b",
    alternatives: ["gpt-oss:20b"],
    apiKeyRequired: false,
    defaultBaseUrl: "http://localhost:11434/v1",
    embeddingsProvider: "local",
    rerankerProvider: "rrf",
  },
  {
    provider: "lmstudio",
    label: "LM Studio (local)",
    defaultModel: "local-model",
    alternatives: [],
    apiKeyRequired: false,
    defaultBaseUrl: "http://localhost:1234/v1",
    embeddingsProvider: "local",
    rerankerProvider: "rrf",
  },
  {
    provider: "openai-codex",
    label: "OpenAI Codex subscription (personal local use)",
    defaultModel: "gpt-5.4-mini",
    alternatives: [],
    apiKeyRequired: false,
    embeddingsProvider: "openai",
    rerankerProvider: "rrf",
  },
  {
    provider: "claude-code",
    label: "Claude Code subscription (personal local use)",
    defaultModel: "claude-sonnet-4-5-20250929",
    alternatives: [],
    apiKeyRequired: false,
    embeddingsProvider: "local",
    rerankerProvider: "rrf",
  },
];

export function recommendationFor(provider: string): LlmRecommendation | undefined {
  return HINDSIGHT_LLM_RECOMMENDATIONS.find((item) => item.provider === provider);
}
