import type { PromotionDecision, RetainInput } from "../types.js";
export interface PromotionJob {
    id: number;
    idempotencyKey: string;
    sourceId: string;
    payload: RetainInput;
    attempts: number;
}
export interface RetainedMemory {
    sourceId: string;
    payload: RetainInput;
    status: "private" | "promoting" | "promoted" | "forgotten";
}
export type PromotionClaim = "acquired" | "promoted" | "busy" | "not-found";
export declare class PromotionOutbox {
    private readonly db;
    constructor(databasePath: string);
    remember(sourceId: string, payload: RetainInput): void;
    getMemory(sourceId: string, identity: RetainInput["identity"]): RetainedMemory | undefined;
    beginPromotion(sourceId: string): PromotionClaim;
    completePromotion(sourceId: string, method: "automatic" | "explicit"): void;
    releasePromotion(sourceId: string): void;
    forget(sourceId: string): void;
    enqueue(idempotencyKey: string, sourceId: string, payload: RetainInput): void;
    claim(): PromotionJob | undefined;
    complete(id: number, decision: PromotionDecision | {
        promote: false;
        reason: string;
    }): void;
    retry(id: number, attempts: number, error: unknown): void;
    recover(): void;
    close(): void;
    private ensureIdentityColumn;
}
