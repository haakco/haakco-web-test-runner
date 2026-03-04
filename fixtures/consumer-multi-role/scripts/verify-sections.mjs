import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const fixtureRoot = process.cwd();
const sectionsConfig = path.join(fixtureRoot, 'e2e-sections.config.ts');
const durationValidationBlockPattern = /durationValidation\s*:\s*\{([\s\S]*?)\n\s*\},/m;
const baselineFilePattern = /baselineFile\s*:\s*['"]([^'"]+)['"]/;
const maxAllowedDeltaPattern = /maxAllowedDeltaMs\s*:\s*(\d+)/;

function runSharedCliValidate() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'haakco-test-sections',
      ['--validate', '--config', './e2e-sections.config.ts'],
      {
        cwd: fixtureRoot,
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`haakco-test-sections validate failed with exit code ${String(code)}`));
    });
  });
}

function extractDurationValidationConfig(configText) {
  const durationValidationBlock = configText.match(durationValidationBlockPattern)?.[1];
  if (!durationValidationBlock) {
    throw new Error('Missing durationValidation block in e2e-sections.config.ts.');
  }

  const baselineFile = durationValidationBlock.match(baselineFilePattern)?.[1];
  if (!baselineFile) {
    throw new Error('Missing durationValidation.baselineFile in e2e-sections.config.ts.');
  }

  const maxAllowedDeltaMsText = durationValidationBlock.match(maxAllowedDeltaPattern)?.[1];
  const maxAllowedDeltaMs = Number.parseInt(maxAllowedDeltaMsText ?? '', 10);
  if (!Number.isFinite(maxAllowedDeltaMs) || maxAllowedDeltaMs <= 0) {
    throw new Error('durationValidation.maxAllowedDeltaMs must be a positive integer.');
  }

  return {
    baselineFile,
    maxAllowedDeltaMs,
  };
}

async function validateDurations() {
  const configText = await readFile(sectionsConfig, 'utf8');
  const { baselineFile, maxAllowedDeltaMs } = extractDurationValidationConfig(configText);

  const durationFile = path.resolve(path.dirname(sectionsConfig), baselineFile);
  const durationText = (await readFile(durationFile, 'utf8')).trim();
  const durationMs = Number.parseInt(durationText, 10);

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('section-duration.txt must contain a positive integer duration in milliseconds.');
  }

  if (durationMs < maxAllowedDeltaMs) {
    throw new Error(
      `Baseline duration ${durationMs}ms is lower than maxAllowedDeltaMs ${maxAllowedDeltaMs}ms.`,
    );
  }

  process.stdout.write('consumer-multi-role duration validation passed\n');
  process.stdout.write(`baseline file: ${baselineFile}\n`);
  process.stdout.write(`baseline duration: ${durationMs}ms\n`);
  process.stdout.write(`max allowed delta: ${maxAllowedDeltaMs}ms\n`);
}

async function main() {
  const shouldValidateDurations = process.argv.includes('--durations');
  if (shouldValidateDurations) {
    await validateDurations();
    return;
  }

  await runSharedCliValidate();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
