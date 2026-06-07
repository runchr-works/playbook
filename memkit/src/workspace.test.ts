import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  removeWorkspaceState,
  workspaceState,
  writeMcpJson,
  writeWorkspaceConfig,
} from "./workspace.js";

const directories: string[] = [];

function repository(): string {
  const root = mkdtempSync(path.join(tmpdir(), "memkit-workspace-"));
  directories.push(root);
  return root;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("workspace state", () => {
  it("requires both memkit config and CodeGraph database", () => {
    const root = repository();
    writeWorkspaceConfig(root, {
      bankId: "project",
    });
    expect(workspaceState(root)).toMatchObject({
      initialized: false,
      memkitInitialized: true,
      codegraphInitialized: false,
      reasons: ["missing .codegraph/codegraph.db"],
    });

    mkdirSync(path.join(root, ".codegraph"), { recursive: true });
    writeFileSync(path.join(root, ".codegraph", "codegraph.db"), "");
    expect(workspaceState(root).initialized).toBe(true);
  });

  it("removes memkit state and preserves graph by default", () => {
    const root = repository();
    writeWorkspaceConfig(root, {
      bankId: "project",
    });
    mkdirSync(path.join(root, ".codegraph"), { recursive: true });
    writeFileSync(path.join(root, ".codegraph", "codegraph.db"), "");

    removeWorkspaceState(root, false);

    expect(workspaceState(root).reasons).toContain("missing .memkit/config.json");
    expect(workspaceState(root).reasons).not.toContain("missing .codegraph/codegraph.db");
  });

  it("creates .mcp.json with direct tool connections", () => {
    const root = repository();
    const result = writeMcpJson(root, "my-bank", "http://localhost:8888");
    expect(result.mcpServers.hindsight).toEqual({ url: "http://localhost:8888/mcp/my-bank/" });
    expect(result.mcpServers.codegraph).toEqual({ command: "codegraph" });
    expect(result.mcpServers["context-mode"]).toEqual({ command: "context-mode" });
    expect(readFileSync(path.join(root, ".mcp.json"), "utf8")).toContain('"codegraph"');
  });

  it("merges into existing .mcp.json without removing other servers", () => {
    const root = repository();
    writeFileSync(
      path.join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { existing: { command: "other-tool" } } }, null, 2),
    );
    const result = writeMcpJson(root, "my-bank", "http://localhost:8888");
    expect(result.mcpServers.hindsight).toBeDefined();
    expect(result.mcpServers.existing).toEqual({ command: "other-tool" });
  });

  it("overwrites existing tool entries on re-init", () => {
    const root = repository();
    writeFileSync(
      path.join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { codegraph: { command: "old" } } }, null, 2),
    );
    const result = writeMcpJson(root, "my-bank");
    expect(result.mcpServers.codegraph).toEqual({ command: "codegraph" });
  });
});
