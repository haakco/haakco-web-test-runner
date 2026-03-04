import type { PlaywrightSectionsConfig } from './types.js';

export function defineConfig<T extends PlaywrightSectionsConfig>(config: T): T {
  return config;
}
