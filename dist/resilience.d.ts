export declare function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T>;
export declare class CircuitBreaker {
    private readonly threshold;
    private readonly resetMs;
    private failures;
    private openUntil;
    constructor(threshold?: number, resetMs?: number);
    run<T>(operation: () => Promise<T>): Promise<T>;
}
