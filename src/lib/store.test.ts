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
    expect(JSON.parse(localStorage.getItem('augmentoria-state-v2') ?? '{}').projects).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: project.id, name: 'Regression Project' })])
    );
  });

  it('carries open comments forward without removing them from the old version', async () => {
    const { actions, getAppState } = await import('./store');
    const oldOpen = getAppState().comments.filter(
      (comment) => comment.projectId === 'p-vodafone' && comment.version === 'V04' && !comment.resolved
    );

    const result = actions.addVersion('p-vodafone', { carryOpen: true }, 'u-mw');

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
    const session = actions.startSession('p-vodafone', 'V04', 'u-mw');
    expect(session).not.toBeNull();
    if (!session) throw new Error('session was not created');

    actions.requestSessionControl(session.id, 'u-sh');
    expect(getAppState().sessions.find((item) => item.id === session.id)?.controlRequests).toContain('u-sh');

    expect(actions.takeSessionControl(session.id, 'u-sh', 'u-ae')).toBe(false);
    expect(getAppState().sessions.find((item) => item.id === session.id)?.hostId).toBe('u-mw');

    actions.takeSessionControl(session.id, 'u-sh', 'u-mw');
    const transferred = getAppState().sessions.find((item) => item.id === session.id);
    expect(transferred?.hostId).toBe('u-sh');
    expect(transferred?.controlRequests).not.toContain('u-sh');

    actions.endSession(session.id, 'u-sh');
    expect(getAppState().sessions.find((item) => item.id === session.id)?.endedAt).toBeTruthy();
  });

  it('scopes visible projects by company tenancy and client membership', async () => {
    const { getAppState, visibleProjects, visibleClients } = await import('./store');

    const superView = visibleProjects(getAppState(), { id: 'u-sa', roleId: 'super_admin' });
    expect(superView.length).toBe(getAppState().projects.length);

    const aromaView = visibleProjects(getAppState(), { id: 'u-mw', roleId: 'am', companyId: 'c-aroma' });
    expect(aromaView.every((p) => p.companyId === 'c-aroma')).toBe(true);

    const socializrView = visibleProjects(getAppState(), { id: 'u-ns', roleId: 'company_admin', companyId: 'c-socializr' });
    expect(socializrView.map((p) => p.id)).toEqual(['p-instamart']);

    const clientView = visibleProjects(getAppState(), { id: 'u-sh', roleId: 'client', companyId: 'c-aroma' });
    expect(clientView.map((p) => p.id).sort()).toEqual(['p-neom', 'p-rta', 'p-vodafone']);

    expect(visibleClients(getAppState(), { id: 'u-ns', roleId: 'company_admin', companyId: 'c-socializr' }).map((c) => c.id)).toEqual(['cl-instamart']);
  });

  it('rejects cross-company resource access and mutations', async () => {
    const { actions, getAppState, projectInUserScope } = await import('./store');
    const vodafone = getAppState().projects.find((project) => project.id === 'p-vodafone')!;

    expect(projectInUserScope(getAppState(), { id: 'u-ns', roleId: 'company_admin', companyId: 'c-socializr' }, vodafone)).toBe(false);
    expect(actions.addTeamMember(vodafone.id, 'u-ns', undefined, 'u-mw')).toBe(false);
    expect(getAppState().projects.find((project) => project.id === vodafone.id)?.memberIds).not.toContain('u-ns');
    expect(actions.updateProject(vodafone.id, { clientId: 'cl-instamart' }, 'u-mw')).toBe(false);
    expect(() => actions.addProject({ name: 'Leaked project', client: 'InstaMart', clientId: 'cl-instamart', due: '2026-10-01', creatorId: 'u-mw' })).toThrow();
  });

  it('deletes a comment into trash and restores it with its layers', async () => {
    const { actions, getAppState } = await import('./store');
    const layersBefore = getAppState().layers.filter((l) => l.commentId === 'cm-1').length;
    const commentsBefore = getAppState().comments.length;

    const entryId = actions.deleteComment('cm-1', 'u-mw');
    expect(entryId).toBeTruthy();
    expect(getAppState().comments.length).toBe(commentsBefore - 1);

    expect(actions.restoreFromTrash(entryId!, 'u-mw')).toBe(true);
    expect(getAppState().comments.length).toBe(commentsBefore);
    expect(getAppState().layers.filter((l) => l.commentId === 'cm-1').length).toBe(layersBefore);
  });

  it('removes a member into trash and restores their project memberships', async () => {
    const { actions, getAppState } = await import('./store');

    const entryId = actions.removeMember('u-ae', 'u-ca');
    expect(entryId).toBeTruthy();
    expect(getAppState().members.some((m) => m.id === 'u-ae')).toBe(false);
    expect(getAppState().projects.find((p) => p.id === 'p-vodafone')?.memberIds).not.toContain('u-ae');

    expect(actions.restoreFromTrash(entryId!, 'u-ca')).toBe(true);
    expect(getAppState().members.some((m) => m.id === 'u-ae')).toBe(true);
    expect(getAppState().projects.find((p) => p.id === 'p-vodafone')?.memberIds).toContain('u-ae');
  });

  it('parses mentions and stores them on new comments', async () => {
    const { actions, getAppState, parseMentions } = await import('./store');
    const team = getAppState().members.map((m) => ({ id: m.id, name: m.name }));

    expect(parseMentions('@Mohamed Wageeh please check this', team)).toContain('u-mw');
    expect(parseMentions('no mention here', team)).toEqual([]);

    const rec = actions.addComment({
      projectId: 'p-vodafone',
      version: 'V04',
      authorId: 'u-sh',
      kind: 'frame',
      tc: 3,
      text: '@Mohamed Wageeh take a look',
      mentions: parseMentions('@Mohamed Wageeh take a look', team)
    });
    expect(rec.mentions).toEqual(['u-mw']);
  });

  it('creates mention and reply notifications for other users', async () => {
    const { actions, getAppState } = await import('./store');

    const comment = actions.addComment({
      projectId: 'p-vodafone',
      version: 'V04',
      authorId: 'u-mw',
      kind: 'frame',
      tc: 5,
      text: 'hello',
      mentions: ['u-sh']
    });
    let notifications = getAppState().notifications;
    expect(notifications[0]).toEqual(expect.objectContaining({ userId: 'u-sh', kind: 'mention', commentId: comment.id, read: false }));

    actions.addReply(comment.id, 'u-ae', 'done', []);
    notifications = getAppState().notifications;
    expect(notifications[0]).toEqual(expect.objectContaining({ userId: 'u-mw', kind: 'reply' }));

    const unreadForSh = notifications.filter((n) => n.userId === 'u-sh' && !n.read);
    actions.markAllNotificationsRead('u-sh');
    expect(getAppState().notifications.filter((n) => n.userId === 'u-sh' && !n.read)).toHaveLength(0);
    expect(unreadForSh.length).toBeGreaterThan(0);
  });

  it('applies template milestones when creating a project', async () => {
    const { actions, getAppState } = await import('./store');

    const project = actions.addProject({
      name: 'Template Project',
      client: 'NEOM',
      clientId: 'cl-neom',
      due: '2026-10-01',
      creatorId: 'u-mw',
      templateId: 'brand'
    });
    const stored = getAppState().projects.find((p) => p.id === project.id);
    expect(stored?.templateId).toBe('brand');
    expect(stored?.companyId).toBe('c-aroma');
    expect(stored?.milestones?.map((m) => m.key)).toEqual(['brief', 'script', 'production', 'edit', 'review', 'delivery']);

    actions.toggleMilestone(project.id, 'brief', 'u-mw');
    expect(getAppState().projects.find((p) => p.id === project.id)?.milestones?.find((m) => m.key === 'brief')?.done).toBe(true);
  });

  it('supports custom roles end to end', async () => {
    const { actions, getAppState, memberEffectivePerms } = await import('./store');
    expect(getAppState().customRoles.some((r) => r.name === 'Producer')).toBe(true);

    const role = actions.addCustomRole({ companyId: 'c-aroma', name: 'Colorist', perms: ['versions.upload', 'reviews.comment'] }, 'u-ca')!;
    const member = actions.addMember({ name: 'Test Colorist', email: 'color@test.app', companyId: 'c-aroma', roleId: 'designer', customRoleId: role.id }, 'u-ca')!;

    const perms = memberEffectivePerms(getAppState().members.find((m) => m.id === member.id), getAppState().customRoles);
    expect(perms.has('reviews.annotate')).toBe(false);
    expect(perms.has('versions.upload')).toBe(true);

    expect(actions.removeCustomRole(role.id, 'u-ca')).toBe(false);
    actions.removeMember(member.id, 'u-ca');
    expect(actions.removeCustomRole(role.id, 'u-ca')).toBe(true);
  });

  it('applies an industry template creating roles with hierarchy and skipping duplicates', async () => {
    const { actions, getAppState, BUILTIN_ROLE_TEMPLATES } = await import('./store');
    const tpl = BUILTIN_ROLE_TEMPLATES.find((t) => t.id === 'rtt-commercial')!;

    const res = actions.applyRoleTemplate(tpl, 'c-socializr', 'u-ns');
    expect(res.created).toBe(tpl.roles.length);
    expect(res.skipped).toBe(0);

    const created = getAppState().customRoles.filter((r) => r.companyId === 'c-socializr' && !['Senior Editor', 'Team Lead'].includes(r.name));
    const producer = created.find((r) => r.name === 'Producer');
    const ep = created.find((r) => r.name === 'Executive Producer');
    const coordinator = created.find((r) => r.name === 'Production Coordinator');
    expect(producer?.parentId).toBe(ep?.id);
    expect(coordinator?.parentId).toBe(producer?.id);
    expect(ep?.perms).toContain('approvals.grant');

    const secondPass = actions.applyRoleTemplate(tpl, 'c-socializr', 'u-ns');
    expect(secondPass.created).toBe(0);
    expect(secondPass.skipped).toBe(tpl.roles.length);
  });

  it('saves edits and removes studio-private role templates', async () => {
    const { actions, getAppState } = await import('./store');
    expect(getAppState().roleTemplates.some((t) => t.name === 'AROMA Signature Structure')).toBe(true);

    const saved = actions.saveRoleTemplate({
      companyId: 'c-socializr',
      name: 'Socializr Sprint Team',
      description: 'test',
      roles: [{ key: 'k1', name: 'Sprint Lead', perms: ['projects.edit', 'reviews.comment'] }]
    }, 'u-ns')!;

    actions.updateRoleTemplate(saved.id, { name: 'Sprint Team v2' }, 'u-ns');
    expect(getAppState().roleTemplates.find((t) => t.id === saved.id)?.name).toBe('Sprint Team v2');

    actions.removeRoleTemplate(saved.id, 'u-ns');
    expect(getAppState().roleTemplates.some((t) => t.id === saved.id)).toBe(false);
  });

  it('allows customizing a builtin role template and saving independently for a company', async () => {
    const { actions, getAppState, BUILTIN_ROLE_TEMPLATES } = await import('./store');
    const builtin = BUILTIN_ROLE_TEMPLATES[0];
    expect(builtin).toBeDefined();

    const cloned = actions.saveRoleTemplate({
      companyId: 'c-aroma',
      name: `${builtin.name} (AROMA Custom)`,
      description: 'Customized from TVC template',
      roles: builtin.roles.map((r) => ({ ...r, perms: [...r.perms] })).filter((r) => r.key !== 'colorist')
    }, 'u-ca')!;

    expect(cloned.id).toMatch(/^rt-/);
    expect(cloned.name).toBe('Commercial / TVC Production (AROMA Custom)');
    expect(cloned.roles.some((r) => r.key === 'colorist')).toBe(false);
    expect(getAppState().roleTemplates.some((t) => t.id === cloned.id)).toBe(true);

    // Verify original builtin is untouched
    expect(builtin.roles.some((r) => r.key === 'colorist')).toBe(true);
  });

  it('keeps assigned-only projects hidden until an explicit project membership exists', async () => {
    const { actions, getAppState, projectInUserScope } = await import('./store');
    const target = getAppState().members.find((member) => member.id === 'u-ae')!;
    const project = actions.addProject({
      name: 'Private Production',
      client: 'Vodafone',
      clientId: 'cl-vodafone',
      due: '2026-10-10',
      creatorId: 'u-mw'
    });
    const sessionUser = { id: target.id, roleId: target.roleId, companyId: target.companyId };

    expect(project.accessPolicy).toBe('assigned');
    expect(projectInUserScope(getAppState(), sessionUser, project)).toBe(false);
    expect(actions.addTeamMember(project.id, target.id, 'reviewer', 'u-mw')).toBe(true);
    expect(projectInUserScope(getAppState(), sessionUser, project)).toBe(true);
    expect(getAppState().projectMemberships.find((item) => item.projectId === project.id && item.userId === target.id)).toEqual(
      expect.objectContaining({ role: 'reviewer', accessLevel: 'review' })
    );
  });

  it('scopes external custom-role accounts by membership instead of their inherited permissions', async () => {
    const { actions, getAppState, projectInUserScope } = await import('./store');
    const role = actions.addCustomRole({ companyId: 'c-aroma', name: 'External Producer', perms: ['projects.edit', 'reviews.comment'] }, 'u-ca')!;
    const member = actions.addMember({
      name: 'External Producer',
      email: 'external@test.app',
      companyId: 'c-aroma',
      roleId: 'client',
      accountType: 'client',
      customRoleId: role.id
    }, 'u-ca')!;
    const project = getAppState().projects.find((item) => item.id === 'p-flynas')!;
    const sessionUser = { id: member.id, roleId: member.roleId, companyId: member.companyId, accountType: member.accountType };

    expect(projectInUserScope(getAppState(), sessionUser, project)).toBe(false);
    expect(actions.addTeamMember(project.id, member.id, 'reviewer', 'u-mw')).toBe(true);
    expect(projectInUserScope(getAppState(), sessionUser, project)).toBe(true);
  });

  it('blocks cross-company admin mutations and cyclic custom-role hierarchies', async () => {
    const { actions, getAppState } = await import('./store');
    const originalName = getAppState().projects.find((project) => project.id === 'p-vodafone')?.name;

    expect(actions.updateProject('p-vodafone', { name: 'Compromised' }, 'u-ns')).toBe(false);
    expect(getAppState().projects.find((project) => project.id === 'p-vodafone')?.name).toBe(originalName);
    expect(actions.setMemberStatus('u-ae', 'suspended', 'u-ns')).toBe(false);

    const parent = actions.addCustomRole({ companyId: 'c-aroma', name: 'Cycle Parent', perms: [] }, 'u-ca')!;
    const child = actions.addCustomRole({ companyId: 'c-aroma', name: 'Cycle Child', perms: [], parentId: parent.id }, 'u-ca')!;
    expect(actions.updateCustomRole(parent.id, { parentId: child.id }, 'u-ca')).toBe(false);
    expect(getAppState().customRoles.find((role) => role.id === parent.id)?.parentId).toBeUndefined();
  });

  it('cascades project deletion and restores exact project-role assignments for removed members', async () => {
    const { actions, getAppState } = await import('./store');
    expect(actions.updateProjectMembership('p-vodafone', 'u-ae', 'reviewer', 'u-ca')).toBe(true);
    const entryId = actions.removeMember('u-ae', 'u-ca')!;
    expect(actions.restoreFromTrash(entryId, 'u-ca')).toBe(true);
    expect(getAppState().projectMemberships.find((item) => item.projectId === 'p-vodafone' && item.userId === 'u-ae')?.role).toBe('reviewer');

    actions.startSession('p-vodafone', 'V04', 'u-mw');
    actions.recordApproval('p-vodafone', 'V04', 'u-sh', 'approved', 'done');
    const commentIds = getAppState().comments.filter((comment) => comment.projectId === 'p-vodafone').map((comment) => comment.id);
    expect(actions.deleteProject('p-vodafone', 'u-mw')).toBe(true);
    const after = getAppState();
    expect(after.projects.some((project) => project.id === 'p-vodafone')).toBe(false);
    expect(after.comments.some((comment) => comment.projectId === 'p-vodafone')).toBe(false);
    expect(after.layers.some((layer) => commentIds.includes(layer.commentId))).toBe(false);
    expect(after.sessions.some((session) => session.projectId === 'p-vodafone')).toBe(false);
    expect(after.approvals.some((approval) => approval.projectId === 'p-vodafone')).toBe(false);
    expect(after.projectMemberships.some((membership) => membership.projectId === 'p-vodafone')).toBe(false);
  });

  it('does not persist large review thumbnails inside localStorage state', async () => {
    const { actions } = await import('./store');
    const marker = 'data:image/jpeg;base64,very-large-frame';
    actions.addComment({
      projectId: 'p-vodafone',
      version: 'V04',
      authorId: 'u-mw',
      kind: 'frame',
      tc: 1,
      text: '',
      cleanThumb: marker,
      thumb: marker
    });
    expect(localStorage.getItem('augmentoria-state-v2')).not.toContain(marker);
  });
});
