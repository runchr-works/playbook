export declare function checkHindsightHealth(baseUrl: string, timeoutMs?: number): Promise<{
    ok: boolean;
    detail: string;
}>;
export declare function waitForHindsight(baseUrl: string, timeoutMs?: number, intervalMs?: number): Promise<boolean>;
export declare function startHindsight(hindsightEnv: Record<string, string>): Promise<number>;
