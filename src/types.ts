export type MemoryScope = "agent-private" | "project-shared";

export interface AgentIdentity {
  orgId: string;
  projectId: string;
  workspaceId: string;
  repositoryId: string;
  agentId: string;
  sessionId?: string;
}

export interface ResultMetadata {
  provider: "hindsight" | "codegraph";
  scope?: MemoryScope;
  bank?: string;
  repository?: string;
  revision: string | null;
  confidence: number | null;
  freshness: string | null;
  evidenceRefs: string[];
  createdByAgent: string | null;
  policyVersion: string | null;
}

export interface MemoryMetadata {
  confidence: number;
  freshness: string;
  evidenceRefs: string[];
  createdByAgent: string;
  policyVersion: string;
  repositoryRevision: string | null;
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
  metadata?: MemoryMetadata;
}

export interface RetainResult {
  bank: string;
  sourceId: string;
}

export type PromotionMethod = "automatic" | "explicit";

export interface RecallInput {
  identity: AgentIdentity;
  query: string;
  maxTokens?: number;
}

export interface MemoryReviewInput {
  identity: AgentIdentity;
  scope: MemoryScope | "all";
  query?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryForgetInput {
  identity: AgentIdentity;
  sourceId: string;
  scope: MemoryScope | "all";
}

export interface MemoryProvider {
  recall(input: RecallInput): Promise<MemoryResult[]>;
  retain(input: RetainInput, scope?: MemoryScope): Promise<RetainResult>;
  promote(
    input: RetainInput,
    sourceId: string,
    method?: PromotionMethod,
  ): Promise<RetainResult>;
  review(input: MemoryReviewInput): Promise<unknown>;
  forget(input: MemoryForgetInput): Promise<unknown>;
  health(): Promise<{ ok: boolean; detail?: string }>;
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
  health(): Promise<{ ok: boolean; detail?: string }>;
  close(): Promise<void>;
}

export interface PromotionDecision {
  promote: boolean;
  confidence: number;
  reusable: boolean;
  factual: boolean;
  sensitive: boolean;
  ttl?: string | null | undefined;
  reason: string;
}

export interface PromotionClassifier {
  classify(input: RetainInput): Promise<PromotionDecision>;
}
