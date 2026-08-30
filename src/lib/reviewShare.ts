import { supabase } from './supabase';

export type ReviewShare = {
  url: string;
  code: string;
  expiresAt: string;
};

type CreatedShareRow = {
  token: string;
  expires_at: string;
};

export function generateSixDigitCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(100_000 + (random % 900_000));
}

export function buildReviewShareUrl(
  projectKey: string,
  versionKey: string,
  token: string,
  baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin,
) {
  const url = new URL(
    `/review/${encodeURIComponent(projectKey)}/${encodeURIComponent(versionKey)}`,
    baseUrl,
  );
  url.searchParams.set('share', token);
  return url.toString();
}

export async function createReviewShare(
  projectKey: string,
  versionKey: string,
  ttlDays = 7,
): Promise<ReviewShare> {
  if (!supabase) throw new Error('Secure sharing is not configured.');

  const code = generateSixDigitCode();
  const { data, error } = await supabase.rpc('create_review_share_access', {
    p_project_key: projectKey,
    p_version_key: versionKey,
    p_passcode: code,
    p_ttl_days: ttlDays,
  });

  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as CreatedShareRow | null;
  if (!row?.token || !row.expires_at) throw new Error('The secure share link was not created.');

  return {
    url: buildReviewShareUrl(projectKey, versionKey, row.token),
    code,
    expiresAt: row.expires_at,
  };
}

export async function validateReviewShare(
  token: string,
  projectKey: string,
  versionKey: string,
  passcode: string,
) {
  if (!supabase) throw new Error('Secure sharing is not configured.');

  const { data, error } = await supabase.rpc('validate_review_share_access', {
    p_token: token,
    p_project_key: projectKey,
    p_version_key: versionKey,
    p_passcode: passcode,
  });

  if (error) throw error;
  return data === true;
}
