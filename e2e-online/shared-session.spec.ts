import { expect, test } from '@playwright/test';

test('a code-gated guest joins from a separate browser, syncs feedback and transfers control', async ({ page, browser, context, baseURL }) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Account Manager', exact: true }).click();
  await page.goto('/studio/review/p-vodafone/V04');
  await page.getByRole('button', { name: /Share link/ }).click();
  const shareDialog = page.getByRole('dialog');
  await shareDialog.getByRole('button', { name: 'Create link and code' }).click();
  await expect(shareDialog.getByLabel('Review link')).toBeVisible();
  const link = await shareDialog.getByLabel('Review link').inputValue();
  const code = await shareDialog.getByText(/^\d{6}$/).textContent();
  if (!code) throw new Error('Share dialog did not display a six-digit code');
  // Transport access is test infrastructure only. Do not carry application
  // identity, localStorage or IndexedDB into this independent guest browser.
  const guestContext = await browser.newContext({
    baseURL,
    storageState: { cookies: await context.cookies(), origins: [] },
  });
  const guest = await guestContext.newPage();
  try {
    await shareDialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /Start Live/ }).click();
    await page.getByRole('button', { name: /Go live now/ }).click();
    await expect(page.getByRole('button', { name: /End session/ })).toBeVisible();

    await guest.goto(link);
    await guest.getByLabel('Access code').fill(code);
    await guest.getByRole('button', { name: 'Open review', exact: true }).click();
    await expect(guest.locator('video')).toBeVisible();
    await expect(guest.getByRole('button', { name: /Request control/ })).toBeVisible({ timeout: 15_000 });
    await guest.getByRole('button', { name: /Request control/ }).click();
    await page.getByRole('button', { name: /Accept .*control request/ }).click();
    await expect(guest.getByText(/You have control/)).toBeVisible();

    const guestVideo = guest.locator('video');
    await expect.poll(() => guestVideo.evaluate((media: HTMLVideoElement) => media.readyState)).toBeGreaterThanOrEqual(2);
    await guestVideo.evaluate((media: HTMLVideoElement) => { media.currentTime = 5; });
    await expect.poll(() => page.locator('video').evaluate((media: HTMLVideoElement) => media.currentTime), { timeout: 10_000 }).toBeGreaterThan(4.8);

    const note = `Online QA guest note ${Date.now()}`;
    await guest.locator('#rv-composer-text').fill(note);
    await guest.getByRole('button', { name: /Post ↑/ }).click();
    await expect(page.getByText(note, { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Take control/ }).click();
    await page.getByRole('button', { name: /End session/ }).click();
    await expect(guest.getByRole('button', { name: /Request control/ })).toHaveCount(0);
  } finally {
    await guestContext.close();
  }
});
