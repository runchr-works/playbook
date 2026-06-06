export const PROMOTION_POLICY_VERSION = "2026-06-07.v1";
const SECRET_PATTERNS = [
    /\b(?:api[_-]?key|secret|password|passwd|private[_-]?key)\s*[:=]\s*\S+/i,
    /\b(?:sk|ghp|github_pat|xox[baprs])[-_][a-z0-9_-]{12,}\b/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b[A-Za-z0-9+/]{40,}={0,2}\b/,
];
const PRIVATE_DATA_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b(?:\d[ -]*?){13,19}\b/,
];
const TRANSIENT_PATTERNS = [
    /\b(?:maybe|probably|guess|might be|not sure|unconfirmed)\b/i,
    /\b(?:temporary|for now|work in progress|wip)\b/i,
];
export function preflightPromotion(input) {
    if (input.metadata && (!Number.isFinite(input.metadata.confidence) ||
        input.metadata.confidence < 0 ||
        input.metadata.confidence > 1)) {
        return { allowed: false, reason: "Memory confidence must be between 0 and 1" };
    }
    if (input.metadata && Number.isNaN(Date.parse(input.metadata.freshness))) {
        return { allowed: false, reason: "Memory freshness must be an ISO-8601 timestamp" };
    }
    if (input.content.trim().length < 20)
        return { allowed: false, reason: "Memory is too short" };
    if (SECRET_PATTERNS.some((pattern) => pattern.test(input.content))) {
        return { allowed: false, reason: "Potential secret detected" };
    }
    if (PRIVATE_DATA_PATTERNS.some((pattern) => pattern.test(input.content))) {
        return { allowed: false, reason: "Potential personal data detected" };
    }
    if (TRANSIENT_PATTERNS.some((pattern) => pattern.test(input.content))) {
        return { allowed: false, reason: "Memory appears speculative or transient" };
    }
    return { allowed: true };
}
//# sourceMappingURL=policy.js.map