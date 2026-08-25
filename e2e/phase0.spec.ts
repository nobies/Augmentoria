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

test('landscape review prioritizes the video and tablet comments can collapse', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/review/p-vodafone/V04');
  const video = page.locator('video');
  await expect(video).toBeVisible();
  expect((await video.boundingBox())?.height ?? 0).toBeGreaterThan(200);
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  const panelToggle = page.locator('button[aria-controls="review-comments"]').first();
  await expect(panelToggle).toBeVisible();
  await expect(page.locator('#review-comments')).toBeVisible();
  await panelToggle.click();
  await expect(page.locator('#review-comments')).toBeHidden();
  await panelToggle.click();
  await expect(page.locator('#review-comments')).toBeVisible();
});

test('public review links can decide on a version without gaining moderation rights', async ({ page }) => {
  await page.goto('/review/p-vodafone/V04');
  await expect(page.getByTitle(/Resolve|Unresolve|حل|إعادة فتح/i)).toHaveCount(0);
  await page.getByRole('button', { name: /Approve version|اعتماد النسخة/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder(/Decision note|ملاحظة القرار/i).fill('Approved from the client link.');
  await dialog.getByRole('button', { name: /Confirm approval|تأكيد الاعتماد/i }).click();
  await expect(page.getByText(/^Approved$|^تم الاعتماد$/i).first()).toBeVisible();
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
  const renderedText = page.locator('svg text').filter({ hasText: 'Text annotation works' });
  await expect(renderedText).toBeVisible();
  await page.getByRole('button', { name: /1\. text.*Text annotation works/i }).click();
  await page.getByLabel('Opacity').fill('0.5');
  await page.getByLabel('Rotation').fill('30');
  const layerGroup = renderedText.locator('..');
  await expect(layerGroup).toHaveAttribute('opacity', '0.5');
  await expect(layerGroup).toHaveAttribute('transform', /rotate\(30 /);

  await page.getByText('Music is too loud under the VO here.').click();
  await expect(page.getByTestId('review-overlay').locator('polyline')).toBeVisible();
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = 20;
    media.dispatchEvent(new Event('timeupdate'));
  });
  await expect(page.getByTestId('review-overlay').locator('polyline')).toHaveCount(0);
});

test('live review starts on demand and synchronizes the playhead across tabs', async ({ page, context }) => {
  await authenticate(page);
  await page.goto('/studio/review/p-vodafone/V04');
  const startLive = page.getByRole('button', { name: /Start Live|ابدأ Live/i });
  await expect(startLive).toBeVisible();
  await startLive.click();
  await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();

  const client = await context.newPage();
  await authenticate(client, CLIENT_USER);
  await client.goto('/studio/review/p-vodafone/V04');
  await client.getByRole('button', { name: /Request control|طلب التحكم/i }).click();
  await expect(page.getByRole('button', { name: /Accept .*control request|قبول تحكم/i })).toBeVisible();
  await page.getByRole('button', { name: /Accept .*control request|قبول تحكم/i }).click();
  await expect(client.getByText(/You have control|أنت متحكم/i)).toBeVisible();

  const hostVideo = page.locator('video');
  const clientVideo = client.locator('video');
  await expect.poll(() => hostVideo.evaluate((element) => (element as HTMLVideoElement).duration || 0)).toBeGreaterThan(0);
  await expect.poll(() => clientVideo.evaluate((element) => (element as HTMLVideoElement).duration || 0)).toBeGreaterThan(0);
  await clientVideo.evaluate((element) => {
    (element as HTMLVideoElement).currentTime = 5;
  });
  await expect.poll(() => hostVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(4.8);
  await page.getByRole('button', { name: /Take control|استلم التحكم/i }).click();
  await page.getByRole('button', { name: /End session|إنهاء الجلسة/i }).click();
  await client.close();
});

test('client reviewers can comment without moderation, sharing, export, or session controls', async ({ page, context }) => {
  await authenticate(page, CLIENT_USER);
  await page.goto('/studio/review/p-vodafone/V04');

  await expect(page.locator('#rv-composer-text')).toBeVisible();
  await expect(page.getByTitle(/Resolve|Unresolve|حل|إعادة فتح/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Export|تصدير/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Share|مشاركة/i })).toHaveCount(0);
  await expect(page.getByTitle(/End session|إنهاء الجلسة/i)).toHaveCount(0);

  await page.getByRole('button', { name: /Request changes|طلب تعديلات/i }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: /Send change request|إرسال طلب التعديل/i });
  await expect(confirm).toBeDisabled();
  await dialog.getByPlaceholder(/Decision note|ملاحظة القرار/i).fill('Please shorten the end card.');
  await confirm.click();
  await expect(page.getByText(/Changes requested|تعديلات مطلوبة/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Changes requested|تعديلات مطلوبة/i).first()).toBeVisible();
  const manager = await context.newPage();
  await authenticate(manager, DEMO_USER);
  await manager.goto('/app/reports/p-vodafone/V04');
  await expect(manager.getByText('Please shorten the end card.')).toBeVisible();
  await expect(manager.getByText('Report filters')).toBeVisible();
  await expect(manager.getByRole('button', { name: /Print|طباعة/i })).toBeEnabled();
  await expect(manager.getByRole('button', { name: '📊 CSV' })).toBeEnabled();
  await expect(manager.getByRole('button', { name: '🗂 JSON' })).toBeEnabled();
  await manager.getByLabel('Approval').uncheck();
  await expect(manager.getByText('Please shorten the end card.')).toHaveCount(0);
  await manager.getByLabel('Approval').check();
  await expect(manager.getByText('Please shorten the end card.')).toBeVisible();
  await manager.getByLabel('Replies').uncheck();
  await expect(manager.getByText('On it — will push to V05.')).toHaveCount(0);
  await manager.close();
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
  const flicker = page.getByRole('button', { name: /Flicker|وميض/i });
  await expect(flicker).toBeVisible();
  await flicker.click();
  await expect.poll(() => videos.nth(1).evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
});

test('uploaded video assets can be assigned to review and compared with each other', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app/projects/p-vodafone');
  await page.getByRole('button', { name: /Assets|الأصول/i }).click();
  await page.locator('input[type="file"]').setInputFiles([
    'public/demo/vodafone-v04.mp4',
    'public/demo/flynas-v02.mp4'
  ]);

  await expect(page.getByText('vodafone-v04.mp4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Use in Review V04|استخدم في Review V04/i }).first().click();
  await expect(page.getByRole('button', { name: /✓ Use in Review V04|✓ استخدم في Review V04/i })).toBeVisible();

  const compareToggles = page.getByRole('button', { name: /Compare$|مقارنة$/i });
  await compareToggles.nth(0).click();
  await compareToggles.nth(1).click();
  await page.getByRole('button', { name: /Compare \(2\/2\)|قارن \(2\/2\)/i }).click();

  await expect(page).toHaveURL(/\/studio\/asset-compare\/p-vodafone\//);
  await expect(page.locator('video')).toHaveCount(2);
  await expect(page.getByText(/Asset video compare|مقارنة فيديوهات/i)).toBeVisible();
});

test('video editor supports trim timeline and splitting a real clip', async ({ page }) => {
  await authenticate(page);
  await page.goto('/studio/editor/p-vodafone/V04');

  await expect(page.getByText(/Non-destructive video editor|مونتاج فيديو غير هدّام/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Timeline · 1 clips/i })).toBeVisible();
  const video = page.locator('main video');
  await expect(video).toBeVisible();
  await video.evaluate((element) => {
    element.currentTime = 10;
    element.dispatchEvent(new Event('timeupdate', { bubbles: true }));
  });
  await page.getByRole('button', { name: /Split at playhead|اقسم عند المؤشر/i }).click();
  await expect(page.getByRole('heading', { name: /Timeline · 2 clips/i })).toBeVisible();
  await expect(page.getByText(/Saved|محفوظ/i)).toBeVisible();
});

test('project sessions tab starts a live review on the selected version', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app/projects/p-vodafone');
  await page.getByRole('button', { name: /Sessions|الجلسات/i }).click();
  await page.locator('select').last().selectOption('V03');
  await page.getByRole('button', { name: /Start now|ابدأ الآن/i }).click();
  await expect(page).toHaveURL('/studio/review/p-vodafone/V03');
  await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();
});

test('project exposes isolated Pro Review without replacing legacy review', async ({ page }) => {
  await authenticate(page);
  await page.goto('/app/projects/p-vodafone');
  await page.getByRole('button', { name: /Versions|النسخ/i }).click();

  const proReview = page.getByRole('link', { name: /Pro Review/i }).first();
  await expect(proReview).toBeVisible();
  await proReview.click();

  await expect(page).toHaveURL('/studio/pro-review/p-vodafone/V04');
  await expect(page.getByText('Augmentoria Pro Review · FreeFrame Engine')).toBeVisible();
  await expect(page.getByRole('link', { name: /Legacy review/i })).toHaveAttribute(
    'href',
    '/studio/review/p-vodafone/V04',
  );
});
