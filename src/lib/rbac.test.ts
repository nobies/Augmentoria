import { describe, expect, it } from 'vitest';
import { effectivePerms } from './rbac';

describe('effectivePerms', () => {
  it('keeps client permissions limited to review and approval work', () => {
    const perms = effectivePerms('client');

    expect(perms.has('reviews.comment')).toBe(true);
    expect(perms.has('reviews.annotate')).toBe(true);
    expect(perms.has('approvals.grant')).toBe(true);
    expect(perms.has('projects.edit')).toBe(false);
    expect(perms.has('companies.manage')).toBe(false);
  });

  it('adds an explicit extra permission without removing the role defaults', () => {
    const perms = effectivePerms('designer', ['reports.export']);

    expect(perms.has('versions.upload')).toBe(true);
    expect(perms.has('reports.export')).toBe(true);
  });
});
