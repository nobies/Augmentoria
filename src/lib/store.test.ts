import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('prototype store safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('persists a newly created project', async () => {
    const { actions, getAppState } = await import('./store');
    const before = getAppState().projects.length;

    const project = actions.addProject({
      name: 'Regression Project',
      client: 'Vodafone',
      clientId: 'cl-vodafone',
      due: '2026-09-30',
      creatorId: 'u-mw'
    });

    expect(getAppState().projects).toHaveLength(before + 1);
    expect(getAppState().projects[0].id).toBe(project.id);
    expect(JSON.parse(localStorage.getItem('augmentoria-state-v1') ?? '{}').projects).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: project.id, name: 'Regression Project' })])
    );
  });

  it('carries open comments forward without removing them from the old version', async () => {
    const { actions, getAppState } = await import('./store');
    const oldOpen = getAppState().comments.filter(
      (comment) => comment.projectId === 'p-vodafone' && comment.version === 'V04' && !comment.resolved
    );

    const result = actions.addVersion('p-vodafone', { carryOpen: true });

    expect(result?.version).toBe('V05');
    expect(getAppState().projects.find((project) => project.id === 'p-vodafone')?.versions[0].v).toBe('V05');
    expect(
      getAppState().comments.filter(
        (comment) => comment.projectId === 'p-vodafone' && comment.version === 'V04' && !comment.resolved
      )
    ).toHaveLength(oldOpen.length);
    expect(
      getAppState().comments.filter(
        (comment) => comment.projectId === 'p-vodafone' && comment.version === 'V05' && !comment.resolved
      )
    ).toHaveLength(oldOpen.length);

    const sourceWithLayer = oldOpen.find((comment) =>
      getAppState().layers.some((layer) => layer.commentId === comment.id)
    );
    const copiedComment = getAppState().comments.find(
      (comment) => comment.version === 'V05' && comment.originCommentId === sourceWithLayer?.id
    );
    expect(copiedComment).toBeDefined();
    expect(getAppState().layers.some((layer) => layer.commentId === copiedComment?.id)).toBe(true);
  });
});
