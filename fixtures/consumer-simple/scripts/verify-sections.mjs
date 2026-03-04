import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'pnpm',
  ['exec', 'haakco-test-sections', '--validate', '--config', './e2e-sections.config.ts'],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
