export type HindsightMode = "local" | "supabase" | "existing";
export interface UserConfig {
    version: 1;
    hindsightMode: HindsightMode;
    agents?: string[];
    env: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}
export declare function memkitHome(env?: NodeJS.ProcessEnv): string;
export declare function userConfigPath(env?: NodeJS.ProcessEnv): string;
export declare function loadUserConfig(env?: NodeJS.ProcessEnv): UserConfig | undefined;
export declare function saveUserConfig(config: UserConfig, env?: NodeJS.ProcessEnv): void;
export declare function removeUserConfig(env?: NodeJS.ProcessEnv): void;
