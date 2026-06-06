import { createHash } from "node:crypto";
import type {
  AgentIdentity,
  CodeProvider,
  MemoryProvider,
  RecallInput,
  RetainInput,
} from "./types.js";
import type { PromotionOutbox } from "./promotion/outbox.js";
import { preflightPromotion, PROMOTION_POLICY_VERSION } from "./promotion/policy.js";

export class IntentirGateway {
  constructor(
    private readonly memory: MemoryProvider,
    private readonly code: CodeProvider,
    private readonly outbox?: PromotionOutbox,
    private readonly autoPromotionEnabled = false,
    private readonly repositoryRevision?: string,
  ) {}

  async context(identity: AgentIdentity, task: string, maxTokens = 2_000): Promise<{
    memory?: unknown;
    code?: unknown;
    errors: Array<{ provider: string; message: string }>;
  }> {
    const [memory, code] = await Promise.allSettled([
      this.memory.recall({ identity, query: task, maxTokens }),
      this.code.context(task),
    ]);
    return {
      ...(memory.status === "fulfilled" ? { memory: memory.value } : {}),
      ...(code.status === "fulfilled" ? { code: code.value } : {}),
      errors: [
        ...(memory.status === "rejected"
          ? [{ provider: "hindsight", message: String(memory.reason) }]
          : []),
        ...(code.status === "rejected"
          ? [{ provider: "codegraph", message: String(code.reason) }]
          : []),
      ],
    };
  }

  recall(input: RecallInput): Promise<unknown> {
    return this.memory.recall(input);
  }

  review(
    identity: AgentIdentity,
    scope: "agent-private" | "project-shared" | "all",
    query?: string,
    limit?: number,
    offset?: number,
  ): Promise<unknown> {
    return this.memory.review({
      identity,
      scope,
      ...(query ? { query } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
  }

  async retain(input: RetainInput): Promise<unknown> {
    const normalized: RetainInput = {
      ...input,
      metadata: {
        confidence: input.metadata?.confidence ?? 0.5,
        freshness: input.metadata?.freshness ?? new Date().toISOString(),
        evidenceRefs: input.metadata?.evidenceRefs ?? [],
        createdByAgent: input.identity.agentId,
        policyVersion: PROMOTION_POLICY_VERSION,
        repositoryRevision:
          input.metadata?.repositoryRevision ?? this.repositoryRevision ?? null,
      },
    };
    const retained = await this.memory.retain(normalized, "agent-private");
    if (this.outbox) {
      this.outbox.remember(retained.sourceId, normalized);
    }
    if (this.outbox && this.autoPromotionEnabled) {
      const idempotencyKey = createHash("sha256")
        .update([
          input.identity.orgId,
          input.identity.projectId,
          input.identity.workspaceId,
          input.identity.repositoryId,
          input.identity.agentId,
          retained.sourceId,
          normalized.content,
        ].join("\0"))
        .digest("hex");
      this.outbox.enqueue(idempotencyKey, retained.sourceId, normalized);
    }
    return { ...retained, promotionQueued: Boolean(this.outbox && this.autoPromotionEnabled) };
  }

  async promote(identity: AgentIdentity, sourceId: string): Promise<unknown> {
    if (!this.outbox) throw new Error("Explicit promotion storage is not configured");
    const retained = this.outbox.getMemory(sourceId, identity);
    if (!retained) throw new Error("Private memory not found for this agent");
    if (retained.status === "promoted") {
      return { sourceId, promoted: true, alreadyPromoted: true };
    }

    const policy = preflightPromotion(retained.payload);
    if (!policy.allowed) {
      throw new Error(`Explicit promotion rejected: ${policy.reason ?? "Policy rejected"}`);
    }

    const claim = this.outbox.beginPromotion(sourceId);
    if (claim === "promoted") return { sourceId, promoted: true, alreadyPromoted: true };
    if (claim !== "acquired") throw new Error("Memory promotion is already in progress");
    try {
      const result = await this.memory.promote(retained.payload, sourceId, "explicit");
      this.outbox.completePromotion(sourceId, "explicit");
      return { ...result, promoted: true, alreadyPromoted: false };
    } catch (error) {
      this.outbox.releasePromotion(sourceId);
      throw error;
    }
  }

  async forget(
    identity: AgentIdentity,
    sourceId: string,
    scope: "agent-private" | "project-shared" | "all",
  ): Promise<unknown> {
    const result = await this.memory.forget({ identity, sourceId, scope });
    this.outbox?.forget(sourceId);
    return result;
  }

  codeSearch(query: string, limit?: number): Promise<unknown> {
    return this.code.search({ query, ...(limit ? { limit } : {}) });
  }

  codeCallers(symbol: string, limit?: number): Promise<unknown> {
    return this.code.callers(symbol, limit);
  }

  codeCallees(symbol: string, limit?: number): Promise<unknown> {
    return this.code.callees(symbol, limit);
  }

  codeDependencies(symbol: string, depth?: number): Promise<unknown> {
    return this.code.dependencies(symbol, depth);
  }

  async health(): Promise<unknown> {
    const [hindsight, codegraph] = await Promise.all([
      this.memory.health(),
      this.code.health(),
    ]);
    return { hindsight, codegraph };
  }
}
