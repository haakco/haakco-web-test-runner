import type { FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig): Promise<void> {
  // Intentionally empty: fixture keeps setup overhead near zero.
}

export default globalSetup;
