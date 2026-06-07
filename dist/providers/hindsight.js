import { randomUUID } from "node:crypto";
import { CircuitBreaker, withTimeout } from "../resilience.js";
function parseNumber(value) {
    if (value === undefined)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function parseEvidenceRefs(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}
export class HindsightProvider {
    options;
    breaker = new CircuitBreaker();
    constructor(options) {
        this.options = options;
    }
    async recall(input) {
        const bank = input.identity.bankId;
        const response = await this.request(`/v1/${encodeURIComponent(this.options.tenant)}/banks/${encodeURIComponent(bank)}/memories/recall`, {
            method: "POST",
            body: JSON.stringify({
                query: input.query,
                budget: "mid",
                ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
            }),
        });
        return (response.results ?? []).map((item, rank) => ({
            id: item.id ?? `${bank}:${rank}`,
            text: item.text ?? "",
            ...(item.type ? { type: item.type } : {}),
            context: item.context ?? null,
            metadata: {
                provider: "hindsight",
                bank,
                revision: item.metadata?.repository_revision ?? null,
                confidence: parseNumber(item.metadata?.confidence),
                freshness: item.metadata?.freshness ?? null,
                evidenceRefs: parseEvidenceRefs(item.metadata?.evidence_refs),
                createdByAgent: item.metadata?.created_by_agent ?? null,
                policyVersion: item.metadata?.policy_version ?? null,
            },
        }));
    }
    async retain(input) {
        const sourceId = randomUUID();
        return this.write(input, sourceId);
    }
    async review(input) {
        const bank = input.identity.bankId;
        const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
        const offset = Math.max(0, input.offset ?? 0);
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
        });
        if (input.query)
            params.set("q", input.query);
        const documents = await this.request(`/v1/${encodeURIComponent(this.options.tenant)}/banks/${encodeURIComponent(bank)}/documents?${params}`, { method: "GET" });
        const items = await Promise.all((documents.items ?? []).map(async (document) => {
            const detail = await this.request(`/v1/${encodeURIComponent(this.options.tenant)}/banks/${encodeURIComponent(bank)}/documents/${encodeURIComponent(document.id)}`, { method: "GET" });
            return {
                sourceId: detail.id,
                content: detail.original_text ?? null,
                bank,
                createdAt: detail.created_at ?? document.created_at ?? null,
                updatedAt: detail.updated_at ?? document.updated_at ?? null,
                memoryUnitCount: detail.memory_unit_count ?? document.memory_unit_count ?? 0,
                metadata: detail.document_metadata ?? null,
            };
        }));
        return {
            bank,
            items,
            total: documents.total ?? items.length,
            limit: documents.limit ?? limit,
            offset: documents.offset ?? offset,
        };
    }
    async forget(input) {
        const bank = input.identity.bankId;
        try {
            const result = await this.request(`/v1/${encodeURIComponent(this.options.tenant)}/banks/${encodeURIComponent(bank)}/documents/${encodeURIComponent(input.sourceId)}`, { method: "DELETE" });
            return {
                sourceId: input.sourceId,
                bank,
                deleted: result.success ?? true,
                memoryUnitsDeleted: result.memory_units_deleted ?? 0,
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes("Hindsight 404:")) {
                return { sourceId: input.sourceId, bank, deleted: false, memoryUnitsDeleted: 0 };
            }
            throw error;
        }
    }
    async write(input, sourceId) {
        const bank = input.identity.bankId;
        await this.request(`/v1/${encodeURIComponent(this.options.tenant)}/banks/${encodeURIComponent(bank)}/memories`, {
            method: "POST",
            body: JSON.stringify({
                items: [{
                        content: input.content,
                        document_id: sourceId,
                        context: input.context ?? "intentir",
                    }],
            }),
        });
        return { bank, sourceId };
    }
    async health() {
        try {
            await this.request("/health", { method: "GET" });
            return { ok: true };
        }
        catch (error) {
            return { ok: false, detail: error instanceof Error ? error.message : String(error) };
        }
    }
    async request(pathname, init) {
        return this.breaker.run(async () => {
            const headers = new Headers(init.headers);
            headers.set("content-type", "application/json");
            if (this.options.apiKey)
                headers.set("authorization", `Bearer ${this.options.apiKey}`);
            const response = await withTimeout(fetch(`${this.options.baseUrl}${pathname}`, { ...init, headers }), this.options.timeoutMs, "Hindsight request");
            if (!response.ok) {
                throw new Error(`Hindsight ${response.status}: ${await response.text()}`);
            }
            const text = await response.text();
            return (text ? JSON.parse(text) : {});
        });
    }
}
//# sourceMappingURL=hindsight.js.map