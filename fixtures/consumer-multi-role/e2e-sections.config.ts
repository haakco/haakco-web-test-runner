import { defineConfig } from '@haakco/test-sections-playwright';

export default defineConfig({
  defaults: {
    configPath: './playwright.config.ts',
    parallel: 2,
  },
  roles: {
    admin: {
      storageState: 'tests/e2e/.auth/admin.json',
    },
    sa: {
      storageState: 'tests/e2e/.auth/sa.json',
    },
  },
  sharding: {
    moduloShardStrategy: true,
  },
  durationValidation: {
    enabled: true,
    baselineFile: './section-durations/core/section-duration.txt',
    maxAllowedDeltaMs: 30000,
  },
  reporters: {
    local: ['list', 'html'],
    ci: ['github', 'junit', 'json'],
  },
  sections: [
    {
      id: 'admin-feature',
      description: 'Admin-only feature checks',
      testFiles: ['tests/e2e/admin-feature.spec.ts'],
      metadata: {
        role: 'admin',
      },
    },
    {
      id: 'sa-feature',
      description: 'Super-admin feature checks',
      testFiles: ['tests/e2e/sa-feature.spec.ts'],
      metadata: {
        role: 'sa',
      },
    },
    {
      id: 'complex-scenario',
      description: 'Mixed-role complex scenario coverage',
      testFiles: ['tests/e2e/scenarios/complex.spec.ts'],
      metadata: {
        role: 'admin,sa',
      },
    },
  ],
});
