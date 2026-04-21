import { expect, test } from '../../../fixtures/test';

test('web theme toggle defaults to light and persists dark mode across reload and navigation', async ({
  appUrls,
  page,
}) => {
  await page.goto(appUrls.webBaseUrl);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Dark' }).first().click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.goto(`${appUrls.webBaseUrl}/app`);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Dark' }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
