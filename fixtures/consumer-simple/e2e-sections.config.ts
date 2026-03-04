import { defineConfig } from '@haakco/test-sections-playwright';

export default defineConfig({
  defaults: {
    configPath: './playwright.config.ts',
    parallel: 2
  },
  sections: [
    {
      id: 'smoke',
      testFiles: ['./tests/e2e/smoke.spec.ts'],
      grep: '@smoke',
      description: 'Fast smoke checks'
    },
    {
      id: 'feature-a',
      testFiles: ['./tests/e2e/feature-a.spec.ts'],
      grep: '@feature-a',
      description: 'Feature A checks'
    },
    {
      id: 'feature-b',
      testFiles: ['./tests/e2e/feature-b.spec.ts'],
      grep: '@feature-b',
      description: 'Feature B checks'
    }
  ]
});
