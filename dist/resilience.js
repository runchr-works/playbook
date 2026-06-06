export async function withTimeout(operation, timeoutMs, label) {
    let timer;
    try {
        return await Promise.race([
            operation,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
export class CircuitBreaker {
    threshold;
    resetMs;
    failures = 0;
    openUntil = 0;
    constructor(threshold = 3, resetMs = 30_000) {
        this.threshold = threshold;
        this.resetMs = resetMs;
    }
    async run(operation) {
        if (Date.now() < this.openUntil)
            throw new Error("Provider circuit is open");
        try {
            const result = await operation();
            this.failures = 0;
            return result;
        }
        catch (error) {
            this.failures += 1;
            if (this.failures >= this.threshold) {
                this.openUntil = Date.now() + this.resetMs;
                this.failures = 0;
            }
            throw error;
        }
    }
}
//# sourceMappingURL=resilience.js.map