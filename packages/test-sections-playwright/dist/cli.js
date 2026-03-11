#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const DEFAULT_CONFIG_FILE = 'e2e-sections.config.ts';
function parseArgs(rawArgv) {
    const options = {
        list: false,
        validate: false,
        sectionIds: [],
        help: false,
    };
    // Strip bare '--' tokens so pnpm passthrough separators don't interfere
    // with flag-value parsing (e.g. --section -- value)
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
            options.sectionIds.push(...value.split(',').map((entry) => entry.trim()).filter(Boolean));
            i += 1;
            continue;
        }
        if (arg.startsWith('--section=')) {
            const value = arg.split('=')[1] ?? '';
            options.sectionIds.push(...value.split(',').map((entry) => entry.trim()).filter(Boolean));
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
            options.shard = value;
            i += 1;
            continue;
        }
        if (arg.startsWith('--shard=')) {
            options.shard = arg.split('=')[1] ?? '';
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
function parsePositiveInteger(value, flagName) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${flagName} must be a positive integer`);
    }
    return parsed;
}
function printHelp() {
    process.stdout.write(`@haakco/test-sections-playwright\n\n`);
    process.stdout.write(`Usage: haakco-test-sections [options]\n\n`);
    process.stdout.write(`Options:\n`);
    process.stdout.write(`  --list               List configured test sections\n`);
    process.stdout.write(`  --validate           Validate section coverage by files\n`);
    process.stdout.write(`  --section <name>     Run only one or more section ids (repeat or comma-separated)\n`);
    process.stdout.write(`  --parallel <n>       Max concurrent non-serial sections\n`);
    process.stdout.write(`  --shard <x/y>        Forward shard to Playwright\n`);
    process.stdout.write(`  -c, --config <path>  Section config path (default: ./e2e-sections.config.ts)\n`);
    process.stdout.write(`  -h, --help           Show help\n`);
}
async function loadSectionsConfig(configPathArg) {
    const sectionsConfigPath = path.resolve(process.cwd(), configPathArg ?? DEFAULT_CONFIG_FILE);
    const projectRoot = path.dirname(sectionsConfigPath);
    const imported = await import(pathToFileURL(sectionsConfigPath).href);
    const sectionsConfig = imported.default;
    if (!sectionsConfig || !Array.isArray(sectionsConfig.sections)) {
        throw new Error(`Invalid sections config at ${sectionsConfigPath}: default export with sections[] is required`);
    }
    const playwrightConfigRaw = sectionsConfig.defaults?.configPath ?? './playwright.config.ts';
    const playwrightConfigPath = path.resolve(projectRoot, playwrightConfigRaw);
    const playwrightImported = await import(pathToFileURL(playwrightConfigPath).href);
    const playwrightConfig = playwrightImported.default;
    if (!playwrightConfig || typeof playwrightConfig !== 'object') {
        throw new Error(`Invalid Playwright config at ${playwrightConfigPath}: default export is required`);
    }
    const testDirRaw = playwrightConfig.testDir ?? './tests';
    const testDirAbsolute = path.resolve(path.dirname(playwrightConfigPath), testDirRaw);
    return {
        sectionsConfig,
        sectionsConfigPath,
        projectRoot,
        playwrightConfigPath,
        testDirAbsolute,
    };
}
async function discoverSpecFiles(testDirAbsolute) {
    const discovered = [];
    async function walk(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
                discovered.push(path.resolve(fullPath));
            }
        }
    }
    await walk(testDirAbsolute);
    discovered.sort();
    return discovered;
}
function normalizePath(value) {
    return value.split(path.sep).join('/');
}
function globToRegExp(glob) {
    const escaped = glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '::DOUBLE_STAR::')
        .replace(/\*/g, '[^/]*')
        .replace(/::DOUBLE_STAR::/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
}
function resolveSectionFiles(section, discoveredFiles, testDirAbsolute, projectRoot) {
    const matched = new Set();
    for (const file of section.testFiles ?? []) {
        const absolute = path.resolve(projectRoot, file);
        if (discoveredFiles.includes(absolute)) {
            matched.add(absolute);
        }
    }
    const matches = section.testMatch ? (Array.isArray(section.testMatch) ? section.testMatch : [section.testMatch]) : [];
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
function validateCoverage(sections, discoveredFiles, testDirAbsolute, projectRoot) {
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
function sectionArgs(section) {
    const args = [];
    for (const file of section.testFiles ?? []) {
        args.push(file);
    }
    const matches = section.testMatch ? (Array.isArray(section.testMatch) ? section.testMatch : [section.testMatch]) : [];
    for (const match of matches) {
        args.push(match);
    }
    return args;
}
async function runPlaywrightSection(section, projectRoot, playwrightConfigPath, shard) {
    const args = ['exec', 'playwright', 'test', '-c', playwrightConfigPath];
    const selectors = sectionArgs(section);
    args.push(...selectors);
    if (section.grep) {
        args.push('--grep', section.grep);
    }
    for (const project of section.projects ?? []) {
        args.push('--project', project);
    }
    if (shard) {
        args.push('--shard', shard);
    }
    process.stdout.write(`\n==> Running section "${section.id}"${section.serial ? ' (serial)' : ''}\n`);
    const startTime = Date.now();
    const exitCode = await new Promise((resolve, reject) => {
        const child = spawn('pnpm', args, {
            stdio: 'inherit',
            cwd: projectRoot,
            env: process.env,
        });
        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error(`"pnpm" not found. The CLI requires pnpm to be installed and in PATH.`));
                return;
            }
            reject(new Error(`Failed to start Playwright for section "${section.id}": ${error.message}`));
        });
        child.on('close', (code) => {
            resolve(code);
        });
    });
    const durationMs = Date.now() - startTime;
    const status = exitCode === 0 ? 'passed' : 'failed';
    const durationLabel = formatDuration(durationMs);
    const statusLabel = status === 'passed' ? '✓ PASSED' : '✗ FAILED';
    process.stdout.write(`<== Section "${section.id}" ${statusLabel} (${durationLabel})\n`);
    return { sectionId: section.id, status, durationMs, exitCode };
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}
async function runConcurrentSections(sections, concurrency, runner) {
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
            catch (error) {
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
function selectSections(allSections, sectionIds) {
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
async function run() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    const loaded = await loadSectionsConfig(options.configPath);
    const allSections = loaded.sectionsConfig.sections;
    if (allSections.length === 0) {
        throw new Error(`No sections configured in ${loaded.sectionsConfigPath}`);
    }
    if (options.list) {
        for (const section of allSections) {
            const suffix = section.serial ? ' (serial)' : '';
            process.stdout.write(`${section.id}${suffix}\n`);
        }
        return;
    }
    const discoveredFiles = await discoverSpecFiles(loaded.testDirAbsolute);
    if (options.validate) {
        const result = validateCoverage(allSections, discoveredFiles, loaded.testDirAbsolute, loaded.projectRoot);
        if (result.errors.length > 0) {
            for (const error of result.errors) {
                process.stderr.write(`${error}\n`);
            }
            throw new Error(`Coverage validation failed with ${result.errors.length} error(s)`);
        }
        process.stdout.write(`Coverage validation passed (${result.discoveredFiles.length} spec files).\n`);
        return;
    }
    const selectedSections = selectSections(allSections, options.sectionIds);
    const shard = options.shard ?? loaded.sectionsConfig.defaults?.shard;
    const maxParallel = options.parallel ?? loaded.sectionsConfig.defaults?.parallel ?? 1;
    const nonSerialSections = selectedSections.filter((section) => !section.serial);
    const serialSections = selectedSections.filter((section) => section.serial);
    const runStartTime = Date.now();
    const allResults = [];
    process.stdout.write(`\n━━━ Running ${selectedSections.length} section(s) (parallel=${maxParallel}) ━━━\n`);
    const concurrentResults = await runConcurrentSections(nonSerialSections, maxParallel, async (section) => {
        return runPlaywrightSection(section, loaded.projectRoot, loaded.playwrightConfigPath, shard);
    });
    allResults.push(...concurrentResults);
    for (const section of serialSections) {
        const result = await runPlaywrightSection(section, loaded.projectRoot, loaded.playwrightConfigPath, shard);
        allResults.push(result);
    }
    printSummary(allResults, Date.now() - runStartTime);
    const hasFailures = allResults.some((result) => result.status === 'failed');
    if (hasFailures) {
        throw new Error('One or more sections failed');
    }
}
function printSummary(results, totalMs) {
    const passed = results.filter((r) => r.status === 'passed');
    const failed = results.filter((r) => r.status === 'failed');
    process.stdout.write(`\n━━━ Section Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    for (const result of results) {
        const icon = result.status === 'passed' ? '✓' : '✗';
        const duration = formatDuration(result.durationMs);
        process.stdout.write(`  ${icon} ${result.sectionId} (${duration})\n`);
    }
    process.stdout.write(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    process.stdout.write(`  ${passed.length} passed, ${failed.length} failed | Total: ${formatDuration(totalMs)}\n`);
    if (failed.length > 0) {
        process.stdout.write(`\n  Failed sections:\n`);
        for (const f of failed) {
            process.stdout.write(`    ✗ ${f.sectionId} (exit code ${f.exitCode ?? 'unknown'})\n`);
        }
    }
    process.stdout.write(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);
}
async function main() {
    try {
        await run();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    }
}
await main();
//# sourceMappingURL=cli.js.map