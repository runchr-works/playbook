import type { MemoryProvider, MemoryForgetInput, MemoryResult, MemoryReviewInput, MemoryScope, PromotionMethod, RecallInput, RetainInput, RetainResult } from "../types.js";
interface HindsightOptions {
    baseUrl: string;
    apiKey?: string;
    tenant: string;
    timeoutMs: number;
}
export declare class HindsightProvider implements MemoryProvider {
    private readonly options;
    private readonly breaker;
    constructor(options: HindsightOptions);
    recall(input: RecallInput): Promise<MemoryResult[]>;
    retain(input: RetainInput, scope?: MemoryScope): Promise<RetainResult>;
    promote(input: RetainInput, sourceId: string, method?: PromotionMethod): Promise<RetainResult>;
    review(input: MemoryReviewInput): Promise<unknown>;
    forget(input: MemoryForgetInput): Promise<unknown>;
    private write;
    health(): Promise<{
        ok: boolean;
        detail?: string;
    }>;
    private request;
}
export {};
