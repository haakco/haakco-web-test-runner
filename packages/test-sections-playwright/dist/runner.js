import path from 'node:path';
export const DEFAULT_CONFIG_FILE = 'e2e-sections.config.ts';
export function parseArgs(rawArgv) {
    const options = {
        list: false,
        validate: false,
        sectionIds: [],
        help: false,
    };
    const argv = rawArgv.filter((arg) => arg !== '--');
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === 'run') {
            continue;
        }
        if (arg === '--list') {
            options.list = true;
            continue;
        }
        if (arg === '--validate') {
            options.validate = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }
        if (arg === '--section') {
            const value = argv[i + 1];
            if (!value) {
                throw new Error('Missing value for --section');
            }
            options.sectionIds.push(...value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean));
            i += 1;
            continue;
        }
        if (arg.startsWith('--section=')) {
            const value = arg.split('=')[1] ?? '';
            options.sectionIds.push(...value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean));
            continue;
        }
        if (arg === '--parallel') {
            const value = argv[i + 1];
            if (!value) {
                throw new Error('Missing value for --parallel');
            }
            options.parallel = parsePositiveInteger(value, '--parallel');
            i += 1;
            continue;
        }
        if (arg.startsWith('--parallel=')) {
            options.parallel = parsePositiveInteger(arg.split('=')[1] ?? '', '--parallel');
            continue;
        }
        if (arg === '--shard') {
            const value = argv[i + 1];
            if (!value) {
                throw new Error('Missing value for --shard');
            }
            options.shard = validateShard(value);
            i += 1;
            continue;
        }
        if (arg.startsWith('--shard=')) {
            options.shard = validateShard(arg.split('=')[1] ?? '');
            continue;
        }
        if (arg === '--config' || arg === '-c') {
            const value = argv[i + 1];
            if (!value) {
                throw new Error('Missing value for --config');
            }
            options.configPath = value;
            i += 1;
            continue;
        }
        if (arg.startsWith('--config=')) {
            options.configPath = arg.split('=')[1] ?? '';
            continue;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }
    return options;
}
export function parsePositiveInteger(value, flagName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${flagName} must be a positive integer`);
    }
    return parsed;
}
export function validateShard(value) {
    if (!/^\d+\/\d+$/.test(value)) {
        throw new Error(`--shard must match x/y where x and y are positive integers (got: ${value})`);
    }
    const [current, total] = value.split('/').map((n) => Number.parseInt(n, 10));
    if (current <= 0 || total <= 0) {
        throw new Error(`--shard values must be positive integers (got: ${value})`);
    }
    if (current > total) {
        throw new Error(`--shard current (${current}) must be <= total (${total})`);
    }
    return value;
}
export function normalizePath(value) {
    return value.split(path.sep).join('/');
}
export function globToRegExp(glob) {
    const preprocessed = glob.replace(/\*\*\//g, '::DSD::');
    const escaped = preprocessed
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '::DS::')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/::DSD::/g, '(?:.*/)?')
        .replace(/::DS::/g, '.*');
    return new RegExp(`^${escaped}$`);
}
export function resolveSectionFiles(section, discoveredFiles, testDirAbsolute, projectRoot) {
    const matched = new Set();
    for (const file of section.testFiles ?? []) {
        const absolute = path.resolve(projectRoot, file);
        if (discoveredFiles.includes(absolute)) {
            matched.add(absolute);
        }
    }
    const matches = section.testMatch
        ? Array.isArray(section.testMatch)
            ? section.testMatch
            : [section.testMatch]
        : [];
    for (const pattern of matches) {
        const regex = globToRegExp(normalizePath(pattern));
        for (const file of discoveredFiles) {
            const relativeToTestDir = normalizePath(path.relative(testDirAbsolute, file));
            const relativeToProjectRoot = normalizePath(path.relative(projectRoot, file));
            if (regex.test(relativeToTestDir) || regex.test(relativeToProjectRoot)) {
                matched.add(file);
            }
        }
    }
    return matched;
}
export function validateCoverage(sections, discoveredFiles, testDirAbsolute, projectRoot) {
    const errors = [];
    const fileToSections = new Map();
    for (const file of discoveredFiles) {
        fileToSections.set(file, []);
    }
    for (const section of sections) {
        const matched = resolveSectionFiles(section, discoveredFiles, testDirAbsolute, projectRoot);
        if (matched.size === 0) {
            errors.push(`Section "${section.id}" does not match any discovered spec file`);
        }
        for (const file of matched) {
            const owners = fileToSections.get(file);
            if (!owners) {
                continue;
            }
            owners.push(section.id);
        }
    }
    for (const [file, owners] of fileToSections.entries()) {
        const label = normalizePath(path.relative(projectRoot, file));
        if (owners.length === 0) {
            errors.push(`Unassigned spec file: ${label}`);
            continue;
        }
        if (owners.length > 1) {
            errors.push(`Spec file assigned to multiple sections: ${label} -> ${owners.join(', ')}`);
        }
    }
    return {
        errors,
        discoveredFiles,
    };
}
export function sectionArgs(section) {
    const args = [];
    for (const file of section.testFiles ?? []) {
        args.push(file);
    }
    const matches = section.testMatch
        ? Array.isArray(section.testMatch)
            ? section.testMatch
            : [section.testMatch]
        : [];
    for (const match of matches) {
        args.push(match);
    }
    return args;
}
export function buildSectionCommand(section, _projectRoot, playwrightConfigPath, shard) {
    const args = ['exec', 'playwright', 'test', '-c', playwrightConfigPath];
    args.push(...sectionArgs(section));
    if (section.grep !== undefined) {
        if (section.grep.length === 0 || section.grep.startsWith('-')) {
            throw new Error(`Section "${section.id}" has invalid --grep value: must be non-empty and not start with '-'`);
        }
        args.push('--grep', section.grep);
    }
    for (const project of section.projects ?? []) {
        args.push('--project', project);
    }
    if (shard) {
        args.push('--shard', shard);
    }
    return args;
}
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}
export function selectSections(allSections, sectionIds) {
    if (sectionIds.length === 0) {
        return allSections;
    }
    const wanted = new Set(sectionIds);
    const selected = allSections.filter((section) => wanted.has(section.id));
    const missing = sectionIds.filter((sectionId) => !selected.some((section) => section.id === sectionId));
    if (missing.length > 0) {
        throw new Error(`Unknown section id(s): ${missing.join(', ')}`);
    }
    return selected;
}
export async function runConcurrentSections(sections, concurrency, runner) {
    if (sections.length === 0) {
        return [];
    }
    const results = [];
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < sections.length) {
            const current = nextIndex;
            nextIndex += 1;
            try {
                const result = await runner(sections[current]);
                results.push(result);
            }
            catch (_error) {
                results.push({
                    sectionId: sections[current].id,
                    status: 'failed',
                    durationMs: 0,
                    exitCode: null,
                });
            }
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, sections.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=runner.js.map