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

  it('records approval decisions and updates both version and current project status', async () => {
    const { actions, getAppState } = await import('./store');

    const changeRequest = actions.recordApproval('p-vodafone', 'V04', 'u-sh', 'changes', 'Shorten the end card.');
    expect(changeRequest).toEqual(expect.objectContaining({ decision: 'changes', note: 'Shorten the end card.' }));
    expect(getAppState().projects.find((project) => project.id === 'p-vodafone')).toEqual(
      expect.objectContaining({
        status: 'changes',
        versions: expect.arrayContaining([expect.objectContaining({ v: 'V04', status: 'changes' })])
      })
    );

    actions.recordApproval('p-vodafone', 'V04', 'u-sh', 'approved', 'Ready to publish.');
    const project = getAppState().projects.find((item) => item.id === 'p-vodafone');
    expect(project?.status).toBe('approved');
    expect(project?.activity[0].textEn).toContain('approved');
    expect(getAppState().approvals.filter((item) => item.projectId === 'p-vodafone' && item.version === 'V04')).toHaveLength(2);
  });

  it('tracks live-session control requests, transfer, and completion', async () => {
    const { actions, getAppState } = await import('./store');
    const session = actions.startSession('p-flynas', 'V02', 'u-mw');

    actions.requestSessionControl(session.id, 'u-sh');
    expect(getAppState().sessions.find((item) => item.id === session.id)?.controlRequests).toContain('u-sh');

    actions.takeSessionControl(session.id, 'u-sh');
    const transferred = getAppState().sessions.find((item) => item.id === session.id);
    expect(transferred?.hostId).toBe('u-sh');
    expect(transferred?.controlRequests).not.toContain('u-sh');

    actions.endSession(session.id);
    expect(getAppState().sessions.find((item) => item.id === session.id)?.endedAt).toBeTruthy();
  });
});
