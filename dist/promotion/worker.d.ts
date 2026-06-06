import type { MemoryProvider, PromotionClassifier } from "../types.js";
import { PromotionOutbox } from "./outbox.js";
export declare class PromotionWorker {
    private readonly outbox;
    private readonly memory;
    private readonly classifier;
    private readonly confidenceThreshold;
    private readonly pollIntervalMs;
    private timer;
    private running;
    constructor(outbox: PromotionOutbox, memory: MemoryProvider, classifier: PromotionClassifier, confidenceThreshold: number, pollIntervalMs: number);
    start(): void;
    stop(): Promise<void>;
    tick(): Promise<void>;
}
