import { mkdir, writeFile } from 'node:fs/promises';

async function globalSetup(): Promise<void> {
  await mkdir('tests/e2e/.auth', { recursive: true });

  const emptyState = JSON.stringify({ cookies: [], origins: [] }, null, 2);
  await writeFile('tests/e2e/.auth/admin.json', emptyState);
  await writeFile('tests/e2e/.auth/sa.json', emptyState);
}

export default globalSetup;
