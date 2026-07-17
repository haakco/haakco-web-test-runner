#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSectionCommand, DEFAULT_CONFIG_FILE, formatDuration, parseArgs, runConcurrentSections, selectSections, validateCoverage, } from './runner.js';
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
async function runPlaywrightSection(section, projectRoot, playwrightConfigPath, shard) {
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath, shard);
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
async function run(options) {
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
        const options = parseArgs(process.argv.slice(2));
        await run(options);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    }
}
async function isInvokedAsEntry() {
    try {
        const argvReal = await realpath(process.argv[1]);
        const moduleReal = await realpath(new URL(import.meta.url));
        return argvReal === moduleReal;
    }
    catch {
        return false;
    }
}
if (await isInvokedAsEntry()) {
    await main();
}
//# sourceMappingURL=cli.js.map