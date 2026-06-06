import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { IntentirConfig } from "./config.js";
import type { IntentirGateway } from "./gateway.js";
import type { AgentIdentity } from "./types.js";

const identitySchema = {
  sessionId: z.string().optional().describe("Current agent session identifier"),
};

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createMcpServer(
  config: IntentirConfig,
  gateway: IntentirGateway,
): McpServer {
  const server = new McpServer({ name: "intentir", version: "0.1.0" });
  const identity = (sessionId?: string): AgentIdentity => ({
    ...config.identity,
    sessionId: sessionId ?? randomUUID(),
  });

  server.registerTool(
    "intent_context",
    {
      description: "Retrieve project memory and code graph context in parallel",
      inputSchema: {
        task: z.string().min(1),
        maxTokens: z.number().int().positive().max(20_000).optional(),
        ...identitySchema,
      },
    },
    async ({ task, maxTokens, sessionId }) =>
      text(await gateway.context(identity(sessionId), task, maxTokens)),
  );

  server.registerTool(
    "memory_recall",
    {
      description: "Recall agent-private and project-shared memories",
      inputSchema: {
        query: z.string().min(1),
        maxTokens: z.number().int().positive().max(20_000).optional(),
        ...identitySchema,
      },
    },
    async ({ query, maxTokens, sessionId }) =>
      text(await gateway.recall({
        identity: identity(sessionId),
        query,
        ...(maxTokens ? { maxTokens } : {}),
      })),
  );

  server.registerTool(
    "memory_retain",
    {
      description: "Store a private memory and queue it for policy-controlled automatic promotion",
      inputSchema: {
        content: z.string().min(1),
        context: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
        freshness: z.string().datetime().optional(),
        evidenceRefs: z.array(z.string().min(1)).optional(),
        repositoryRevision: z.string().min(1).optional(),
        ...identitySchema,
      },
    },
    async ({
      content,
      context,
      confidence,
      freshness,
      evidenceRefs,
      repositoryRevision,
      sessionId,
    }) =>
      text(await gateway.retain({
        identity: identity(sessionId),
        content,
        ...(context ? { context } : {}),
        ...(
          confidence !== undefined ||
          freshness !== undefined ||
          evidenceRefs !== undefined ||
          repositoryRevision !== undefined
            ? {
                metadata: {
                  confidence: confidence ?? 0.5,
                  freshness: freshness ?? new Date().toISOString(),
                  evidenceRefs: evidenceRefs ?? [],
                  createdByAgent: config.identity.agentId,
                  policyVersion: "gateway-normalized",
                  repositoryRevision: repositoryRevision ?? null,
                },
              }
            : {}
        ),
      })),
  );

  server.registerTool(
    "memory_promote",
    {
      description:
        "Explicitly promote an existing private memory to project-shared memory after security checks",
      inputSchema: {
        sourceId: z.string().min(1).describe("sourceId returned by memory_retain"),
        ...identitySchema,
      },
    },
    async ({ sourceId, sessionId }) =>
      text(await gateway.promote(identity(sessionId), sourceId)),
  );

  server.registerTool(
    "memory_review",
    {
      description: "List retained memory sources and promotion scopes for review",
      inputSchema: {
        scope: z.enum(["agent-private", "project-shared", "all"]).default("project-shared"),
        query: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
        ...identitySchema,
      },
    },
    async ({ scope, query, limit, offset, sessionId }) =>
      text(await gateway.review(identity(sessionId), scope, query, limit, offset)),
  );

  server.registerTool(
    "memory_forget",
    {
      description:
        "Delete a retained memory source, its extracted memory units, and any pending promotion",
      inputSchema: {
        sourceId: z.string().min(1).describe("sourceId returned by retain or review"),
        scope: z.enum(["agent-private", "project-shared", "all"]).default("all"),
        ...identitySchema,
      },
    },
    async ({ sourceId, scope, sessionId }) =>
      text(await gateway.forget(identity(sessionId), sourceId, scope)),
  );

  for (const [name, description, handler] of [
    ["code_search", "Search symbols in the local CodeGraph index", gateway.codeSearch.bind(gateway)],
    ["code_callers", "Find callers of a symbol", gateway.codeCallers.bind(gateway)],
    ["code_callees", "Find callees of a symbol", gateway.codeCallees.bind(gateway)],
  ] as const) {
    server.registerTool(
      name,
      {
        description,
        inputSchema: {
          query: z.string().min(1).describe("Search query or symbol name"),
          limit: z.number().int().positive().max(100).optional(),
        },
      },
      async ({ query, limit }) => text(await handler(query, limit)),
    );
  }

  server.registerTool(
    "code_dependencies",
    {
      description: "Inspect callers, callees, and transitive impact for a symbol",
      inputSchema: {
        symbol: z.string().min(1),
        depth: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ symbol, depth }) => text(await gateway.codeDependencies(symbol, depth)),
  );

  server.registerTool(
    "intentir_health",
    { description: "Check Hindsight and CodeGraph provider health" },
    async () => text(await gateway.health()),
  );

  return server;
}

export async function startMcpServer(
  config: IntentirConfig,
  gateway: IntentirGateway,
): Promise<McpServer> {
  const server = createMcpServer(config, gateway);
  await server.connect(new StdioServerTransport());
  return server;
}
