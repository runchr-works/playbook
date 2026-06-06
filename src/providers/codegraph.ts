import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CircuitBreaker, withTimeout } from "../resilience.js";
import type { CodeProvider, CodeQuery } from "../types.js";

interface CodeGraphOptions {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}

export class WorkspaceNotInitializedError extends Error {
  readonly code = "workspace_not_initialized";

  constructor(reasons: string[]) {
    super(`workspace_not_initialized: ${reasons.join("; ")}`);
    this.name = "WorkspaceNotInitializedError";
  }
}

export class DisabledCodeProvider implements CodeProvider {
  constructor(private readonly reasons: string[]) {}

  context(): Promise<never> {
    return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
  }
  search(): Promise<never> {
    return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
  }
  callers(): Promise<never> {
    return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
  }
  callees(): Promise<never> {
    return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
  }
  dependencies(): Promise<never> {
    return Promise.reject(new WorkspaceNotInitializedError(this.reasons));
  }
  health(): Promise<{ ok: boolean; detail: string }> {
    return Promise.resolve({
      ok: false,
      detail: `workspace_not_initialized: ${this.reasons.join("; ")}`,
    });
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class CodeGraphProvider implements CodeProvider {
  private readonly client = new Client({ name: "intentir-codegraph-provider", version: "0.1.0" });
  private readonly breaker = new CircuitBreaker();
  private transport: StdioClientTransport | undefined;
  private connecting: Promise<void> | undefined;

  constructor(private readonly options: CodeGraphOptions) {}

  context(task: string, maxNodes = 20): Promise<unknown> {
    return this.call("codegraph_explore", {
      query: task,
      maxFiles: Math.max(1, Math.min(maxNodes, 20)),
    });
  }

  search(input: CodeQuery): Promise<unknown> {
    return this.call("codegraph_search", { query: input.query, limit: input.limit ?? 20 });
  }

  callers(symbol: string, limit = 20): Promise<unknown> {
    return this.call("codegraph_callers", { symbol, limit });
  }

  callees(symbol: string, limit = 20): Promise<unknown> {
    return this.call("codegraph_callees", { symbol, limit });
  }

  async dependencies(symbol: string, depth = 2): Promise<unknown> {
    const boundedDepth = Math.max(1, Math.min(depth, 10));
    const [callers, callees, impact] = await Promise.all([
      this.call("codegraph_callers", { symbol, limit: 50 }),
      this.call("codegraph_callees", { symbol, limit: 50 }),
      this.call("codegraph_impact", { symbol, depth: boundedDepth }),
    ]);
    return { symbol, depth: boundedDepth, callers, callees, impact };
  }

  async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.call("codegraph_status", {});
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  async close(): Promise<void> {
    await this.transport?.close();
    this.transport = undefined;
    this.connecting = undefined;
  }

  private async ensureConnected(): Promise<void> {
    if (this.transport) return;
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

  private async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.breaker.run(async () => {
      await this.ensureConnected();
      return withTimeout(
        this.client.callTool({ name, arguments: args }),
        this.options.timeoutMs,
        `CodeGraph ${name}`,
      );
    });
  }
}
