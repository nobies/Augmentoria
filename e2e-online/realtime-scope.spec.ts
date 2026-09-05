import { expect, test } from '@playwright/test';

test('review broadcasts do not disclose another company or unrelated projects', async ({ page }) => {
  const frames: string[] = [];
  page.on('websocket', (socket) => {
    socket.on('framesent', ({ payload }) => {
      const text = String(payload);
      if (text.includes('"type":"state"')) frames.push(text);
    });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Account Manager', exact: true }).click();
  await page.goto('/studio/review/p-vodafone/V04');
  await expect.poll(() => frames.length, { timeout: 15_000 }).toBeGreaterThan(0);
  // Assert a boolean so failure output cannot print the captured payload.
  expect(frames.some((frame) => frame.includes('c-socializr') || frame.includes('p-instamart'))).toBe(false);
});
