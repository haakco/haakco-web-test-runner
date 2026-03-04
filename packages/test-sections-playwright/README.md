# @haakco/test-sections-playwright

Config-driven Playwright section runner with coverage validation and parallel execution.

## Install

```bash
npm install @haakco/test-sections-playwright
```

## API

```ts
import { defineConfig } from '@haakco/test-sections-playwright';

export default defineConfig({
  defaults: {
    configPath: './playwright.config.ts',
    parallel: 4,
  },
  sections: [
    {
      id: 'smoke',
      testMatch: 'smoke.spec.ts',
    },
    {
      id: 'checkout',
      testFiles: ['tests/e2e/checkout.spec.ts'],
      serial: true,
      projects: ['chromium'],
    },
  ],
});
```

## CLI

```bash
haakco-test-sections --help
haakco-test-sections --list
haakco-test-sections --validate -c ./e2e-sections.config.ts
haakco-test-sections --section smoke --parallel 3 --shard 1/2
```

### Flags

- `--config`, `-c`: section config path (default `./e2e-sections.config.ts`)
- `--list`: print configured section ids
- `--validate`: discover `*.spec.ts` in Playwright `testDir` and enforce exactly one section assignment per file
- `--section <id>`: run only specific section ids (repeatable and comma-separated)
- `--parallel <n>`: max concurrent non-serial sections
- `--shard <x/y>`: forward shard value to Playwright
- `--help`, `-h`: show usage

### Execution model

- Config is loaded via dynamic import from `--config` (or default in current working directory).
- Playwright config is resolved from `defaults.configPath` (or `./playwright.config.ts`).
- Non-serial sections run concurrently up to `--parallel`/`defaults.parallel`.
- Serial sections run one-by-one.
- Any validation or section failure exits non-zero with a clear error message.
