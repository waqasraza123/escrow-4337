import type { WorkspaceKind, WorkspaceSummary } from './api/types';

export type MarketplaceLane = WorkspaceKind;

export const marketplaceLanes = ['client', 'freelancer'] as const satisfies readonly MarketplaceLane[];

export function resolveMarketplaceLane(
  workspace?: Pick<WorkspaceSummary, 'kind'> | null,
): MarketplaceLane {
  return workspace?.kind === 'freelancer' ? 'freelancer' : 'client';
}

export function getMarketplaceLaneLabel(lane: MarketplaceLane) {
  return lane === 'freelancer' ? 'Freelancer' : 'Client';
}

export function canCreateOpportunity(
  workspace?: Pick<WorkspaceSummary, 'capabilities'> | null,
) {
  return Boolean(workspace?.capabilities.createOpportunity);
}

export function canApplyToOpportunity(
  workspace?: Pick<WorkspaceSummary, 'capabilities'> | null,
) {
  return Boolean(workspace?.capabilities.applyToOpportunity);
}
