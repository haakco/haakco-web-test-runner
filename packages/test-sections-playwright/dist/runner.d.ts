import type { CliOptions, PlaywrightTestSection } from './types.js';
export interface SectionResult {
    sectionId: string;
    status: 'passed' | 'failed';
    durationMs: number;
    exitCode: number | null;
}
export interface CoverageResult {
    errors: string[];
    discoveredFiles: string[];
}
export declare const DEFAULT_CONFIG_FILE = "e2e-sections.config.ts";
export declare function parseArgs(rawArgv: string[]): CliOptions;
export declare function parsePositiveInteger(value: string, flagName: string): number;
export declare function validateShard(value: string): string;
export declare function normalizePath(value: string): string;
export declare function globToRegExp(glob: string): RegExp;
export declare function resolveSectionFiles(section: PlaywrightTestSection, discoveredFiles: string[], testDirAbsolute: string, projectRoot: string): Set<string>;
export declare function validateCoverage(sections: PlaywrightTestSection[], discoveredFiles: string[], testDirAbsolute: string, projectRoot: string): CoverageResult;
export declare function sectionArgs(section: PlaywrightTestSection): string[];
export declare function buildSectionCommand(section: PlaywrightTestSection, _projectRoot: string, playwrightConfigPath: string, shard?: string): string[];
export declare function formatDuration(ms: number): string;
export declare function selectSections(allSections: PlaywrightTestSection[], sectionIds: string[]): PlaywrightTestSection[];
export declare function runConcurrentSections(sections: PlaywrightTestSection[], concurrency: number, runner: (section: PlaywrightTestSection) => Promise<SectionResult>): Promise<SectionResult[]>;
//# sourceMappingURL=runner.d.ts.map