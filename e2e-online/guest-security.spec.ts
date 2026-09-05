import { expect, test } from '@playwright/test';

test('guest code gate cannot be bypassed by a cached browser flag', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('augmentoria-review-grant:p-vodafone:V04:qa-invalid-token', '1');
  });
  await page.goto('/review/p-vodafone/V04?share=qa-invalid-token');
  await expect(page.getByRole('heading', { name: /Enter the invitation code|أدخل كود الدعوة/ })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('guest without a share token is told to request a new link', async ({ page }) => {
  await page.goto('/review/p-vodafone/V04');
  await expect(page.getByText(/incomplete or outdated|غير مكتمل أو قديم/)).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('a wrong share code cannot open review', async ({ page }) => {
  await page.goto('/review/p-vodafone/V04?share=qa-invalid-token');
  await page.getByLabel(/Access code|كود الدخول/).fill('123456');
  await page.getByRole('button', { name: /Open review|فتح المراجعة/ }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect|غير صحيح/);
  await expect(page.locator('video')).toHaveCount(0);
});
