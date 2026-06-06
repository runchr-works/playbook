import { createHash } from "node:crypto";
import { preflightPromotion, PROMOTION_POLICY_VERSION } from "./promotion/policy.js";
export class IntentirGateway {
    memory;
    code;
    outbox;
    autoPromotionEnabled;
    repositoryRevision;
    constructor(memory, code, outbox, autoPromotionEnabled = false, repositoryRevision) {
        this.memory = memory;
        this.code = code;
        this.outbox = outbox;
        this.autoPromotionEnabled = autoPromotionEnabled;
        this.repositoryRevision = repositoryRevision;
    }
    async context(identity, task, maxTokens = 2_000) {
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
    recall(input) {
        return this.memory.recall(input);
    }
    review(identity, scope, query, limit, offset) {
        return this.memory.review({
            identity,
            scope,
            ...(query ? { query } : {}),
            ...(limit !== undefined ? { limit } : {}),
            ...(offset !== undefined ? { offset } : {}),
        });
    }
    async retain(input) {
        const normalized = {
            ...input,
            metadata: {
                confidence: input.metadata?.confidence ?? 0.5,
                freshness: input.metadata?.freshness ?? new Date().toISOString(),
                evidenceRefs: input.metadata?.evidenceRefs ?? [],
                createdByAgent: input.identity.agentId,
                policyVersion: PROMOTION_POLICY_VERSION,
                repositoryRevision: input.metadata?.repositoryRevision ?? this.repositoryRevision ?? null,
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
    async promote(identity, sourceId) {
        if (!this.outbox)
            throw new Error("Explicit promotion storage is not configured");
        const retained = this.outbox.getMemory(sourceId, identity);
        if (!retained)
            throw new Error("Private memory not found for this agent");
        if (retained.status === "promoted") {
            return { sourceId, promoted: true, alreadyPromoted: true };
        }
        const policy = preflightPromotion(retained.payload);
        if (!policy.allowed) {
            throw new Error(`Explicit promotion rejected: ${policy.reason ?? "Policy rejected"}`);
        }
        const claim = this.outbox.beginPromotion(sourceId);
        if (claim === "promoted")
            return { sourceId, promoted: true, alreadyPromoted: true };
        if (claim !== "acquired")
            throw new Error("Memory promotion is already in progress");
        try {
            const result = await this.memory.promote(retained.payload, sourceId, "explicit");
            this.outbox.completePromotion(sourceId, "explicit");
            return { ...result, promoted: true, alreadyPromoted: false };
        }
        catch (error) {
            this.outbox.releasePromotion(sourceId);
            throw error;
        }
    }
    async forget(identity, sourceId, scope) {
        const result = await this.memory.forget({ identity, sourceId, scope });
        this.outbox?.forget(sourceId);
        return result;
    }
    codeSearch(query, limit) {
        return this.code.search({ query, ...(limit ? { limit } : {}) });
    }
    codeCallers(symbol, limit) {
        return this.code.callers(symbol, limit);
    }
    codeCallees(symbol, limit) {
        return this.code.callees(symbol, limit);
    }
    codeDependencies(symbol, depth) {
        return this.code.dependencies(symbol, depth);
    }
    async health() {
        const [hindsight, codegraph] = await Promise.all([
            this.memory.health(),
            this.code.health(),
        ]);
        return { hindsight, codegraph };
    }
}
//# sourceMappingURL=gateway.js.map