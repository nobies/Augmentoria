import { expect, test } from '@playwright/test';

const SUPER_ADMIN = {
  id: 'u-sa',
  name: 'Super Admin',
  email: 'admin@augmentoria.app',
  roleId: 'super_admin',
  companyId: 'c-aroma',
  title: 'Platform Owner'
};

const AROMA_ADMIN = {
  id: 'u-ca',
  name: 'Karim Nasser',
  email: 'karim@aroma.studio',
  roleId: 'company_admin',
  companyId: 'c-aroma',
  title: 'Studio Director'
};

const SOCIALIZR_ADMIN = {
  id: 'u-ns',
  name: 'Nada Sherif',
  email: 'nada@socializr.app',
  roleId: 'company_admin',
  companyId: 'c-socializr',
  title: 'Studio Manager'
};

async function authenticate(page: import('@playwright/test').Page, user: Record<string, unknown>) {
  await page.addInitScript((record) => {
    window.localStorage.setItem('augmentoria-auth-user', JSON.stringify(record));
  }, user);
}

test('super admin sees studios with plans and can suspend a studio', async ({ page }) => {
  await authenticate(page, SUPER_ADMIN);
  await page.goto('/app/admin/companies');

  await expect(page.getByText('AROMA Studios')).toBeVisible();
  await expect(page.getByText('Socializr')).toBeVisible();
  await expect(page.getByText(/Yearly|سنوي/i).first()).toBeVisible();

  const socializrCard = page.locator('div.group', { hasText: 'Socializr' }).first();
  await socializrCard.getByRole('button', { name: '⏸' }).click();
  await expect(socializrCard.getByText(/Suspended|موقوف/i)).toBeVisible();

  await socializrCard.getByRole('button', { name: '▶' }).click();
  await expect(socializrCard.getByText(/Active|نشط/i)).toBeVisible();
});

test('suspended studio blocks its members from logging in', async ({ page }) => {
  await authenticate(page, SUPER_ADMIN);
  await page.goto('/app/admin/companies');
  const socializrCard = page.locator('div.group', { hasText: 'Socializr' }).first();
  await socializrCard.getByRole('button', { name: '⏸' }).click();
  await expect(socializrCard.getByText(/Suspended|موقوف/i)).toBeVisible();

  await authenticate(page, SOCIALIZR_ADMIN);
  await page.goto('/app');
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  expect(page.url()).toContain('/login');
});

test('studio detail opens with full drill-in for super admin', async ({ page }) => {
  await authenticate(page, SUPER_ADMIN);
  await page.goto('/app/admin/companies/c-aroma');

  await expect(page.getByText('Karim Nasser')).toBeVisible();
  await expect(page.getByText('Ramadan TVC')).toBeVisible();
  await expect(page.getByText('Producer').first()).toBeVisible();
  await expect(page.getByText(/Yearly|سنوي/i)).toBeVisible();
});

test('studio admin creates a custom role with picked permissions', async ({ page }) => {
  await authenticate(page, AROMA_ADMIN);
  await page.goto('/app/admin/roles');

  await expect(page.locator('p.font-bold', { hasText: /^Producer/ }).first()).toBeVisible();
  await expect(page.locator('select').first()).toHaveCount(0);

  await page.getByRole('button', { name: /New role|مسمى جديد/i }).click();
  await page.getByPlaceholder(/Role name|اسم المسمى/i).fill('Colorist');
  await page.getByLabel(/Upload versions|رفع النسخ/i).check().catch(() => undefined);

  await page.getByRole('button', { name: /Save|حفظ/i }).last().click();
  await expect(page.locator('p.font-bold', { hasText: /^Colorist/ })).toBeVisible();
});

test('tenant isolation hides other studios data everywhere', async ({ page }) => {
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

test('role templates: apply industry template then save custom one', async ({ page }) => {
  await authenticate(page, AROMA_ADMIN);
  await page.goto('/app/admin/roles');

  await expect(page.getByText(/Role templates|تمبليتات المسميات/i)).toBeVisible();
  await expect(page.getByText('Commercial / TVC Production')).toBeVisible();
  await expect(page.getByText('Post-Production House')).toBeVisible();
  await expect(page.getByText('AROMA Signature Structure')).toBeVisible();

  await page.getByText('Film / Long-form').locator('../..').getByRole('button', { name: /Apply template|تطبيق التمبليت/i }).click();
  await page.getByRole('button', { name: /Apply template \(\d+\)|تطبيق التمبليت \(\d+\)/i }).last().click();
  await expect(page.getByText('Line Producer').first()).toBeVisible();

  await page.getByRole('button', { name: /Save current as template|احفظ الحالي كتمبليت/i }).click();
  await page.getByPlaceholder(/Template name|اسم التمبليت/i).fill('AROMA TVC v2');
  await page.getByRole('button', { name: /💾|Save|حفظ/i }).last().click();
  await expect(page.getByText('AROMA TVC v2')).toBeVisible();
});

test('studio admin invites a member without company selector and chooses custom role', async ({ page }) => {
  await authenticate(page, AROMA_ADMIN);
  await page.goto('/app/admin/members');

  await page.getByRole('button', { name: /Add member|إضافة عضو/i }).click();
  await expect(page.getByRole('heading', { name: /Add member|إضافة عضو/i })).toBeVisible();

  // Ensure company dropdown is not shown
  const selects = page.locator('dialog, [role="dialog"], div.fixed').locator('select');
  await expect(selects).toHaveCount(2); // Account type and project role; company remains scoped

  await page.getByPlaceholder(/Full name|الاسم/i).fill('Mona Zaki');
  await page.getByPlaceholder(/Email address|الايميل|البريد/i).fill('mona.zaki@aroma.studio');

  // Select custom role (e.g. Producer)
  await page.getByRole('dialog').getByRole('combobox', { name: /Role|الدور/i }).selectOption({ label: 'Producer' });

  await page.getByRole('button', { name: /Add member|إضافة عضو/i }).last().click();
  await expect(page.getByText('Mona Zaki', { exact: true })).toBeVisible();
});
