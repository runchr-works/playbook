export interface LlmRecommendation {
    provider: string;
    label: string;
    defaultModel: string;
    alternatives: string[];
    apiKeyRequired: boolean;
    defaultBaseUrl?: string;
}
export declare const HINDSIGHT_LLM_RECOMMENDATIONS: LlmRecommendation[];
export declare function recommendationFor(provider: string): LlmRecommendation | undefined;
