import { type WorkspaceState } from "./workspace.js";
export interface IntentirConfig {
    identity: {
        orgId: string;
        projectId: string;
        workspaceId: string;
        repositoryId: string;
        agentId: string;
    };
    repositoryRoot: string;
    repositoryRevision?: string;
    workspace: WorkspaceState;
    hindsight: {
        baseUrl: string;
        apiKey?: string;
        tenant: string;
        timeoutMs: number;
    };
    codegraph: {
        command: string;
        args: string[];
        timeoutMs: number;
    };
    promotion: {
        enabled: boolean;
        confidenceThreshold: number;
        databasePath: string;
        pollIntervalMs: number;
        llm?: {
            baseUrl: string;
            apiKey: string;
            model: string;
        };
    };
}
export declare function loadConfig(env?: NodeJS.ProcessEnv): IntentirConfig;
