import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Account Manager', exact: true }).click();
});

test('CSV, Excel and JSON reports download real content', async ({ page }) => {
  await page.goto('/app/reports/p-vodafone/V04');
  for (const [label, extension] of [['CSV', '.csv'], ['Excel', '.xlsx'], ['JSON', '.json']]) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(label) }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain(extension);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const content = Buffer.concat(chunks);
    expect(content.length).toBeGreaterThan(100);
    if (extension === '.xlsx') expect(content.subarray(0, 2).toString()).toBe('PK');
    if (extension === '.json') expect(JSON.parse(content.toString()).version).toBe('V04');
    if (extension === '.csv') expect(content.toString()).toContain('Timecode IN');
  }
});

test('editor volume and playback speed preserve the current playhead', async ({ page }) => {
  await page.goto('/studio/editor/p-vodafone/V04');
  const video = page.locator('main video');
  await expect.poll(() => video.evaluate((media: HTMLVideoElement) => media.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate((media: HTMLVideoElement) => { media.currentTime = 10; });
  await expect.poll(() => video.evaluate((media: HTMLVideoElement) => media.currentTime)).toBeGreaterThan(9.9);
  await page.getByLabel('Mute clip').check();
  await expect.poll(() => video.evaluate((media: HTMLVideoElement) => media.currentTime)).toBeGreaterThan(9.9);
  await page.getByLabel('Speed', { exact: true }).selectOption('1.5');
  await expect.poll(() => video.evaluate((media: HTMLVideoElement) => media.currentTime)).toBeGreaterThan(9.9);
  await page.getByRole('button', { name: /Split at playhead/ }).click();
  await expect(page.getByRole('heading', { name: /Timeline · 2 clips/ })).toBeVisible();
});
