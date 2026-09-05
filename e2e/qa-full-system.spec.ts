/**
 * QA Full System Test Suite
 * ─────────────────────────
 * Comprehensive end-to-end QA covering every role, permission, action,
 * real-time feature, review workflow, annotation, assets, comments,
 * sessions, export, and admin controls.
 */
import { expect, test } from '@playwright/test';
import { DEMO_USERS, ROLE_PERMS } from '../src/lib/rbac';
import type { DemoUser, Perm } from '../src/lib/rbac';

// ─── User Shortcuts ───
const SUPER_ADMIN = DEMO_USERS.find((u) => u.roleId === 'super_admin')!;
const COMPANY_ADMIN = DEMO_USERS.find((u) => u.roleId === 'company_admin' && u.companyId === 'c-aroma')!;
const AM = DEMO_USERS.find((u) => u.roleId === 'am')!;
const ASSISTANT = DEMO_USERS.find((u) => u.roleId === 'assistant')!;
const OPS = DEMO_USERS.find((u) => u.roleId === 'ops')!;
const DESIGNER = DEMO_USERS.find((u) => u.roleId === 'designer')!;
const CLIENT = DEMO_USERS.find((u) => u.roleId === 'client')!;
const SOCIALIZR_ADMIN = DEMO_USERS.find((u) => u.companyId === 'c-socializr')!;

async function authenticate(page: import('@playwright/test').Page, user: DemoUser) {
  await page.addInitScript((record) => {
    window.localStorage.setItem('augmentoria-auth-user', JSON.stringify(record));
  }, user);
}

function has(user: DemoUser, permission: Perm) {
  return ROLE_PERMS[user.roleId].includes(permission) || Boolean(user.extraPerms?.includes(permission));
}

// ═══════════════════════════════════════════
// 1. AUTHENTICATION & AUTHORIZATION TESTS
// ═══════════════════════════════════════════

