import { expect, test } from '@playwright/test';

test('renders feature A marker @feature-a', async ({ page }) => {
  await page.goto('data:text/html,<title>Feature A</title><main id="a">A</main>');
  await expect(page).toHaveTitle('Feature A');
  await expect(page.locator('#a')).toHaveText('A');
});
