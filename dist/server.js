import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
function text(value) {
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}
export function createMcpServer(config, gateway) {
    const server = new McpServer({ name: "intentir", version: "0.1.0" });
    const identity = config.identity;
    server.registerTool("intent_context", {
        description: "Retrieve project memory and code graph context in parallel",
        inputSchema: {
            task: z.string().min(1),
            maxTokens: z.number().int().positive().max(20_000).optional(),
        },
    }, async ({ task, maxTokens }) => text(await gateway.context(identity, task, maxTokens)));
    server.registerTool("memory_recall", {
        description: "Recall memories from the configured Hindsight bank",
        inputSchema: {
            query: z.string().min(1),
            maxTokens: z.number().int().positive().max(20_000).optional(),
        },
    }, async ({ query, maxTokens }) => text(await gateway.recall({
        identity,
        query,
        ...(maxTokens ? { maxTokens } : {}),
    })));
    server.registerTool("memory_retain", {
        description: "Store a memory in the configured Hindsight bank",
        inputSchema: {
            content: z.string().min(1),
            context: z.string().optional(),
        },
    }, async ({ content, context }) => text(await gateway.retain({
        identity,
        content,
        ...(context ? { context } : {}),
    })));
    server.registerTool("memory_review", {
        description: "List retained memory sources in the configured Hindsight bank",
        inputSchema: {
            query: z.string().optional(),
            limit: z.number().int().positive().max(100).optional(),
            offset: z.number().int().nonnegative().optional(),
        },
    }, async ({ query, limit, offset }) => text(await gateway.review(identity, query, limit, offset)));
    server.registerTool("memory_forget", {
        description: "Delete a retained memory source and its extracted memory units",
        inputSchema: {
            sourceId: z.string().min(1).describe("sourceId returned by retain or review"),
        },
    }, async ({ sourceId }) => text(await gateway.forget(identity, sourceId)));
    for (const [name, description, handler] of [
        ["code_search", "Search symbols in the local CodeGraph index", gateway.codeSearch.bind(gateway)],
        ["code_callers", "Find callers of a symbol", gateway.codeCallers.bind(gateway)],
        ["code_callees", "Find callees of a symbol", gateway.codeCallees.bind(gateway)],
    ]) {
        server.registerTool(name, {
            description,
            inputSchema: {
                query: z.string().min(1).describe("Search query or symbol name"),
                limit: z.number().int().positive().max(100).optional(),
            },
        }, async ({ query, limit }) => text(await handler(query, limit)));
    }
    server.registerTool("code_dependencies", {
        description: "Inspect callers, callees, and transitive impact for a symbol",
        inputSchema: {
            symbol: z.string().min(1),
            depth: z.number().int().min(1).max(10).optional(),
        },
    }, async ({ symbol, depth }) => text(await gateway.codeDependencies(symbol, depth)));
    server.registerTool("intentir_health", { description: "Check Hindsight and CodeGraph provider health" }, async () => text(await gateway.health()));
    return server;
}
export async function startMcpServer(config, gateway) {
    const server = createMcpServer(config, gateway);
    await server.connect(new StdioServerTransport());
    return server;
}
//# sourceMappingURL=server.js.map