import { type WorkspaceState } from "./workspace.js";
export interface IntentirConfig {
    identity: {
        bankId: string;
    };
    repositoryRoot: string;
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
}
export declare function loadConfig(env?: NodeJS.ProcessEnv): IntentirConfig;
