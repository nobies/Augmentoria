const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/check-public-review.mjs <review-url>');
  process.exit(2);
}

const response = await fetch(target, { redirect: 'manual' });
const location = response.headers.get('location') ?? '';
const redirectHost = location ? new URL(location, target).hostname : '';
const redirectedToVercelLogin = redirectHost === 'vercel.com' || redirectHost.endsWith('.vercel.com');

if (redirectedToVercelLogin) {
  console.error('FAIL: public review redirects to Vercel registration');
  process.exit(1);
}

if (!response.ok) {
  console.error(`FAIL: public review returned HTTP ${response.status}`);
  process.exit(1);
}

console.log('PASS: public review opens without Vercel registration');