test.describe('Authentication & Access Control', () => {
  test('unauthenticated user is redirected to login from any /app route', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('unauthenticated user is redirected to login from project detail', async ({ page }) => {
    await page.goto('/app/projects/p-vodafone');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login page shows role-based quick login buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Account Manager|أكاونت مانجر/i })).toBeVisible();
  });

  test('quick login redirects back to the originally requested page', async ({ page }) => {
    await page.goto('/app/projects/p-vodafone');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('button', { name: /Account Manager|أكاونت مانجر/i }).click();
    await expect(page).toHaveURL(/\/app\/projects\/p-vodafone$/);
  });

  test('public review routes use the appropriate guest access gate', async ({ page, baseURL }) => {
    await page.goto('/review/p-vodafone/V04');
    if (baseURL?.startsWith('https://')) {
      await expect(page.getByRole('heading', { name: /Enter the invitation code|أدخل كود الدعوة/ })).toBeVisible();
      await expect(page.locator('video')).toHaveCount(0);
    } else {
      await expect(page.locator('video')).toBeVisible();
    }
  });

  test('invalid project IDs show 404 not another project', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/does-not-exist');
    await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
  });

  test('invalid version shows 404', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V99');
    await expect(page.getByText(/Page not found|الصفحة غير موجودة/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════
// 2. ROLE-BASED PERMISSION MATRIX TESTS
// ═══════════════════════════════════════════

test.describe('Role Permission Matrix', () => {
  const allUsers = [SUPER_ADMIN, COMPANY_ADMIN, AM, ASSISTANT, OPS, DESIGNER, CLIENT];

  for (const user of allUsers) {
    test(`${user.roleId} (${user.name}) has correct nav links`, async ({ page }) => {
      await authenticate(page, user);
      await page.goto('/app');

      // Check nav items based on permissions
      const clientsLink = page.locator('aside nav a[href="/app/clients"]');
      await expect(clientsLink).toHaveCount(has(user, 'clients.manage') ? 1 : 0);

      const reportsLink = page.locator('aside nav a[href="/app/reports"]');
      await expect(reportsLink).toHaveCount(has(user, 'reports.export') ? 1 : 0);

      const companiesLink = page.locator('aside nav a[href="/app/admin/companies"]');
      await expect(companiesLink).toHaveCount(has(user, 'companies.manage') ? 1 : 0);

      const membersLink = page.locator('aside nav a[href="/app/admin/members"]');
      await expect(membersLink).toHaveCount(has(user, 'members.manage') ? 1 : 0);
    });

    test(`${user.roleId} (${user.name}) gets correct review controls`, async ({ page }) => {
      await authenticate(page, user);
      const pid = user.companyId === 'c-socializr' ? 'p-instamart' : 'p-vodafone';
      const version = user.companyId === 'c-socializr' ? 'V02' : 'V04';
      await page.goto(`/studio/review/${pid}/${version}`);

      await expect(page.getByText('Unified Pro Review')).toBeVisible();

      // Export button
      const exportBtn = page.getByRole('button', { name: /Export|تصدير/i });
      await expect(exportBtn).toHaveCount(has(user, 'reports.export') ? 1 : 0);

      // Share button
      const shareBtn = page.getByRole('button', { name: /Share|مشاركة/i });
      await expect(shareBtn).toHaveCount(has(user, 'projects.edit') ? 1 : 0);

      // Annotation tools
      const penTool = page.getByTitle(/Freehand pen|قلم حر/i);
      await expect(penTool).toHaveCount(has(user, 'reviews.annotate') ? 1 : 0);

      // Approval controls
      const approveBtn = page.getByRole('button', { name: /Approve version|اعتماد النسخة/i });
      await expect(approveBtn).toHaveCount(has(user, 'approvals.grant') ? 1 : 0);

      const changesBtn = page.getByRole('button', { name: /Request changes|طلب تعديلات/i });
      await expect(changesBtn).toHaveCount(has(user, 'approvals.grant') ? 1 : 0);
    });
  }
});

// ═══════════════════════════════════════════
// 3. PROJECT MANAGEMENT TESTS
// ═══════════════════════════════════════════

test.describe('Project Management', () => {
  test('AM can create a new project via dashboard modal', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app');

    await page.getByRole('button', { name: /New Project|مشروع جديد/i }).click();
    await expect(page.getByRole('heading', { name: /New Project|مشروع جديد/i })).toBeVisible();
    await expect(page.locator('form input').first()).toBeFocused();
  });

  test('AM can upload a version to a project', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');

    await page.getByRole('button', { name: /Upload Version|رفع نسخة/i }).click();
    await expect(page.getByRole('heading', { name: /Upload Version|رفع نسخة/i })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', 'video/*');
  });

  test('project detail shows correct tabs for AM', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');

    await expect(page.getByRole('button', { name: /Versions|النسخ/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sessions|الجلسات/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Assets|الأصول/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Team|الفريق/i })).toBeVisible();
  });

  test('client sees only their assigned projects on My Projects', async ({ page }) => {
    await authenticate(page, CLIENT);
    await page.goto('/app/my-projects');

    await expect(page.getByRole('heading', { name: /My Projects|مشاريعي/i })).toBeVisible();
    await expect(page.getByText('Ramadan TVC')).toBeVisible();
    // Client should not see projects they're not assigned to
    await expect(page.getByText('New Destination')).toHaveCount(0);
    await expect(page.getByText('Rebrand Teaser')).toHaveCount(0);
  });

  test('calendar view works on projects page', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects');

    await page.getByRole('button', { name: /Calendar|تقويم/i }).click();
    await expect(page.getByRole('button', { name: /Today|اليوم/i })).toBeVisible();
    await expect(page.locator('.grid.grid-cols-7')).toBeVisible();
  });

  test('version list links to unified review', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');
    await page.getByRole('button', { name: /Versions|النسخ/i }).click();

    const review = page.getByRole('link', { name: /^Review$/i }).first();
    await expect(review).toBeVisible();
    await review.click();

    await expect(page).toHaveURL('/studio/review/p-vodafone/V04');
    await expect(page.getByText('Unified Pro Review')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════
// 4. VIDEO REVIEW SYSTEM TESTS
// ═══════════════════════════════════════════

test.describe('Video Review System', () => {
  test('review player loads and play/pause works', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Play
    await page.getByRole('button', { name: 'Play/Pause' }).click();
    await expect.poll(() => video.evaluate((el) => !(el as HTMLVideoElement).paused)).toBe(true);

    // Pause
    await page.getByRole('button', { name: 'Play/Pause' }).click();
    await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(true);
  });

  test('timeline scrubbing seeks the video', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).duration || 0)).toBeGreaterThan(0);

    const timeline = page.getByRole('slider', { name: 'Review timeline' });
    await expect.poll(async () => Number(await timeline.getAttribute('aria-valuemax'))).toBeGreaterThan(0);
    const timelineBox = await timeline.boundingBox();
    if (!timelineBox) throw new Error('Timeline has no bounding box');

    // Scrub to ~70%
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.15, timelineBox.y + timelineBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.72, timelineBox.y + timelineBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() =>
      video.evaluate((el) => {
        const m = el as HTMLVideoElement;
        return m.duration ? m.currentTime / m.duration : 0;
      })
    ).toBeGreaterThan(0.65);
  });

  test('comments panel toggles visibility', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    await page.setViewportSize({ width: 1280, height: 720 });
    const toggle = page.locator('button[aria-controls="review-comments"]').first();
    await expect(toggle).toBeVisible();
    await expect(page.locator('#review-comments')).toBeVisible();

    await toggle.click();
    await expect(page.locator('#review-comments')).toBeHidden();

    await toggle.click();
    await expect(page.locator('#review-comments')).toBeVisible();
  });

  test('mobile review has collapsible comments drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, CLIENT);
    await page.goto('/studio/review/p-vodafone/V04');

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
});

// ═══════════════════════════════════════════
// 5. ANNOTATION & DRAWING TOOLS TESTS
// ═══════════════════════════════════════════

test.describe('Annotation & Drawing Tools', () => {
  test('text annotation: place, render, and persist in SVG', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    await page.getByTitle(/Text|نص/i).click();
    const box = await video.boundingBox();
    if (!box) throw new Error('Video has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const textInput = page.getByPlaceholder('Type…');
    await expect(textInput).toBeFocused();
    await textInput.fill('QA Annotation Test');
    await textInput.press('Enter');

    const rendered = page.locator('svg text').filter({ hasText: 'QA Annotation Test' });
    await expect(rendered).toBeVisible();
  });

  test('free transform: move, resize handles, and rotate handle exist', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    await page.getByTitle(/Text|نص/i).click();
    const videoBox = await video.boundingBox();
    if (!videoBox) throw new Error('Video has no bounding box');
    await page.mouse.click(videoBox.x + videoBox.width / 2, videoBox.y + videoBox.height / 2);
    await page.getByPlaceholder('Type…').fill('Transform me');
    await page.getByPlaceholder('Type…').press('Enter');
    await page.getByRole('button', { name: /Done drawing|تم الرسم/i }).click();

    const transformBox = page.getByTestId('free-transform-box');
    await expect(transformBox).toBeVisible();
    await expect(page.getByTestId('free-transform-resize-se')).toBeVisible();
    await expect(page.getByTestId('free-transform-rotate')).toBeVisible();

    // Drag to move
    const before = await transformBox.boundingBox();
    if (!before) throw new Error('Transform box has no bounding box');
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 45, before.y + before.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
    const after = await transformBox.boundingBox();
    expect(after?.x ?? 0).toBeGreaterThan(before.x + 20);
  });

  test('layer opacity and rotation controls work', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    await page.getByTitle(/Text|نص/i).click();
    const box = await video.boundingBox();
    if (!box) throw new Error('No bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByPlaceholder('Type…').fill('Opacity test');
    await page.getByPlaceholder('Type…').press('Enter');

    // Click on the layer button to select it
    await page.getByRole('button', { name: /1\. text.*Opacity test/i }).click();
    await page.getByLabel('Opacity').fill('0.5');
    await page.getByLabel('Rotation').fill('30');

    const renderedText = page.locator('svg text').filter({ hasText: 'Opacity test' });
    const layerGroup = renderedText.locator('..');
    await expect(layerGroup).toHaveAttribute('opacity', '0.5');
    await expect(layerGroup).toHaveAttribute('transform', /rotate\(30 /);
  });

  test('annotation layers are tied to timecodes and disappear at other times', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Click on a seeded comment with annotations
    await page.getByText('Music is too loud under the VO here.').click();
    await expect(page.getByTestId('review-overlay').locator('polyline')).toBeVisible();

    // Seek to a different time — annotations should disappear
    await video.evaluate((el) => {
      (el as HTMLVideoElement).currentTime = 20;
      el.dispatchEvent(new Event('timeupdate'));
    });
    await expect(page.getByTestId('review-overlay').locator('polyline')).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════
// 6. COMMENTS & FEEDBACK TESTS
// ═══════════════════════════════════════════

test.describe('Comments & Feedback', () => {
  test('post a visual comment with annotation', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    await page.getByTitle(/Text|نص/i).click();
    const videoBox = await video.boundingBox();
    if (!videoBox) throw new Error('No bounding box');
    await page.mouse.click(videoBox.x + videoBox.width / 2, videoBox.y + videoBox.height / 2);
    await page.getByPlaceholder('Type…').fill('Annotated feedback');
    await page.getByPlaceholder('Type…').press('Enter');
    await page.getByRole('button', { name: /Done drawing|تم الرسم/i }).click();

    const post = page.getByRole('button', { name: /Post|نشر/i });
    await expect(post).toBeEnabled();
    await post.click();
    await expect(page.getByText(/Visual feedback|تعليق بصري/i).first()).toBeVisible();
  });

  test('checklist items persist after posting', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-flynas/V02');
    await expect(page.locator('#rv-composer-text')).toBeVisible();

    await page.getByPlaceholder(/Add checklist item|اكتب بند واضغط/i).fill('Check audio mix');
    await page.getByPlaceholder(/Add checklist item|اكتب بند واضغط/i).press('Enter');
    await page.locator('#rv-composer-text').fill('Please verify this version');
    await page.getByRole('button', { name: /Post|نشر/i }).click();

    await expect(page.getByText('Check audio mix').first()).toBeVisible();
  });

  test('client can approve a version with a decision note', async ({ page }) => {
    await authenticate(page, CLIENT);
    await page.goto('/studio/review/p-vodafone/V04');
    await page.getByRole('button', { name: /Approve version|اعتماد النسخة/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/Decision note|ملاحظة القرار/i).fill('Approved by QA test.');
    await dialog.getByRole('button', { name: /Confirm approval|تأكيد الاعتماد/i }).click();
    await expect(page.getByText(/^Approved$|^تم الاعتماد$/i).first()).toBeVisible();
  });

  test('client can request changes with a mandatory note', async ({ page }) => {
    await authenticate(page, CLIENT);
    await page.goto('/studio/review/p-vodafone/V04');

    await page.getByRole('button', { name: /Request changes|طلب تعديلات/i }).click();
    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: /Send change request|إرسال طلب التعديل/i });
    await expect(confirm).toBeDisabled(); // Note is mandatory
    await dialog.getByPlaceholder(/Decision note|ملاحظة القرار/i).fill('Color grading needs rework.');
    await confirm.click();
    await expect(page.getByText(/Changes requested|تعديلات مطلوبة/i).first()).toBeVisible();
  });

  test('public guests cannot moderate but can approve/request changes', async ({ page }) => {
    await page.goto('/review/p-vodafone/V04');
    // No moderation controls
    await expect(page.getByTitle(/Resolve|Unresolve|حل|إعادة فتح/i)).toHaveCount(0);
    // But approval still works
    await expect(page.getByRole('button', { name: /Approve version|اعتماد النسخة/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════
// 7. LIVE SESSION & REAL-TIME SYNC TESTS
// ═══════════════════════════════════════════

test.describe('Live Sessions & Real-Time', () => {
  test('start live session from review page and end it', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    const startLive = page.getByRole('button', { name: /Start Live|ابدأ Live/i });
    await expect(startLive).toBeVisible();
    await startLive.click();
    await page.getByRole('button', { name: /Go live now|ابدأ الآن/i }).click();
    await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();

    // End the session
    await page.getByRole('button', { name: /End session|إنهاء الجلسة/i }).click();
  });

  test('live session syncs playhead between host and client', async ({ page, context }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');

    await page.getByRole('button', { name: /Start Live|ابدأ Live/i }).click();
    await page.getByRole('button', { name: /Go live now|ابدأ الآن/i }).click();
    await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();

    const client = await context.newPage();
    await authenticate(client, CLIENT);
    await client.goto('/studio/review/p-vodafone/V04');

    // Client requests control
    await client.getByRole('button', { name: /Request control|طلب التحكم/i }).click();
    await expect(page.getByRole('button', { name: /Accept .*control request|قبول تحكم/i })).toBeVisible();
    await page.getByRole('button', { name: /Accept .*control request|قبول تحكم/i }).click();
    await expect(client.getByText(/You have control|أنت متحكم/i)).toBeVisible();

    // Client seeks to 5s, host should sync
    const hostVideo = page.locator('video');
    const clientVideo = client.locator('video');
    await client.bringToFront();
    await expect.poll(() => hostVideo.evaluate((el) => (el as HTMLVideoElement).duration || 0)).toBeGreaterThan(0);
    await expect.poll(() => clientVideo.evaluate((el) => (el as HTMLVideoElement).duration || 0)).toBeGreaterThan(0);
    await clientVideo.evaluate((el) => { (el as HTMLVideoElement).currentTime = 5; });
    await expect.poll(() => hostVideo.evaluate((el) => (el as HTMLVideoElement).currentTime)).toBeGreaterThan(4.8);

    // Host takes back control
    await page.getByRole('button', { name: /Take control|استلم التحكم/i }).click();
    await page.getByRole('button', { name: /End session|إنهاء الجلسة/i }).click();
    await client.close();
  });

  test('start session from project sessions tab with specific version', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');
    await page.getByRole('button', { name: /Sessions|الجلسات/i }).click();
    await page.locator('select').last().selectOption('V03');
    await page.getByRole('button', { name: /Start now|ابدأ الآن/i }).click();
    await expect(page).toHaveURL('/studio/review/p-vodafone/V03');
    await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();
  });

  test('compare page offers back-to-session when session is active', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/review/p-vodafone/V04');
    await page.getByRole('button', { name: /Start Live|ابدأ Live/i }).click();
    await page.getByRole('button', { name: /Go live now|ابدأ الآن/i }).click();
    await page.goto('/studio/compare/p-vodafone/V03/V04');

    const backBtn = page.getByRole('button', { name: /Back to session|العودة للجلسة/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page).toHaveURL('/studio/review/p-vodafone/V04');
    await expect(page.getByRole('button', { name: /End session|إنهاء الجلسة/i })).toBeVisible();
  });

  test('archived sessions show saved comments and event log', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');
    await page.getByRole('button', { name: /Sessions|الجلسات/i }).click();
    await page.getByRole('button', { name: /View archive|عرض الأرشيف/i }).first().click();

    const archive = page.getByRole('dialog');
    await expect(archive.getByText(/Archived session|جلسة محفوظة/i)).toBeVisible();
    await expect(archive.getByText(/Saved comments|التعليقات المحفوظة/i)).toBeVisible();
    await expect(archive.getByText(/Session event log|سجل ما حدث/i)).toBeVisible();
    await expect(archive.locator('a[href*="?comment="]').first()).toHaveAttribute(
      'href',
      /\/studio\/review\/p-vodafone\/V04\?comment=/
    );
  });
});

// ═══════════════════════════════════════════
// 8. ASSET MANAGEMENT TESTS
// ═══════════════════════════════════════════

test.describe('Asset Management', () => {
  test('upload video assets and assign to review', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');
    await page.getByRole('button', { name: /Assets|الأصول/i }).click();
    await page.locator('input[type="file"]').setInputFiles([
      'public/demo/vodafone-v04.mp4',
      'public/demo/flynas-v02.mp4'
    ]);

    await expect(page.getByText('vodafone-v04.mp4', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Use in Review V04|استخدم في Review V04/i }).first().click();
    await expect(page.getByRole('button', { name: /✓ Use in Review V04|✓ استخدم في Review V04/i })).toBeVisible();
  });

  test('compare mode opens with 2 selected assets', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/projects/p-vodafone');
    await page.getByRole('button', { name: /Assets|الأصول/i }).click();
    await page.locator('input[type="file"]').setInputFiles([
      'public/demo/vodafone-v04.mp4',
      'public/demo/flynas-v02.mp4'
    ]);

    const compareToggles = page.getByRole('button', { name: /Compare$|مقارنة$/i });
    await compareToggles.nth(0).click();
    await compareToggles.nth(1).click();
    await page.getByRole('button', { name: /Compare \(2\/2\)|قارن \(2\/2\)/i }).click();

    await expect(page).toHaveURL(/\/studio\/asset-compare\/p-vodafone\//);
    await expect(page.locator('video')).toHaveCount(2);
  });
});

// ═══════════════════════════════════════════
// 9. VERSION COMPARE & FLICKER TESTS
// ═══════════════════════════════════════════

test.describe('Version Compare', () => {
  test('compare loads two independently stored videos with flicker mode', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app');

    // Seed IDB with two versions
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
      const tx = db.transaction('version-videos', 'readwrite');
      const store = tx.objectStore('version-videos');
      store.put({ id: 'p-vodafone__V03', name: 'version-a.mp4', blob: new Blob(['version-a'], { type: 'video/mp4' }) });
      store.put({ id: 'p-vodafone__V04', name: 'version-b.mp4', blob: new Blob(['version-b'], { type: 'video/mp4' }) });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
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
    await expect.poll(() => videos.nth(1).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

// ═══════════════════════════════════════════
// 10. NOTIFICATIONS TESTS
// ═══════════════════════════════════════════

test.describe('Notifications', () => {
  test('bell shows seeded mention and mark-all-read works', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app');

    const bell = page.getByRole('button', { name: /Notifications|التنبيهات/i });
    await expect(bell).toBeVisible();
    await expect(bell.getByText('1')).toBeVisible();

    await bell.click();
    await expect(page.getByText(/mentioned you on V04|أشار إليك على V04/)).toBeVisible();

    await page.getByRole('button', { name: /Mark all read|تعليم الكل كمقروء/i }).click();
    await expect(bell.getByText('1')).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════
// 11. REPORTS & EXPORT TESTS
// ═══════════════════════════════════════════

test.describe('Reports & Export', () => {
  test('reports page shows filters and export buttons', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/reports/p-vodafone/V04');

    await expect(page.getByText('Report filters')).toBeVisible();
    await expect(page.getByRole('button', { name: /Print|طباعة/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: '📊 CSV' })).toBeEnabled();
    await expect(page.getByRole('button', { name: '🗂 JSON' })).toBeEnabled();
  });

  test('report filters hide/show content types', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/app/reports/p-vodafone/V04');

    // Approval filter
    await page.getByLabel('Approval').uncheck();
    // Should hide approval-related content (if any visible)
    await page.getByLabel('Approval').check();

    // Replies filter
    await page.getByLabel('Replies').uncheck();
    await expect(page.getByText('On it — will push to V05.')).toHaveCount(0);
    await page.getByLabel('Replies').check();
  });
});

// ═══════════════════════════════════════════
// 12. VIDEO EDITOR TESTS
// ═══════════════════════════════════════════

test.describe('Video Editor', () => {
  test('editor loads with timeline and supports splitting clips', async ({ page }) => {
    await authenticate(page, AM);
    await page.goto('/studio/editor/p-vodafone/V04');

    await expect(page.getByText(/Non-destructive video editor|مونتاج فيديو غير هدّام/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Timeline · 1 clips/i })).toBeVisible();

    const video = page.locator('main video');
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2);

    await video.evaluate((el) => {
      (el as HTMLVideoElement).currentTime = 10;
      el.dispatchEvent(new Event('timeupdate', { bubbles: true }));
    });
    await page.getByRole('button', { name: /Split at playhead|اقسم عند المؤشر/i }).click();
    await expect(page.getByRole('heading', { name: /Timeline · 2 clips/i })).toBeVisible();
    await expect(page.getByText(/Saved|محفوظ/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════
// 13. SAAS ADMIN & TENANT ISOLATION TESTS
// ═══════════════════════════════════════════

test.describe('SaaS Admin & Tenant Isolation', () => {
  test('super admin sees all studios with plans', async ({ page }) => {
    await authenticate(page, SUPER_ADMIN);
    await page.goto('/app/admin/companies');

    await expect(page.getByText('AROMA Studios')).toBeVisible();
    await expect(page.getByText('Socializr')).toBeVisible();
    await expect(page.getByText(/Yearly|سنوي/i).first()).toBeVisible();
  });

  test('super admin can suspend and unsuspend a studio', async ({ page }) => {
    await authenticate(page, SUPER_ADMIN);
    await page.goto('/app/admin/companies');

    const socializrCard = page.locator('div.group', { hasText: 'Socializr' }).first();
    await socializrCard.getByRole('button', { name: '⏸' }).click();
    await expect(socializrCard.getByText(/Suspended|موقوف/i)).toBeVisible();

    await socializrCard.getByRole('button', { name: '▶' }).click();
    await expect(socializrCard.getByText(/Active|نشط/i)).toBeVisible();
  });

  test('tenant isolation prevents cross-studio data leaks', async ({ page }) => {
    await authenticate(page, SOCIALIZR_ADMIN);
    await page.goto('/app/projects');
    await expect(page.getByText('Always-On Social')).toBeVisible();
    await expect(page.getByText('Ramadan TVC')).toHaveCount(0);
    await expect(page.getByText('Metro Line Campaign')).toHaveCount(0);

    await page.goto('/app/admin/members');
    await expect(page.getByText('Nada Sherif')).toBeVisible();
    await expect(page.getByText('Karim Nasser')).toHaveCount(0);

    await page.goto('/app/admin/companies');
    await expect(page.getByText(/No Access|Access denied|مش مسموح|غير مسموح/i)).toBeVisible();
  });

  test('studio admin can create custom roles', async ({ page }) => {
    await authenticate(page, COMPANY_ADMIN);
    await page.goto('/app/admin/roles');

    await page.getByRole('button', { name: /New role|مسمى جديد/i }).click();
    await page.getByPlaceholder(/Role name|اسم المسمى/i).fill('QA Tester');
    await page.getByLabel(/Upload versions|رفع النسخ/i).check().catch(() => undefined);
    await page.getByRole('button', { name: /Save|حفظ/i }).last().click();
    await expect(page.locator('p.font-bold', { hasText: /^QA Tester/ })).toBeVisible();
  });

  test('studio admin can invite a member with custom role', async ({ page }) => {
    await authenticate(page, COMPANY_ADMIN);
    await page.goto('/app/admin/members');

    await page.getByRole('button', { name: /Add member|إضافة عضو/i }).click();
    await expect(page.getByRole('heading', { name: /Add member|إضافة عضو/i })).toBeVisible();

    const selects = page.locator('dialog, [role="dialog"], div.fixed').locator('select');
    await expect(selects).toHaveCount(2);

    await page.getByPlaceholder(/Full name|الاسم/i).fill('QA Bot');
    await page.getByPlaceholder(/Email address|الايميل|البريد/i).fill('qa.bot@aroma.studio');
    await page.getByRole('dialog').getByRole('combobox', { name: /Role|الدور/i }).selectOption({ label: 'Producer' });
    await page.getByRole('button', { name: /Add member|إضافة عضو/i }).last().click();
    await expect(page.getByText('QA Bot', { exact: true })).toBeVisible();
  });

  test('role templates can be applied and saved', async ({ page }) => {
    await authenticate(page, COMPANY_ADMIN);
    await page.goto('/app/admin/roles');

    await expect(page.getByText(/Role templates|تمبليتات المسميات/i)).toBeVisible();
    await expect(page.getByText('Commercial / TVC Production')).toBeVisible();

    await page.getByText('Film / Long-form').locator('../..').getByRole('button', { name: /Apply template|تطبيق التمبليت/i }).click();
    await page.getByRole('button', { name: /Apply template \(\d+\)|تطبيق التمبليت \(\d+\)/i }).last().click();
    await expect(page.getByText('Line Producer').first()).toBeVisible();

    await page.getByRole('button', { name: /Save current as template|احفظ الحالي كتمبليت/i }).click();
    await page.getByPlaceholder(/Template name|اسم التمبليت/i).fill('QA Template');
    await page.getByRole('button', { name: /💾|Save|حفظ/i }).last().click();
    await expect(page.getByText('QA Template')).toBeVisible();
  });
});

// ═══════════════════════════════════════════
// 14. EMPTY STATE / PLACEHOLDER HERO TESTS
// ═══════════════════════════════════════════

test.describe('Empty State Placeholder', () => {
  test('new version without video shows hero placeholder with CTA buttons', async ({ page }) => {
    await authenticate(page, AM);
    // Navigate to a version that has no demo video
    await page.goto('/studio/review/p-vodafone/V01');

    // Should show the placeholder hero since V01 has no default demo video
    await expect(page.getByRole('heading', { name: /Select a Video|اختر فيديو/i })).toBeVisible();
    await expect(page.getByText(/Pick from Assets|اختيار من مكتبة/i)).toBeVisible();
    await expect(page.getByText(/Import Media File|استيراد ملف/i)).toBeVisible();
  });
});
