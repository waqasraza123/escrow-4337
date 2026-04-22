import type { QueryResultRow } from 'pg';
import type {
  OrganizationInvitationRecord,
  OrganizationMembershipRecord,
  OrganizationRecord,
  WorkspaceRecord,
} from '../../modules/organizations/organizations.types';
import type { OrganizationsRepository } from '../persistence.types';
import { PostgresDatabaseService } from './postgres-database.service';

type OrganizationRow = QueryResultRow & {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationRecord['kind'];
  created_by_user_id: string;
  created_at_ms: string;
  updated_at_ms: string;
};

type OrganizationMembershipRow = QueryResultRow & {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMembershipRecord['role'];
  status: OrganizationMembershipRecord['status'];
  created_at_ms: string;
  updated_at_ms: string;
};

type OrganizationInvitationRow = QueryResultRow & {
  id: string;
  organization_id: string;
  invited_email: string;
  role: OrganizationInvitationRecord['role'];
  status: OrganizationInvitationRecord['status'];
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  accepted_at_ms: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type WorkspaceRow = QueryResultRow & {
  id: string;
  organization_id: string;
  kind: WorkspaceRecord['kind'];
  label: string;
  slug: string;
  default_for_user_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

function mapOrganization(row: OrganizationRow): OrganizationRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    createdByUserId: row.created_by_user_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapMembership(
  row: OrganizationMembershipRow,
): OrganizationMembershipRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapInvitation(
  row: OrganizationInvitationRow,
): OrganizationInvitationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invitedEmail: row.invited_email,
    role: row.role,
    status: row.status,
    invitedByUserId: row.invited_by_user_id,
    acceptedByUserId: row.accepted_by_user_id,
    acceptedAt: row.accepted_at_ms ? Number(row.accepted_at_ms) : null,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    kind: row.kind,
    label: row.label,
    slug: row.slug,
    defaultForUserId: row.default_for_user_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

export class PostgresOrganizationsRepository
  implements OrganizationsRepository
{
  constructor(private readonly db: PostgresDatabaseService) {}

  async getOrganizationById(id: string) {
    const result = await this.db.query<OrganizationRow>(
      `
        SELECT *
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  async getOrganizationBySlug(slug: string) {
    const result = await this.db.query<OrganizationRow>(
      `
        SELECT *
        FROM organizations
        WHERE slug = $1
        LIMIT 1
      `,
      [slug.trim().toLowerCase()],
    );
    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  async getInvitationById(id: string) {
    const result = await this.db.query<OrganizationInvitationRow>(
      `
        SELECT *
        FROM organization_invitations
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ? mapInvitation(result.rows[0]) : null;
  }

  async listOrganizationsByUserId(userId: string) {
    const result = await this.db.query<OrganizationRow>(
      `
        SELECT DISTINCT o.*
        FROM organizations o
        INNER JOIN organization_memberships m ON m.organization_id = o.id
        WHERE m.user_id = $1
        ORDER BY o.updated_at_ms DESC
      `,
      [userId],
    );
    return result.rows.map(mapOrganization);
  }

  async listMembershipsByUserId(userId: string) {
    const result = await this.db.query<OrganizationMembershipRow>(
      `
        SELECT *
        FROM organization_memberships
        WHERE user_id = $1
        ORDER BY updated_at_ms DESC
      `,
      [userId],
    );
    return result.rows.map(mapMembership);
  }

  async listMembershipsByOrganizationId(organizationId: string) {
    const result = await this.db.query<OrganizationMembershipRow>(
      `
        SELECT *
        FROM organization_memberships
        WHERE organization_id = $1
        ORDER BY updated_at_ms DESC
      `,
      [organizationId],
    );
    return result.rows.map(mapMembership);
  }

  async listInvitationsByUserEmail(email: string) {
    const result = await this.db.query<OrganizationInvitationRow>(
      `
        SELECT *
        FROM organization_invitations
        WHERE invited_email = $1
        ORDER BY updated_at_ms DESC
      `,
      [email.trim().toLowerCase()],
    );
    return result.rows.map(mapInvitation);
  }

  async listInvitationsByOrganizationId(organizationId: string) {
    const result = await this.db.query<OrganizationInvitationRow>(
      `
        SELECT *
        FROM organization_invitations
        WHERE organization_id = $1
        ORDER BY updated_at_ms DESC
      `,
      [organizationId],
    );
    return result.rows.map(mapInvitation);
  }

  async listWorkspacesByUserId(userId: string) {
    const result = await this.db.query<WorkspaceRow>(
      `
        SELECT DISTINCT w.*
        FROM workspaces w
        INNER JOIN organization_memberships m ON m.organization_id = w.organization_id
        WHERE m.user_id = $1
        ORDER BY w.updated_at_ms DESC
      `,
      [userId],
    );
    return result.rows.map(mapWorkspace);
  }

  async listWorkspacesByOrganizationId(organizationId: string) {
    const result = await this.db.query<WorkspaceRow>(
      `
        SELECT *
        FROM workspaces
        WHERE organization_id = $1
        ORDER BY updated_at_ms DESC
      `,
      [organizationId],
    );
    return result.rows.map(mapWorkspace);
  }

  async getWorkspaceById(id: string) {
    const result = await this.db.query<WorkspaceRow>(
      `
        SELECT *
        FROM workspaces
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return result.rows[0] ? mapWorkspace(result.rows[0]) : null;
  }

  async saveOrganization(organization: OrganizationRecord) {
    await this.db.query(
      `
        INSERT INTO organizations (
          id,
          slug,
          name,
          kind,
          created_by_user_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          name = EXCLUDED.name,
          kind = EXCLUDED.kind,
          created_by_user_id = EXCLUDED.created_by_user_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        organization.id,
        organization.slug,
        organization.name,
        organization.kind,
        organization.createdByUserId,
        String(organization.createdAt),
        String(organization.updatedAt),
      ],
    );
  }

  async saveMembership(membership: OrganizationMembershipRecord) {
    await this.db.query(
      `
        INSERT INTO organization_memberships (
          id,
          organization_id,
          user_id,
          role,
          status,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          user_id = EXCLUDED.user_id,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        membership.id,
        membership.organizationId,
        membership.userId,
        membership.role,
        membership.status,
        String(membership.createdAt),
        String(membership.updatedAt),
      ],
    );
  }

  async saveInvitation(invitation: OrganizationInvitationRecord) {
    await this.db.query(
      `
        INSERT INTO organization_invitations (
          id,
          organization_id,
          invited_email,
          role,
          status,
          invited_by_user_id,
          accepted_by_user_id,
          accepted_at_ms,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          invited_email = EXCLUDED.invited_email,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          invited_by_user_id = EXCLUDED.invited_by_user_id,
          accepted_by_user_id = EXCLUDED.accepted_by_user_id,
          accepted_at_ms = EXCLUDED.accepted_at_ms,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        invitation.id,
        invitation.organizationId,
        invitation.invitedEmail.trim().toLowerCase(),
        invitation.role,
        invitation.status,
        invitation.invitedByUserId,
        invitation.acceptedByUserId,
        invitation.acceptedAt === null ? null : String(invitation.acceptedAt),
        String(invitation.createdAt),
        String(invitation.updatedAt),
      ],
    );
  }

  async saveWorkspace(workspace: WorkspaceRecord) {
    await this.db.query(
      `
        INSERT INTO workspaces (
          id,
          organization_id,
          kind,
          label,
          slug,
          default_for_user_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          slug = EXCLUDED.slug,
          default_for_user_id = EXCLUDED.default_for_user_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        workspace.id,
        workspace.organizationId,
        workspace.kind,
        workspace.label,
        workspace.slug,
        workspace.defaultForUserId,
        String(workspace.createdAt),
        String(workspace.updatedAt),
      ],
    );
  }
}
