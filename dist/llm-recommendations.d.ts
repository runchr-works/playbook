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
export declare const HINDSIGHT_LLM_RECOMMENDATIONS: LlmRecommendation[];
export declare function recommendationFor(provider: string): LlmRecommendation | undefined;
