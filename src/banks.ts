import { createHash } from "node:crypto";
import type { AgentIdentity, MemoryScope } from "./types.js";

function slug(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
  return normalized.slice(0, 48) || createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function bankId(identity: AgentIdentity, scope: MemoryScope): string {
  const locationHash = createHash("sha256")
    .update([identity.workspaceId, identity.repositoryId].join("\0"))
    .digest("hex")
    .slice(0, 12);
  const repository = [
    slug(identity.orgId),
    slug(identity.projectId),
    slug(identity.repositoryId).slice(0, 24),
    locationHash,
  ].join("-");
  return scope === "project-shared"
    ? `intentir-${repository}-shared`
    : `intentir-${repository}-${slug(identity.agentId).slice(0, 24)}-private`;
}
