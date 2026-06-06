import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { saveUserConfig } from "./user-config.js";
import { writeWorkspaceConfig } from "./workspace.js";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "intentir-config-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("merges global settings, workspace identity, and process overrides", () => {
    const home = temporaryDirectory();
    const repositoryRoot = temporaryDirectory();
    saveUserConfig({
      version: 1,
      hindsightMode: "existing",
      env: {
        HINDSIGHT_BASE_URL: "http://configured:8888",
        INTENTIR_AGENT_ID: "configured-agent",
      },
      createdAt: "2026-06-07T00:00:00.000Z",
      updatedAt: "2026-06-07T00:00:00.000Z",
    }, { INTENTIR_HOME: home });
    writeWorkspaceConfig(repositoryRoot, {
      orgId: "org",
      projectId: "project",
      workspaceId: "workspace",
      repositoryId: "repository",
    });
    mkdirSync(path.join(repositoryRoot, ".codegraph"), { recursive: true });
    writeFileSync(path.join(repositoryRoot, ".codegraph", "codegraph.db"), "");

    const config = loadConfig({
      INTENTIR_HOME: home,
      INTENTIR_REPOSITORY_ROOT: repositoryRoot,
      INTENTIR_AGENT_ID: "process-agent",
    });

    expect(config.identity).toEqual({
      orgId: "org",
      projectId: "project",
      workspaceId: "workspace",
      repositoryId: "repository",
      agentId: "process-agent",
    });
    expect(config.hindsight.baseUrl).toBe("http://configured:8888");
    expect(config.workspace.initialized).toBe(true);
  });

  it("allows memory identity from environment without initialized CodeGraph", () => {
    const home = temporaryDirectory();
    const repositoryRoot = temporaryDirectory();
    const config = loadConfig({
      INTENTIR_HOME: home,
      INTENTIR_REPOSITORY_ROOT: repositoryRoot,
      INTENTIR_ORG_ID: "org",
      INTENTIR_PROJECT_ID: "project",
      INTENTIR_WORKSPACE_ID: "workspace",
      INTENTIR_REPOSITORY_ID: "repository",
      INTENTIR_AGENT_ID: "agent",
    });

    expect(config.identity.repositoryId).toBe("repository");
    expect(config.workspace.initialized).toBe(false);
    expect(config.workspace.reasons).toContain("missing .intentir/config.json");
  });
});
