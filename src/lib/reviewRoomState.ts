import type { AppState } from './store';

export interface ReviewRoomScope { projectId: string; version: string }

export function selectReviewRoomState(state: AppState, scope: ReviewRoomScope): AppState {
  const matches = (item: { projectId: string; version: string }) =>
    item.projectId === scope.projectId && item.version === scope.version;
  const comments = state.comments.filter(matches);
  const commentIds = new Set(comments.map((item) => item.id));
  // Realtime is a review-data transport, never an identity or admin transport.
  // Draft layers, unrelated projects, contacts, roles and audit records stay local.
  return {
    companies: [], clients: [], members: [], projectMemberships: [],
    projects: state.projects.filter((project) => project.id === scope.projectId).map((project) => ({
      ...project, memberIds: [], activity: [],
      versions: project.versions.filter((version) => version.v === scope.version),
    })),
    comments,
    layers: state.layers.filter((layer) => commentIds.has(layer.commentId)),
    sessions: state.sessions.filter(matches),
    approvals: state.approvals.filter(matches),
    notifications: [], trash: [], customRoles: [], roleTemplates: [], auditLog: [],
  };
}

export function mergeReviewRoomState(current: AppState, incoming: AppState, scope: ReviewRoomScope): AppState {
  const localProject = current.projects.find((project) => project.id === scope.projectId);
  const remoteProject = incoming.projects?.find((project) => project.id === scope.projectId);
  if (!localProject || !remoteProject || localProject.companyId !== remoteProject.companyId) return current;
  if (!Array.isArray(incoming.comments) || !Array.isArray(incoming.layers) ||
      !Array.isArray(incoming.sessions) || !Array.isArray(incoming.approvals)) return current;
  const matches = (item: { projectId: string; version: string }) =>
    item.projectId === scope.projectId && item.version === scope.version;
  const comments = incoming.comments.filter(matches);
  const oldIds = new Set(current.comments.filter(matches).map((comment) => comment.id));
  const newIds = new Set(comments.map((comment) => comment.id));
  return {
    ...current,
    comments: [...current.comments.filter((item) => !matches(item)), ...comments],
    layers: [
      ...current.layers.filter((layer) => !oldIds.has(layer.commentId) && !newIds.has(layer.commentId)),
      ...incoming.layers.filter((layer) => newIds.has(layer.commentId)),
    ],
    sessions: [...current.sessions.filter((item) => !matches(item)), ...incoming.sessions.filter(matches)],
    approvals: [...current.approvals.filter((item) => !matches(item)), ...incoming.approvals.filter(matches)],
    projects: current.projects.map((project) => {
      if (project.id !== scope.projectId) return project;
      const decision = incoming.approvals.filter(matches).at(0);
      const status = decision?.decision ?? project.versions.find((version) => version.v === scope.version)?.status;
      return {
        ...project,
        status: scope.version === project.currentVersion && status ? status : project.status,
        versions: project.versions.map((version) => version.v !== scope.version ? version : {
          ...version,
          status: status ?? version.status,
          open: comments.filter((comment) => !comment.resolved).length,
          resolved: comments.filter((comment) => comment.resolved).length,
        }),
      };
    }),
  };
}
