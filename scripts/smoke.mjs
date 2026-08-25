import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const SHOTS = '.test-shots';
mkdirSync(SHOTS, { recursive: true });

const errors = [];

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      console.log(`launch ${channel} failed: ${e.message.split('\n')[0]}`);
    }
  }
  throw new Error('no chrome/edge found');
}

async function track(ctx, name) {
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] console: ${m.text().slice(0, 220)}`);
  });
  page.on('pageerror', (e) => errors.push(`[${name}] PAGEERROR: ${String(e.message).slice(0, 260)}`));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (!u.includes('google.com/s2') && !u.includes('clearbit')) errors.push(`[${name}] REQFAIL: ${u.slice(0, 120)}`);
  });
  return page;
}

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` }).catch(() => {});
}

async function visit(ctx, name, url, opts = {}) {
  const page = await track(ctx, name);
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(opts.settle ?? 1400);
    if (opts.act) await opts.act(page);
    await page.waitForTimeout(opts.wait ?? 900);
    await shot(page, name);
    const title = await page.title().catch(() => '');
    console.log(`OK   ${name} -> ${page.url().replace(BASE, '') || '/'}`);
    void title;
  } catch (e) {
    errors.push(`[${name}] VISIT FAIL: ${e.message.split('\n')[0]}`);
    await shot(page, `${name}-FAIL`).catch(() => {});
    console.log(`FAIL ${name}: ${e.message.split('\n')[0].slice(0, 140)}`);
  }
  await page.close();
  return page;
}

const browser = await launch();
console.log('browser launched');

// ---------- public ----------
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '01-landing', '/', { settle: 2500 });
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const p = await track(ctx, '02-login');
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await shot(p, '02-login');
  // quick login as Account Manager
  const amBtn = p.getByRole('button', { name: /Account Manager/i }).first();
  await amBtn.click();
  await p.waitForURL('**/app', { timeout: 6000 }).catch(() => errors.push('[login] did not navigate to /app'));
  await p.waitForTimeout(1600);
  await shot(p, '03-dashboard');
  console.log('OK   quick-login ->', p.url().replace(BASE, ''));

  // dashboard widgets sanity
  const statCards = await p.locator('.grid.grid-cols-2 > div').count();
  console.log('INFO dashboard stat cards:', statCards);

  // projects list
  await p.goto(`${BASE}/app/projects`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1300);
  await shot(p, '04-projects');
  const rows = await p.locator('tbody tr').count();
  console.log('INFO project rows:', rows);

  // project detail + tabs
  await p.goto(`${BASE}/app/projects/p-vodafone`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await shot(p, '05-project-overview');
  for (const tabName of ['Versions', 'Sessions', 'Team', 'Assets']) {
    const tab = p.getByRole('button', { name: new RegExp(tabName, 'i') }).first();
    if (await tab.count()) {
      await tab.click();
      await p.waitForTimeout(700);
      await shot(p, `05-project-${tabName.toLowerCase()}`);
      console.log('OK   tab', tabName);
    } else {
      console.log('MISS tab', tabName);
    }
  }

  // assets upload via setInputFiles
  const assetsTab = p.getByRole('button', { name: /^Assets$/i }).first();
  if (await assetsTab.count()) {
    await assetsTab.click();
    await p.waitForTimeout(500);
    const input = p.locator('input[type=file]').first();
    await input.setInputFiles({
      name: 'shot-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEKmBhQAQwAAfYEAH6YvUQAAAAASUVORK5CYII=',
        'base64'
      )
    });
    await p.waitForTimeout(900);
    const cards = await p.locator('text=shot-test.png').count();
    console.log(cards > 0 ? 'OK   asset uploaded & listed' : 'FAIL asset not listed after upload');
    if (cards > 0) {
      await p.locator('text=shot-test.png').first().click();
      await p.waitForTimeout(600);
      await shot(p, '06-asset-details');
      const noteBox = p.locator('textarea').first();
      if (await noteBox.count()) {
        await noteBox.fill('Test reference frame');
        await p.getByRole('button', { name: /Save/i }).first().click();
        await p.waitForTimeout(500);
        console.log('OK   asset note saved');
      }
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
    }
  }

  // new version with carry-forward
  await p.getByRole('button', { name: /^Versions$/i }).first().click();
  await p.waitForTimeout(600);
  const newVerBtn = p.getByRole('button', { name: /New version/i }).first();
  if (await newVerBtn.count()) {
    await newVerBtn.click();
    await p.waitForTimeout(600);
    await shot(p, '07-new-version-modal');
    await p.getByRole('button', { name: /Create/i }).first().click();
    await p.waitForTimeout(1800);
    console.log('OK   new version ->', p.url().replace(BASE, ''));
    await shot(p, '08-review-new-version');
  }

  await p.close();
}

