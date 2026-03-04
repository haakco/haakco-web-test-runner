import { expect, test } from '@playwright/test';

test('renders feature B marker @feature-b', async ({ page }) => {
  await page.goto('data:text/html,<title>Feature B</title><main id="b">B</main>');
  await expect(page).toHaveTitle('Feature B');
  await expect(page.locator('#b')).toHaveText('B');
});
