export interface PlaywrightTestSection {
    id: string;
    testMatch?: string | string[];
    testFiles?: string[];
    grep?: string;
    projects?: string[];
    serial?: boolean;
    description?: string;
    metadata?: Record<string, string>;
}
export interface PlaywrightSectionsConfig {
    sections: PlaywrightTestSection[];
    defaults?: {
        configPath?: string;
        parallel?: number;
        shard?: string;
    };
}
export interface CliOptions {
    configPath?: string;
    list: boolean;
    validate: boolean;
    sectionIds: string[];
    parallel?: number;
    shard?: string;
    help: boolean;
}
//# sourceMappingURL=types.d.ts.map