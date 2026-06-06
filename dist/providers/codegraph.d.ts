import type { CodeProvider, CodeQuery } from "../types.js";
interface CodeGraphOptions {
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
}
export declare class WorkspaceNotInitializedError extends Error {
    readonly code = "workspace_not_initialized";
    constructor(reasons: string[]);
}
export declare class DisabledCodeProvider implements CodeProvider {
    private readonly reasons;
    constructor(reasons: string[]);
    context(): Promise<never>;
    search(): Promise<never>;
    callers(): Promise<never>;
    callees(): Promise<never>;
    dependencies(): Promise<never>;
    health(): Promise<{
        ok: boolean;
        detail: string;
    }>;
    close(): Promise<void>;
}
export declare class CodeGraphProvider implements CodeProvider {
    private readonly options;
    private readonly client;
    private readonly breaker;
    private transport;
    private connecting;
    constructor(options: CodeGraphOptions);
    context(task: string, maxNodes?: number): Promise<unknown>;
    search(input: CodeQuery): Promise<unknown>;
    callers(symbol: string, limit?: number): Promise<unknown>;
    callees(symbol: string, limit?: number): Promise<unknown>;
    dependencies(symbol: string, depth?: number): Promise<unknown>;
    health(): Promise<{
        ok: boolean;
        detail?: string;
    }>;
    close(): Promise<void>;
    private ensureConnected;
    private call;
}
export {};
