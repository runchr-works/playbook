export class IntentirGateway {
    memory;
    code;
    contextMode;
    repositoryRoot;
    constructor(memory, code, contextMode, repositoryRoot) {
        this.memory = memory;
        this.code = code;
        this.contextMode = contextMode;
        this.repositoryRoot = repositoryRoot;
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
    async sweep(identity) {
        if (!this.contextMode) {
            return {
                detected: false,
                adapter: null,
                sessionCount: 0,
                retained: [],
                summary: "context-mode integration not configured",
            };
        }
        const { detected, adapter, dir, commandInstalled } = await this.contextMode.detect();
        if (!commandInstalled) {
            return {
                detected: false,
                adapter: null,
                sessionCount: 0,
                retained: [],
                summary: "context-mode is not installed. Run `npm install -g context-mode` or re-run `intentir onboard`.",
            };
        }
        if (!detected) {
            return {
                detected: false,
                adapter: null,
                sessionCount: 0,
                retained: [],
                summary: "context-mode is installed but no sessions recorded yet. Make sure it's connected as an MCP server for your agent (see README for per-agent setup).",
            };
        }
        const summary = await this.contextMode.lastSession(this.repositoryRoot);
        if (!summary) {
            return {
                detected: true,
                adapter,
                sessionCount: 0,
                retained: [],
                summary: `context-mode detected (${adapter}) but no recent session found for this project`,
            };
        }
        const retained = [];
        const skippedItems = [];
        // Promote decisions
        for (const decision of summary.decisions) {
            try {
                const result = await this.memory.retain({
                    identity,
                    content: decision,
                    context: "context-mode-sweep:decision",
                });
                retained.push({ sourceId: result.sourceId, content: `[decision] ${decision.slice(0, 100)}` });
            }
            catch {
                skippedItems.push(`decision: ${decision.slice(0, 80)}`);
            }
        }
        // Promote conventions
        for (const convention of summary.conventions) {
            try {
                const result = await this.memory.retain({
                    identity,
                    content: convention,
                    context: "context-mode-sweep:convention",
                });
                retained.push({ sourceId: result.sourceId, content: `[convention] ${convention.slice(0, 100)}` });
            }
            catch {
                skippedItems.push(`convention: ${convention.slice(0, 80)}`);
            }
        }
        // Promote error-fix pairs
        for (const error of summary.errors) {
            if (!error.fix)
                continue;
            const content = `Error: ${error.error}\nFix: ${error.fix}`;
            try {
                const result = await this.memory.retain({
                    identity,
                    content,
                    context: "context-mode-sweep:error-fix",
                });
                retained.push({ sourceId: result.sourceId, content: `[error-fix] ${error.error.slice(0, 80)}` });
            }
            catch {
                skippedItems.push(`error-fix: ${error.error.slice(0, 80)}`);
            }
        }
        const summaryDesc = [
            `context-mode adapter: ${adapter}`,
            `session: ${summary.sessionId.slice(0, 8)}...`,
            `events tracked: ${summary.eventCount}`,
            `decisions found: ${summary.decisions.length}`,
            `conventions detected: ${summary.conventions.length}`,
            `errors captured: ${summary.errors.length}`,
            `memories retained: ${retained.length}`,
        ];
        if (skippedItems.length > 0) {
            summaryDesc.push(`skipped (retain failed): ${skippedItems.length}`);
        }
        return {
            detected: true,
            adapter,
            sessionCount: 1,
            retained,
            summary: summaryDesc.join(" | "),
        };
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