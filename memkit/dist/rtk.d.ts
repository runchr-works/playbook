export declare const RTK_BLOCK_START = "<!-- rtk-instructions v2 -->";
export declare const RTK_BLOCK_END = "<!-- /rtk-instructions -->";
export declare const RTK_INSTRUCTIONS: string;
export interface RtkAgentResult {
    agentId: string;
    path: string;
    configured: boolean;
    detail: string;
}
/**
 * Get the RTK instruction file path for a given agent.
 * RTK instructions go into CLAUDE.md (the agents.md standard file)
 * which is read by Pi, Claude Code, and other compatible agents.
 * For Pi, we also target ~/.pi/agent/AGENTS.md.
 */
export declare function getRtkInstructionPaths(agentId: string, home?: string): string[];
/**
 * Inject RTK instructions into the appropriate agent instruction files.
 * Uses marker-based block injection — the RTK block is wrapped in
 * <!-- rtk-instructions v2 --> / <!-- /rtk-instructions --> markers
 * so repeated injections are idempotent.
 */
export declare function injectRtkAgentInstructions(agentId: string, home?: string): RtkAgentResult[];
