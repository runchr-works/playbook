import type { MemoryProvider, MemoryForgetInput, MemoryResult, MemoryReviewInput, RecallInput, RetainInput, RetainResult } from "../types.js";
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
    retain(input: RetainInput): Promise<RetainResult>;
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
