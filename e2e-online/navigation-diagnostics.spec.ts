import { expect, test } from '@playwright/test';

test('review returns from comparison without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Account Manager', exact: true }).click();
  await page.goto('/studio/review/p-vodafone/V04');
  await page.getByRole('button', { name: /Start Live/ }).click();
  await page.getByRole('button', { name: /Go live now/ }).click();
  await expect(page.getByRole('button', { name: /End session/ })).toBeVisible();
  await page.goto('/studio/compare/p-vodafone/V03/V04');
  await page.getByRole('button', { name: /Back to session/ }).click();
  await expect(page.getByRole('button', { name: /End session/ }), JSON.stringify(errors)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: /End session/ }).click();
});
