const configuredWebUrl = import.meta.env.VITE_FREEFRAME_URL as string | undefined;
const configuredApiUrl = import.meta.env.VITE_FREEFRAME_API_URL as string | undefined;
const configuredEnabled = import.meta.env.VITE_ENABLE_FREEFRAME as string | undefined;

export const FREEFRAME_WEB_URL = (configuredWebUrl ?? 'http://localhost:3000').replace(/\/$/, '');
export const FREEFRAME_API_URL = (configuredApiUrl ?? 'http://localhost:8000').replace(/\/$/, '');

export const FREEFRAME_REVIEW_ENABLED = configuredEnabled === 'true' || (configuredEnabled !== 'false' && import.meta.env.DEV);

export function proReviewPath(projectId: string, version: string) {
  return `/studio/pro-review/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}`;
}

export function freeFrameLaunchUrl(projectId: string, version: string) {
  const url = new URL(FREEFRAME_WEB_URL);
  url.searchParams.set('augmentoriaProject', projectId);
  url.searchParams.set('augmentoriaVersion', version);
  return url.toString();
}

export async function checkFreeFrameHealth(signal?: AbortSignal) {
  const response = await fetch(`${FREEFRAME_API_URL}/health`, { signal });
  if (!response.ok) throw new Error(`FreeFrame API returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}
