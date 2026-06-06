import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CircuitBreaker, withTimeout } from "../resilience.js";
export class WorkspaceNotInitializedError extends Error {
    code = "workspace_not_initialized";
    constructor(reasons) {
        super(`workspace_not_initialized: ${reasons.join("; ")}`);
        this.name = "WorkspaceNotInitializedError";
    }
}
export class DisabledCodeProvider {
    reasons;
    constructor(reasons) {
        this.reasons = reasons;
    }
    context() {
        return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
    }
    search() {
        return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
    }
    callers() {
        return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
    }
    callees() {
        return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
    }
    dependencies() {
        return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
    }
    health() {
        return Promise.resolve({
            ok: false,
            detail: `workspace_not_initialized: ${this.reasons.join("; ")}`,
        });
    }
    close() {
        return Promise.resolve();
    }
}
export class CodeGraphProvider {
    options;
    client = new Client({ name: "intentir-codegraph-provider", version: "0.1.0" });
    breaker = new CircuitBreaker();
    transport;
    connecting;
    constructor(options) {
        this.options = options;
    }
    context(task, maxNodes = 20) {
        return this.call("codegraph_explore", {
            query: task,
            maxFiles: Math.max(1, Math.min(maxNodes, 20)),
        });
    }
    search(input) {
        return this.call("codegraph_search", { query: input.query, limit: input.limit ?? 20 });
    }
    callers(symbol, limit = 20) {
        return this.call("codegraph_callers", { symbol, limit });
    }
    callees(symbol, limit = 20) {
        return this.call("codegraph_callees", { symbol, limit });
    }
    async dependencies(symbol, depth = 2) {
        const boundedDepth = Math.max(1, Math.min(depth, 10));
        const [callers, callees, impact] = await Promise.all([
            this.call("codegraph_callers", { symbol, limit: 50 }),
            this.call("codegraph_callees", { symbol, limit: 50 }),
            this.call("codegraph_impact", { symbol, depth: boundedDepth }),
        ]);
        return { symbol, depth: boundedDepth, callers, callees, impact };
    }
    async health() {
        try {
            await this.call("codegraph_status", {});
            return { ok: true };
        }
        catch (error) {
            return { ok: false, detail: error instanceof Error ? error.message : String(error) };
        }
    }
    async close() {
        await this.transport?.close();
        this.transport = undefined;
        this.connecting = undefined;
    }
    async ensureConnected() {
        if (this.transport)
            return;
        this.connecting ??= (async () => {
            const transport = new StdioClientTransport({
                command: this.options.command,
                args: this.options.args,
                cwd: this.options.cwd,
                stderr: "inherit",
            });
            await this.client.connect(transport);
            this.transport = transport;
        })().catch((error) => {
            this.connecting = undefined;
            throw error;
        });
        await this.connecting;
    }
    async call(name, args) {
        return this.breaker.run(async () => {
            await this.ensureConnected();
            return withTimeout(this.client.callTool({ name, arguments: args }), this.options.timeoutMs, `CodeGraph ${name}`);
        });
    }
}
//# sourceMappingURL=codegraph.js.map