import { expect, test } from '@playwright/test';

test('dashboard New Project action opens the real modal', async ({ page }) => {
  await page.goto('/app');

  await page.getByRole('button', { name: /New Project|مشروع جديد/i }).click();

  await expect(page.getByRole('heading', { name: /New Project|مشروع جديد/i })).toBeVisible();
  await expect(page.locator('form input').first()).toBeFocused();
});

test('project Upload Version action opens the upload modal', async ({ page }) => {
  await page.goto('/app/projects/p-vodafone');

  await page.getByRole('button', { name: /Upload Version|رفع نسخة/i }).click();

  await expect(page.getByRole('heading', { name: /Upload Version|رفع نسخة/i })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', 'video/*');
});

test('unknown app and public review routes show 404 instead of another project', async ({ page }) => {
  await page.goto('/app/does-not-exist');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();

  await page.goto('/review/does-not-exist/V04');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
  await expect(page.getByText('Vodafone — Ramadan TVC')).toHaveCount(0);

  await page.goto('/review/p-vodafone/V99');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
});

test.fixme('mobile review keeps the video visible above a collapsible comments drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/review/p-vodafone/V04');

  const video = page.locator('video');
  await expect(video).toBeVisible();
  expect((await video.boundingBox())?.height ?? 0).toBeGreaterThan(180);
});

test.fixme('anonymous users are redirected away from the internal app', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
});
