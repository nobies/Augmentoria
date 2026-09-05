import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeReviewRoomState, selectReviewRoomState } from './reviewRoomState';

describe('review room boundaries', () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); });

  it('sends only one version and no identity, permission or other tenant data', async () => {
    const { getAppState } = await import('./store');
    const selected = selectReviewRoomState(getAppState(), { projectId: 'p-vodafone', version: 'V04' });
    expect(selected.projects.map((project) => project.id)).toEqual(['p-vodafone']);
    expect(selected.projects[0].versions.map((version) => version.v)).toEqual(['V04']);
    expect(selected.members).toEqual([]);
    expect(selected.companies).toEqual([]);
    expect(selected.customRoles).toEqual([]);
    expect(selected.layers.every((layer) => selected.comments.some((comment) => comment.id === layer.commentId))).toBe(true);
    expect(JSON.stringify(selected)).not.toContain('c-socializr');
  });

  it('cannot replace roles, other projects or another version through a room snapshot', async () => {
    const { getAppState } = await import('./store');
    const state = getAppState();
    const incoming = structuredClone(state);
    incoming.members[0].name = 'Unauthorized overwrite';
    incoming.projects.find((project) => project.id === 'p-instamart')!.name = 'Unauthorized project';
    incoming.comments = incoming.comments.map((comment) => ({ ...comment, text: 'Updated review' }));
    const merged = mergeReviewRoomState(state, incoming, { projectId: 'p-vodafone', version: 'V04' });
    expect(merged.members).toBe(state.members);
    expect(merged.projectMemberships).toBe(state.projectMemberships);
    expect(merged.projects.find((project) => project.id === 'p-instamart')).toEqual(state.projects.find((project) => project.id === 'p-instamart'));
    expect(merged.comments.filter((comment) => comment.projectId === 'p-vodafone' && comment.version === 'V04').every((comment) => comment.text === 'Updated review')).toBe(true);
  });

  it('rejects a snapshot claiming the project belongs to a different company', async () => {
    const { getAppState } = await import('./store');
    const state = getAppState();
    const incoming = structuredClone(state);
    incoming.projects.find((project) => project.id === 'p-vodafone')!.companyId = 'c-socializr';
    expect(mergeReviewRoomState(state, incoming, { projectId: 'p-vodafone', version: 'V04' })).toBe(state);
  });
});
