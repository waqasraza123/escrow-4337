import type {
  OrganizationInvitationRecord,
  OrganizationMembershipRecord,
  OrganizationRecord,
  WorkspaceRecord,
} from '../../modules/organizations/organizations.types';
import type { OrganizationsRepository } from '../persistence.types';
import { FilePersistenceStore } from './file-persistence.store';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function normalizeOrganization(
  organization: OrganizationRecord,
): OrganizationRecord {
  return {
    ...organization,
    slug: organization.slug.trim().toLowerCase(),
    name: organization.name.trim(),
  };
}

function normalizeMembership(
  membership: OrganizationMembershipRecord,
): OrganizationMembershipRecord {
  return {
    ...membership,
    status: 'active',
  };
}

function normalizeInvitation(
  invitation: OrganizationInvitationRecord,
): OrganizationInvitationRecord {
  return {
    ...invitation,
    invitedEmail: invitation.invitedEmail.trim().toLowerCase(),
  };
}

function normalizeWorkspace(workspace: WorkspaceRecord): WorkspaceRecord {
  return {
    ...workspace,
    label: workspace.label.trim(),
    slug: workspace.slug.trim().toLowerCase(),
    defaultForUserId: workspace.defaultForUserId ?? null,
  };
}

export class FileOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async getOrganizationById(id: string) {
    return this.store.read((data) => {
      const organization = data.organizations[id];
      return organization ? cloneValue(normalizeOrganization(organization)) : null;
    });
  }

  async getOrganizationBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    return this.store.read((data) => {
      const organization = Object.values(data.organizations).find(
        (candidate) => candidate.slug === normalizedSlug,
      );
      return organization ? cloneValue(normalizeOrganization(organization)) : null;
    });
  }

  async getInvitationById(id: string) {
    return this.store.read((data) => {
      const invitation = data.organizationInvitations[id];
      return invitation ? cloneValue(normalizeInvitation(invitation)) : null;
    });
  }

  async listOrganizationsByUserId(userId: string) {
    return this.store.read((data) => {
      const organizationIds = new Set(
        Object.values(data.organizationMemberships)
          .filter((membership) => membership.userId === userId)
          .map((membership) => membership.organizationId),
      );
      return Array.from(organizationIds)
        .map((organizationId) => data.organizations[organizationId])
        .filter(Boolean)
        .map((organization) => cloneValue(normalizeOrganization(organization)));
    });
  }

  async listMembershipsByUserId(userId: string) {
    return this.store.read((data) =>
      Object.values(data.organizationMemberships)
        .filter((membership) => membership.userId === userId)
        .map((membership) => cloneValue(normalizeMembership(membership))),
    );
  }

  async listMembershipsByOrganizationId(organizationId: string) {
    return this.store.read((data) =>
      Object.values(data.organizationMemberships)
        .filter((membership) => membership.organizationId === organizationId)
        .map((membership) => cloneValue(normalizeMembership(membership))),
    );
  }

  async listInvitationsByUserEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    return this.store.read((data) =>
      Object.values(data.organizationInvitations)
        .filter((invitation) => invitation.invitedEmail === normalizedEmail)
        .map((invitation) => cloneValue(normalizeInvitation(invitation))),
    );
  }

  async listInvitationsByOrganizationId(organizationId: string) {
    return this.store.read((data) =>
      Object.values(data.organizationInvitations)
        .filter((invitation) => invitation.organizationId === organizationId)
        .map((invitation) => cloneValue(normalizeInvitation(invitation))),
    );
  }

  async listWorkspacesByUserId(userId: string) {
    return this.store.read((data) => {
      const organizationIds = new Set(
        Object.values(data.organizationMemberships)
          .filter((membership) => membership.userId === userId)
          .map((membership) => membership.organizationId),
      );
      return Object.values(data.workspaces)
        .filter((workspace) => organizationIds.has(workspace.organizationId))
        .map((workspace) => cloneValue(normalizeWorkspace(workspace)));
    });
  }

  async listWorkspacesByOrganizationId(organizationId: string) {
    return this.store.read((data) =>
      Object.values(data.workspaces)
        .filter((workspace) => workspace.organizationId === organizationId)
        .map((workspace) => cloneValue(normalizeWorkspace(workspace))),
    );
  }

  async getWorkspaceById(id: string) {
    return this.store.read((data) => {
      const workspace = data.workspaces[id];
      return workspace ? cloneValue(normalizeWorkspace(workspace)) : null;
    });
  }

  async saveOrganization(organization: OrganizationRecord) {
    await this.store.write((data) => {
      data.organizations[organization.id] = cloneValue(
        normalizeOrganization(organization),
      );
    });
  }

  async saveMembership(membership: OrganizationMembershipRecord) {
    await this.store.write((data) => {
      data.organizationMemberships[membership.id] = cloneValue(
        normalizeMembership(membership),
      );
    });
  }

  async saveInvitation(invitation: OrganizationInvitationRecord) {
    await this.store.write((data) => {
      data.organizationInvitations[invitation.id] = cloneValue(
        normalizeInvitation(invitation),
      );
    });
  }

  async saveWorkspace(workspace: WorkspaceRecord) {
    await this.store.write((data) => {
      data.workspaces[workspace.id] = cloneValue(normalizeWorkspace(workspace));
    });
  }
}
