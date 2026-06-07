import type { AgentIdentity, CodeProvider, MemoryProvider, RecallInput, RetainInput } from "./types.js";
export declare class IntentirGateway {
    private readonly memory;
    private readonly code;
    constructor(memory: MemoryProvider, code: CodeProvider);
    context(identity: AgentIdentity, task: string, maxTokens?: number): Promise<{
        memory?: unknown;
        code?: unknown;
        errors: Array<{
            provider: string;
            message: string;
        }>;
    }>;
    recall(input: RecallInput): Promise<unknown>;
    review(identity: AgentIdentity, query?: string, limit?: number, offset?: number): Promise<unknown>;
    retain(input: RetainInput): Promise<unknown>;
    forget(identity: AgentIdentity, sourceId: string): Promise<unknown>;
    codeSearch(query: string, limit?: number): Promise<unknown>;
    codeCallers(symbol: string, limit?: number): Promise<unknown>;
    codeCallees(symbol: string, limit?: number): Promise<unknown>;
    codeDependencies(symbol: string, depth?: number): Promise<unknown>;
    health(): Promise<unknown>;
}
