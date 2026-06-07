import type {
  AgentIdentity,
  CodeProvider,
  MemoryProvider,
  RecallInput,
  RetainInput,
} from "./types.js";

export class IntentirGateway {
  constructor(
    private readonly memory: MemoryProvider,
    private readonly code: CodeProvider,
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
    query?: string,
    limit?: number,
    offset?: number,
  ): Promise<unknown> {
    return this.memory.review({
      identity,
      ...(query ? { query } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
  }

  retain(input: RetainInput): Promise<unknown> {
    return this.memory.retain(input);
  }

  forget(identity: AgentIdentity, sourceId: string): Promise<unknown> {
    return this.memory.forget({ identity, sourceId });
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
