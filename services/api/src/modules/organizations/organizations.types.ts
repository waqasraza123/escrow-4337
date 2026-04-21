export type OrganizationKind = 'personal' | 'client' | 'agency';
export type WorkspaceKind = 'client' | 'freelancer';
export type OrganizationRole =
  | 'client_owner'
  | 'client_recruiter'
  | 'agency_owner'
  | 'agency_member'
  | 'freelancer'
  | 'operator'
  | 'moderator';
export type OrganizationMembershipStatus = 'active';
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked';
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

export type OrganizationInvitationRecord = {
  id: string;
  organizationId: string;
  invitedEmail: string;
  role: Extract<
    OrganizationRole,
    'client_owner' | 'client_recruiter' | 'agency_owner' | 'agency_member'
  >;
  status: OrganizationInvitationStatus;
  invitedByUserId: string;
  acceptedByUserId: string | null;
  acceptedAt: number | null;
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
  userId: string;
  userEmail: string;
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

export type OrganizationInvitationView = {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  invitedEmail: string;
  role: OrganizationInvitationRecord['role'];
  status: OrganizationInvitationStatus;
  invitedByUserId: string;
  acceptedByUserId: string | null;
  acceptedAt: number | null;
  createdAt: number;
  updatedAt: number;
  workspaceIds: string[];
};

export type OrganizationInvitationsListResponse = {
  invitations: OrganizationInvitationView[];
};

export type OrganizationInvitationResponse = {
  invitation: OrganizationInvitationView;
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
