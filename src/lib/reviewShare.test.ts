import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('./supabase', () => ({
  supabase: { rpc },
}));

import {
  buildReviewShareUrl,
  createReviewShare,
  generateSixDigitCode,
  validateReviewShare,
} from './reviewShare';

describe('secure review sharing', () => {
  beforeEach(() => rpc.mockReset());

  it('generates a six digit passcode', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateSixDigitCode()).toMatch(/^\d{6}$/);
    }
  });

  it('builds an encoded public URL without putting the passcode in it', () => {
    expect(buildReviewShareUrl('project one', 'V/02', 'safe-token', 'https://review.example.com')).toBe(
      'https://review.example.com/review/project%20one/V%2F02?share=safe-token',
    );
  });

  it('creates the server-side token with a separate generated passcode', async () => {
    rpc.mockResolvedValue({
      data: [{ token: 'a'.repeat(48), expires_at: '2026-09-07T00:00:00.000Z' }],
      error: null,
    });

    const share = await createReviewShare('p-vodafone', 'V04', 7);

    expect(rpc).toHaveBeenCalledWith(
      'create_review_share_access',
      expect.objectContaining({
        p_project_key: 'p-vodafone',
        p_version_key: 'V04',
        p_ttl_days: 7,
        p_passcode: expect.stringMatching(/^\d{6}$/),
      }),
    );
    expect(share.url).toContain(`share=${'a'.repeat(48)}`);
    expect(share.url).not.toContain(share.code);
  });

  it('returns the server validation result', async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(validateReviewShare('a'.repeat(48), 'p-vodafone', 'V04', '123456')).resolves.toBe(true);
  });
});
