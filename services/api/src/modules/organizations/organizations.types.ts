export type OrganizationKind = 'personal' | 'client';
export type WorkspaceKind = 'client' | 'freelancer';
export type OrganizationRole =
  | 'client_owner'
  | 'client_recruiter'
  | 'freelancer'
  | 'operator'
  | 'moderator';
export type OrganizationMembershipStatus = 'active';
export type WorkspaceCapabilityName =
  | 'manageProfile'
  | 'applyToOpportunity'
  | 'createOpportunity'
  | 'reviewApplications'
  | 'manageWorkspace';

export type OrganizationRecord = {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
};

export type OrganizationMembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceRecord = {
  id: string;
  organizationId: string;
  kind: WorkspaceKind;
  label: string;
  slug: string;
  defaultForUserId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceCapabilities = Record<WorkspaceCapabilityName, boolean>;

export type WorkspaceSummary = {
  workspaceId: string;
  kind: WorkspaceKind;
  label: string;
  slug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  roles: OrganizationRole[];
  capabilities: WorkspaceCapabilities;
  isDefault: boolean;
};

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  roles: OrganizationRole[];
  workspaces: WorkspaceSummary[];
};

export type OrganizationMembershipView = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  workspaceIds: string[];
};

export type RoleCapabilitiesResponse = {
  activeWorkspace: WorkspaceSummary | null;
  workspaceRoles: Record<
    WorkspaceKind,
    {
      roles: OrganizationRole[];
      capabilities: WorkspaceCapabilities;
    }
  >;
};

export type OrganizationsListResponse = {
  organizations: OrganizationSummary[];
};

export type OrganizationResponse = {
  organization: OrganizationSummary;
};

export type MembershipsListResponse = {
  memberships: OrganizationMembershipView[];
};

export type WorkspaceSelectionResponse = {
  activeWorkspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
};

export function createEmptyWorkspaceCapabilities(): WorkspaceCapabilities {
  return {
    manageProfile: false,
    applyToOpportunity: false,
    createOpportunity: false,
    reviewApplications: false,
    manageWorkspace: false,
  };
}
