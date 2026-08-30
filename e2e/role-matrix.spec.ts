import { expect, test } from '@playwright/test';
import { DEMO_USERS, ROLE_PERMS } from '../src/lib/rbac';
import type { DemoUser, Perm } from '../src/lib/rbac';

async function authenticate(page: import('@playwright/test').Page, user: DemoUser) {
  await page.addInitScript((record) => {
    window.localStorage.setItem('augmentoria-auth-user', JSON.stringify(record));
  }, user);
}

function has(user: DemoUser, permission: Perm) {
  return ROLE_PERMS[user.roleId].includes(permission) || Boolean(user.extraPerms?.includes(permission));
}

async function expectCount(locator: import('@playwright/test').Locator, visible: boolean) {
  await expect(locator).toHaveCount(visible ? 1 : 0);
}

for (const user of DEMO_USERS) {
  const ownCompany = user.companyId === 'c-socializr';
  const pid = ownCompany ? 'p-instamart' : 'p-vodafone';
  const version = ownCompany ? 'V02' : 'V04';

  test(`${user.roleId} receives the correct navigation, route and review controls (${user.companyId})`, async ({ page }) => {
    await authenticate(page, user);
    await page.goto('/app');

    await expectCount(page.locator('aside nav a[href="/app/clients"]'), has(user, 'clients.manage'));
    await expectCount(page.locator('aside nav a[href="/app/reports"]'), has(user, 'reports.export'));
    await expectCount(page.locator('aside nav a[href="/app/admin/companies"]'), has(user, 'companies.manage'));
    await expectCount(page.locator('aside nav a[href="/app/admin/members"]'), has(user, 'members.manage'));

    if (user.roleId !== 'super_admin' && !has(user, 'companies.manage')) {
      await expectCount(page.locator(`a[href="/app/projects/${ownCompany ? 'p-vodafone' : 'p-instamart'}"]`), false);
    }

    await page.goto('/app/clients');
    await expect(page.getByRole('heading', { name: /No Access|Access denied|مش مسموح|غير مسموح/i })).toHaveCount(has(user, 'clients.manage') ? 0 : 1);

    await page.goto('/app/reports');
    await expect(page.getByRole('heading', { name: /No Access|Access denied|مش مسموح|غير مسموح/i })).toHaveCount(has(user, 'reports.export') ? 0 : 1);

    await page.goto(`/app/projects/${pid}`);
    await expectCount(page.getByRole('button', { name: /Upload Version|رفع نسخة/i }), has(user, 'versions.upload'));
    await expectCount(page.getByRole('button', { name: /New review session|ابدأ جلسة جديدة|Join live session|ادخل الجلسة/i }), has(user, 'projects.edit'));
    await expectCount(page.getByRole('button', { name: /Assets|الأصول/i }), has(user, 'versions.upload'));
    await expectCount(page.getByRole('button', { name: /Team|الفريق/i }), has(user, 'team.manage'));

    await page.goto(`/studio/review/${pid}/${version}`);
    await expect(page.getByText('Unified Pro Review')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    await expectCount(page.getByRole('button', { name: /Export|تصدير/i }), has(user, 'reports.export'));
    await expectCount(page.getByRole('button', { name: /Share|مشاركة/i }), has(user, 'projects.edit'));
    await expectCount(page.getByRole('button', { name: /Upload video|رفع فيديو/i }), has(user, 'versions.upload'));
    await expectCount(page.getByRole('link', { name: /Editor|المونتاج/i }), has(user, 'versions.upload'));
    await expectCount(page.getByRole('button', { name: /Request changes|طلب تعديلات/i }), has(user, 'approvals.grant'));
    await expectCount(page.getByRole('button', { name: /Approve version|اعتماد النسخة/i }), has(user, 'approvals.grant'));
    await expectCount(page.getByTitle(/Freehand pen|قلم حر/i), has(user, 'reviews.annotate'));
  });
}

test('public guest uses unified review without internal navigation or moderation', async ({ page }) => {
  await page.goto('/review/p-vodafone/V04');
  await expect(page.getByText('Unified Pro Review')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('a[href="/app/settings"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Export|تصدير/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Share|مشاركة/i })).toHaveCount(0);
  await expect(page.getByTitle(/Freehand pen|قلم حر/i)).toBeVisible();
});
