export class IntentirGateway {
    memory;
    code;
    constructor(memory, code) {
        this.memory = memory;
        this.code = code;
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
    review(identity, query, limit, offset) {
        return this.memory.review({
            identity,
            ...(query ? { query } : {}),
            ...(limit !== undefined ? { limit } : {}),
            ...(offset !== undefined ? { offset } : {}),
        });
    }
    retain(input) {
        return this.memory.retain(input);
    }
    forget(identity, sourceId) {
        return this.memory.forget({ identity, sourceId });
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