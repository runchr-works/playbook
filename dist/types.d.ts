export interface AgentIdentity {
    bankId: string;
}
export interface ResultMetadata {
    provider: "hindsight" | "codegraph";
    bank?: string;
    revision: string | null;
    confidence: number | null;
    freshness: string | null;
    evidenceRefs: string[];
    createdByAgent: string | null;
    policyVersion: string | null;
}
export interface MemoryResult {
    id: string;
    text: string;
    type?: string;
    context?: string | null;
    metadata: ResultMetadata;
}
export interface RetainInput {
    identity: AgentIdentity;
    content: string;
    context?: string;
}
export interface RetainResult {
    bank: string;
    sourceId: string;
}
export interface RecallInput {
    identity: AgentIdentity;
    query: string;
    maxTokens?: number;
}
export interface MemoryReviewInput {
    identity: AgentIdentity;
    query?: string;
    limit?: number;
    offset?: number;
}
export interface MemoryForgetInput {
    identity: AgentIdentity;
    sourceId: string;
}
export interface MemoryProvider {
    recall(input: RecallInput): Promise<MemoryResult[]>;
    retain(input: RetainInput): Promise<RetainResult>;
    review(input: MemoryReviewInput): Promise<unknown>;
    forget(input: MemoryForgetInput): Promise<unknown>;
    health(): Promise<{
        ok: boolean;
        detail?: string;
    }>;
}
export interface SessionEvent {
    category: string;
    type: string;
    priority: number;
    data: Record<string, unknown>;
    createdAt: string;
}
export interface SessionSummary {
    sessionId: string;
    startedAt: string | null;
    eventCount: number;
    decisions: string[];
    conventions: string[];
    errors: Array<{
        error: string;
        fix: string | null;
    }>;
    keyFiles: string[];
    lastPrompt: string | null;
}
export interface SweepResult {
    detected: boolean;
    adapter: string | null;
    sessionCount: number;
    retained: Array<{
        sourceId: string;
        content: string;
    }>;
    summary: string;
}
export interface ContextModeProvider {
    detect(): Promise<{
        detected: boolean;
        adapter: string;
        dir: string;
    }>;
    lastSession(projectHash: string): Promise<SessionSummary | null>;
}
export interface CodeQuery {
    query: string;
    limit?: number;
}
export interface CodeProvider {
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
}
