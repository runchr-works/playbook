import type { RetainInput } from "../types.js";
export declare const PROMOTION_POLICY_VERSION = "2026-06-07.v1";
export interface PolicyResult {
    allowed: boolean;
    reason?: string;
}
export declare function preflightPromotion(input: RetainInput): PolicyResult;