// ---------- review workspace interactions ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const p = await track(ctx, '09-review');
  await p.goto(`${BASE}/studio/review/p-vodafone/V04`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await shot(p, '09-review-initial');

  const videoBox = p.locator('main .relative.min-h-0.flex-1').last();
  const box = await videoBox.boundingBox();

  // pick pen tool
  await p.locator('button[title*="pen" i], button[title*="Pen" i]').first().click();
  await p.waitForTimeout(300);

  if (box) {
    const x = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.4;
    await p.mouse.move(x, y);
    await p.mouse.down();
    for (let i = 1; i <= 12; i++) await p.mouse.move(x + i * 14, y + Math.sin(i) * 26);
    await p.mouse.up();
    await p.waitForTimeout(400);
    await shot(p, '10-review-drew-pen');
    const layersPanel = await p.locator('text=Layers (').count();
    console.log(layersPanel > 0 ? 'OK   layers panel appeared' : 'FAIL no layers panel after drawing');
  }

  // draw circle too
  await p.locator('button[title*="Circle" i], button[title*="circle" i]').first().click();
  if (box) {
    const cx = box.x + box.width * 0.55;
    const cy = box.y + box.height * 0.45;
    await p.mouse.move(cx - 40, cy - 30);
    await p.mouse.down();
    await p.mouse.move(cx + 50, cy + 40, { steps: 5 });
    await p.mouse.up();
    await p.waitForTimeout(300);
  }

  // composer should show attached chips
  const chips = await p.locator('text=/Attached layers/i').count();
  console.log(chips > 0 ? 'OK   attached layers chips visible in composer' : 'FAIL composer missing attached layers chips');

  await p.fill('#rv-composer-text', 'Automated test comment — please fix logo size');
  await shot(p, '11-review-composer-filled');
  await p.getByRole('button', { name: /Post/i }).first().click();
  await p.waitForTimeout(800);
  const posted = await p.locator('text=Automated test comment').count();
  console.log(posted > 0 ? 'OK   comment posted & listed' : 'FAIL comment not listed after post');
  await shot(p, '12-review-posted');

  // range flow
  await p.getByRole('button', { name: /Range/i }).first().click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: /OUT/i }).first().click();
  await p.waitForTimeout(200);
  await p.fill('#rv-composer-text', 'Range check music loud');
  await p.getByRole('button', { name: /Post/i }).first().click();
  await p.waitForTimeout(700);
  const rangePosted = await p.locator('text=Range check music loud').count();
  console.log(rangePosted > 0 ? 'OK   range comment posted' : 'FAIL range comment failed');
  await shot(p, '13-review-range');

  // export menu exists
  await p.getByRole('button', { name: /Export/i }).first().click();
  await p.waitForTimeout(300);
  await shot(p, '14-export-menu');
  await p.keyboard.press('Escape');

  // guest link
  const g = await track(ctx, '15-guest-review');
  await g.goto(`${BASE}/review/p-vodafone/V04`, { waitUntil: 'domcontentloaded' });
  await g.waitForTimeout(2000);
  await shot(g, '15-guest-review');
  console.log('OK   guest review loaded');

  await ctx.close();
}

// ---------- compare / reports / admin / clients ----------
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '16-reviews-list', '/app/reviews', { settle: 1600 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '17-compare', '/studio/compare/p-vodafone/V03/V04', { settle: 2200 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '18-reports-list', '/app/reports', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '19-report-view', '/app/reports/p-vodafone/V04', { settle: 1600 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '20-clients', '/app/clients', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '21-client-detail', '/app/clients/cl-vodafone', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '22-admin-members', '/app/admin/members', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '23-admin-companies', '/app/admin/companies', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 1440, height: 860 } }), '24-settings', '/app/settings', { settle: 1400 });
await visit(await browser.newContext({ viewport: { width: 390, height: 780 } }), '25-mobile-dashboard', '/app', { settle: 1700 });
await visit(await browser.newContext({ viewport: { width: 390, height: 780 } }), '26-mobile-review', '/studio/review/p-vodafone/V04', { settle: 2300 });

await browser.close();

console.log('\n===== ERROR SUMMARY =====');
if (errors.length === 0) console.log('CLEAN — no console/page/request errors captured');
else {
  const uniq = [...new Set(errors)];
  uniq.slice(0, 40).forEach((e) => console.log(e));
  console.log(`total unique: ${uniq.length} (raw ${errors.length})`);
  writeFileSync(`${SHOTS}/errors.txt`, uniq.join('\n'));
}
