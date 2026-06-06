import { describe, expect, it } from "vitest";
import { preflightPromotion } from "./policy.js";

const identity = {
  orgId: "org",
  projectId: "project",
  workspaceId: "workspace",
  repositoryId: "repository",
  agentId: "agent",
};

describe("preflightPromotion", () => {
  it("allows durable project facts", () => {
    expect(preflightPromotion({
      identity,
      content: "The API service uses PostgreSQL and migrations live in packages/database.",
    }).allowed).toBe(true);
  });

  it.each([
    "api_key=sk-example-secret-value-123456",
    "Maybe the timeout probably comes from the proxy configuration.",
    "Customer SSN is 123-45-6789 and should be used for verification.",
  ])("blocks unsafe memory: %s", (content) => {
    expect(preflightPromotion({ identity, content }).allowed).toBe(false);
  });
});
