import type { AgentIdentity, CodeProvider, MemoryProvider, RecallInput, RetainInput } from "./types.js";
import type { PromotionOutbox } from "./promotion/outbox.js";
export declare class IntentirGateway {
    private readonly memory;
    private readonly code;
    private readonly outbox?;
    private readonly autoPromotionEnabled;
    private readonly repositoryRevision?;
    constructor(memory: MemoryProvider, code: CodeProvider, outbox?: PromotionOutbox | undefined, autoPromotionEnabled?: boolean, repositoryRevision?: string | undefined);
    context(identity: AgentIdentity, task: string, maxTokens?: number): Promise<{
        memory?: unknown;
        code?: unknown;
        errors: Array<{
            provider: string;
            message: string;
        }>;
    }>;
    recall(input: RecallInput): Promise<unknown>;
    review(identity: AgentIdentity, scope: "agent-private" | "project-shared" | "all", query?: string, limit?: number, offset?: number): Promise<unknown>;
    retain(input: RetainInput): Promise<unknown>;
    promote(identity: AgentIdentity, sourceId: string): Promise<unknown>;
    forget(identity: AgentIdentity, sourceId: string, scope: "agent-private" | "project-shared" | "all"): Promise<unknown>;
    codeSearch(query: string, limit?: number): Promise<unknown>;
    codeCallers(symbol: string, limit?: number): Promise<unknown>;
    codeCallees(symbol: string, limit?: number): Promise<unknown>;
    codeDependencies(symbol: string, depth?: number): Promise<unknown>;
    health(): Promise<unknown>;
}
