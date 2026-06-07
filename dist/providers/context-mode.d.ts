import type { ContextModeProvider, SessionSummary } from "../types.js";
export declare class ContextModeReader implements ContextModeProvider {
    private readonly env;
    constructor(env?: NodeJS.ProcessEnv);
    detect(): Promise<{
        detected: boolean;
        adapter: string;
        dir: string;
        commandInstalled: boolean;
    }>;
    lastSession(repositoryRoot: string): Promise<SessionSummary | null>;
}
