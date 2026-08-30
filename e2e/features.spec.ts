import { expect, test } from '@playwright/test';

const AM_USER = {
  id: 'u-mw',
  name: 'Mohamed Wageeh',
  email: 'm.wageeh@aroma.studio',
  roleId: 'am',
  companyId: 'c-aroma',
  title: 'Account Manager'
};

const CLIENT_USER = {
  id: 'u-sh',
  name: 'Sara Hassan',
  email: 'sara@vodafone.com',
  roleId: 'client',
  companyId: 'c-aroma',
  title: 'Client Reviewer'
};

async function authenticate(page: import('@playwright/test').Page, user: Record<string, unknown>) {
  await page.addInitScript((record) => {
    window.localStorage.setItem('augmentoria-auth-user', JSON.stringify(record));
  }, user);
}

test('client portal lists only shared projects with review shortcuts', async ({ page }) => {
  await authenticate(page, CLIENT_USER);
  await page.goto('/app/my-projects');

  await expect(page.getByRole('heading', { name: /My Projects|مشاريعي/i })).toBeVisible();
  await expect(page.getByText('Ramadan TVC')).toBeVisible();
  await expect(page.getByText('Metro Line Campaign')).toBeVisible();
  await expect(page.getByText('New Destination')).toHaveCount(0);
  await expect(page.getByText('Rebrand Teaser')).toHaveCount(0);
  await expect(page.getByText('Launch Film')).toHaveCount(0);

  const firstReviewLink = page.getByRole('link', { name: /Open review|افتح المراجعة/i }).first();
  await expect(firstReviewLink).toBeVisible();
});

test('projects page can switch to a due-date calendar view', async ({ page }) => {
  await authenticate(page, AM_USER);
  await page.goto('/app/projects');

  await page.getByRole('button', { name: /Calendar|تقويم/i }).click();
  await expect(page.getByRole('button', { name: /Today|اليوم/i })).toBeVisible();

  await page.getByLabel(/Next month|الشهر التالي/i).click().catch(() => undefined);
  await expect(page.locator('.grid.grid-cols-7')).toBeVisible();
});

test('notification bell shows seeded mention and supports mark-all-read', async ({ page }) => {
  await authenticate(page, AM_USER);
  await page.goto('/app');

  const bell = page.getByRole('button', { name: /Notifications|التنبيهات/i });
  await expect(bell).toBeVisible();
  await expect(bell.getByText('1')).toBeVisible();

  await bell.click();
  await expect(page.getByText(/mentioned you on V04|أشار إليك على V04/)).toBeVisible();

  await page.getByRole('button', { name: /Mark all read|تعليم الكل كمقروء/i }).click();
  await expect(bell.getByText('1')).toHaveCount(0);
});

test('comment composer offers checklist items that persist after posting', async ({ page }) => {
  await authenticate(page, AM_USER);
  await page.goto('/studio/review/p-flynas/V02');
  await expect(page.locator('#rv-composer-text')).toBeVisible();

  await page.getByPlaceholder(/Add checklist item|اكتب بند واضغط/i).fill('Check audio mix');
  await page.getByPlaceholder(/Add checklist item|اكتب بند واضغط/i).press('Enter');
  await page.locator('#rv-composer-text').fill('Please verify this version');
  await page.getByRole('button', { name: /Post|نشر/i }).click();

  await expect(page.getByText('Check audio mix').first()).toBeVisible();
});
