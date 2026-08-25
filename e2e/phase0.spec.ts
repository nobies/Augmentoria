import { expect, test } from '@playwright/test';

const DEMO_USER = {
  id: 'u-mw',
  name: 'Mohamed Wageeh',
  email: 'm.wageeh@aroma.studio',
  roleId: 'am',
  companyId: 'c-aroma',
  title: 'Account Manager'
};

const CLIENT_USER = {
  id: 'u-client',
  name: 'Client Reviewer',
  email: 'client@example.com',
  roleId: 'client',
  companyId: 'c-aroma',
  title: 'Client'
};

async function authenticate(page: import('@playwright/test').Page, user = DEMO_USER) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('augmentoria-auth-user', JSON.stringify(user));
  }, user);
}

test('dashboard New Project action opens the real modal', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app');

  await page.getByRole('button', { name: /New Project|مشروع جديد/i }).click();

  await expect(page.getByRole('heading', { name: /New Project|مشروع جديد/i })).toBeVisible();
  await expect(page.locator('form input').first()).toBeFocused();
});

test('project Upload Version action opens the upload modal', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app/projects/p-vodafone');

  await page.getByRole('button', { name: /Upload Version|رفع نسخة/i }).click();

  await expect(page.getByRole('heading', { name: /Upload Version|رفع نسخة/i })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', 'video/*');
});

test('unknown app and public review routes show 404 instead of another project', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app/does-not-exist');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();

  await page.goto('/review/does-not-exist/V04');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
  await expect(page.getByText('Vodafone — Ramadan TVC')).toHaveCount(0);

  await page.goto('/review/p-vodafone/V99');
  await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
});

test('mobile review keeps the video visible above a collapsible comments drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/review/p-vodafone/V04');

  const video = page.locator('video');
  await expect(video).toBeVisible();
  expect((await video.boundingBox())?.height ?? 0).toBeGreaterThan(180);

  const commentsButton = page.getByRole('button', { name: /^(💬 )?(Comments|التعليقات)/i });
  await expect(commentsButton).toBeVisible();
  await commentsButton.click();
  await expect(page.locator('#review-comments')).toBeInViewport();

  await page.getByRole('button', { name: /Close comments|إغلاق التعليقات/i }).last().click();
  await expect(commentsButton).toBeVisible();
});

test('anonymous users are redirected away from the internal app and returned after login', async ({ page }) => {
  await page.goto('/app/projects/p-vodafone');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('button', { name: /Account Manager|أكاونت مانجر/i }).click();
  await expect(page).toHaveURL(/\/app\/projects\/p-vodafone$/);
});

test('review player pointer controls remain clickable and text annotations persist', async ({ page }) => {
  await authenticate(page);
  await page.goto('/studio/review/p-vodafone/V04');

  const video = page.locator('video');
  await expect(video).toBeVisible();
  await page.getByRole('button', { name: 'Play/Pause' }).click();
  await expect.poll(() => video.evaluate((element) => !(element as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Play/Pause' }).click();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);

  await page.getByTitle(/Text|نص/i).click();
  const box = await video.boundingBox();
  if (!box) throw new Error('Review video has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const textInput = page.getByPlaceholder('Type…');
  await expect(textInput).toBeFocused();
  await textInput.fill('Text annotation works');
  await textInput.press('Enter');
  await expect(page.locator('svg text').filter({ hasText: 'Text annotation works' })).toBeVisible();
});

test('client reviewers can comment without moderation, sharing, export, or session controls', async ({ page }) => {
  await authenticate(page, CLIENT_USER);
  await page.goto('/studio/review/p-vodafone/V04');

  await expect(page.locator('#rv-composer-text')).toBeVisible();
  await expect(page.getByTitle(/Resolve|Unresolve|حل|إعادة فتح/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Export|تصدير/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Share|مشاركة/i })).toHaveCount(0);
  await expect(page.getByTitle(/End session|إنهاء الجلسة/i)).toHaveCount(0);
});

test('compare uses the independently stored video for each version and exposes Flicker mode', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('augmentoria', 4);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('version-videos')) {
          request.result.createObjectStore('version-videos', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('version-videos', 'readwrite');
    const store = transaction.objectStore('version-videos');
    store.put({ id: 'p-vodafone__V03', name: 'version-a.mp4', blob: new Blob(['version-a'], { type: 'video/mp4' }) });
    store.put({ id: 'p-vodafone__V04', name: 'version-b.mp4', blob: new Blob(['version-b'], { type: 'video/mp4' }) });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });

  await page.goto('/studio/compare/p-vodafone/V03/V04');
  const videos = page.locator('video');
  await expect(videos).toHaveCount(2);
  await expect.poll(async () => videos.nth(0).getAttribute('src')).toMatch(/^blob:/);
  await expect.poll(async () => videos.nth(1).getAttribute('src')).toMatch(/^blob:/);
  expect(await videos.nth(0).getAttribute('src')).not.toBe(await videos.nth(1).getAttribute('src'));
  await expect(page.getByRole('button', { name: /Flicker|وميض/i })).toBeVisible();
});
