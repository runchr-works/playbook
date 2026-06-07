import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  configureGlobalContextMode,
  configureProjectAgent,
} from "./agent-config.js";

const directories: string[] = [];

function directory(): string {
  const root = mkdtempSync(path.join(tmpdir(), "memkit-agent-config-"));
  directories.push(root);
  return root;
}

afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true });
});

const connections = {
  hindsightUrl: "http://localhost:8888/mcp/project/",
  codegraphCommand: "codegraph",
  codegraphArgs: ["serve", "--mcp"],
};

describe("agent configuration adapters", () => {
  it("merges Codex project MCP servers without replacing existing TOML", () => {
    const root = directory();
    const filename = path.join(root, ".codex", "config.toml");
    configureProjectAgent("codex", root, connections);
    writeFileSync(filename, `model = "gpt-test"\n\n${readFileSync(filename, "utf8")}`);
    configureProjectAgent("codex", root, connections);

    const value = readFileSync(filename, "utf8");
    expect(value).toContain('model = "gpt-test"');
    expect(value.match(/\[mcp_servers\.hindsight\]/g)).toHaveLength(1);
    expect(value).toContain("[mcp_servers.codegraph]");
  });

  it("preserves Codex MCP servers configured outside the memkit block", () => {
    const root = directory();
    const filename = path.join(root, ".codex", "config.toml");
    configureProjectAgent("codex", root, connections);
    writeFileSync(
      filename,
      [
        "[mcp_servers.hindsight]",
        'url = "http://custom/mcp/"',
        "",
        "[mcp_servers.other]",
        'command = "other"',
        "",
      ].join("\n"),
    );
    configureProjectAgent("codex", root, connections);

    const value = readFileSync(filename, "utf8");
    expect(value.match(/\[mcp_servers\.hindsight\]/g)).toHaveLength(1);
    expect(value).toContain('url = "http://custom/mcp/"');
    expect(value).toContain("[mcp_servers.codegraph]");
    expect(value).toContain("[mcp_servers.other]");
  });

  it("writes Cursor project configuration using mcpServers", () => {
    const root = directory();
    const result = configureProjectAgent("cursor", root, connections);
    const value = JSON.parse(readFileSync(result.path!, "utf8"));
    expect(value.mcpServers.hindsight.url).toBe(connections.hindsightUrl);
    expect(value.mcpServers.codegraph.command).toBe("codegraph");
    expect(value.mcpServers.codegraph.args).toEqual(["serve", "--mcp"]);
  });

  it("writes OpenCode project configuration using native local and remote schemas", () => {
    const root = directory();
    const result = configureProjectAgent("opencode", root, connections);
    const value = JSON.parse(readFileSync(result.path!, "utf8"));
    expect(value.mcp.codegraph).toEqual({
      type: "local",
      command: ["codegraph", "serve", "--mcp"],
      enabled: true,
    });
    expect(value.mcp.hindsight).toEqual({
      type: "remote",
      url: connections.hindsightUrl,
      enabled: true,
    });
  });

  it("keeps context-mode in global agent configuration", () => {
    const home = directory();
    const result = configureGlobalContextMode("codex", home);
    expect(result.configured).toBe(true);
    expect(readFileSync(result.path!, "utf8")).toContain("[mcp_servers.context-mode]");
  });

  it("returns actionable manual setup for plugin-based agents", () => {
    expect(configureGlobalContextMode("pi", directory())).toMatchObject({
      configured: false,
      detail: "run `pi install npm:context-mode` inside Pi",
    });
  });
});
