import { describe, expect, it } from "vitest";
import { bankId } from "./banks.js";

const identity = {
  orgId: "Acme Inc",
  projectId: "Portal",
  workspaceId: "Seoul Workspace",
  repositoryId: "Portal API",
  agentId: "Codex #1",
};

describe("bankId", () => {
  it("isolates private banks and shares project banks", () => {
    const shared = bankId(identity, "project-shared");
    expect(bankId(identity, "agent-private")).toBe(
      shared.replace(/shared$/, "codex-1-private"),
    );
    expect(shared).toMatch(/^intentir-acme-inc-portal-portal-api-[a-f0-9]{12}-shared$/);
  });

  it("isolates workspaces and repositories", () => {
    expect(bankId(identity, "project-shared")).not.toBe(
      bankId({ ...identity, workspaceId: "another-workspace" }, "project-shared"),
    );
    expect(bankId(identity, "project-shared")).not.toBe(
      bankId({ ...identity, repositoryId: "another-repository" }, "project-shared"),
    );
  });
});
