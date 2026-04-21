import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ORGANIZATIONS_REPOSITORY,
} from '../../persistence/persistence.tokens';
import type { OrganizationsRepository } from '../../persistence/persistence.types';
import { UsersService } from '../users/users.service';
import type { UserRecord } from '../users/users.types';
import type {
  AcceptOrganizationInvitationDto,
  CreateOrganizationDto,
  CreateOrganizationInvitationDto,
} from './organizations.dto';
import {
  createEmptyWorkspaceCapabilities,
  type OrganizationInvitationRecord,
  type OrganizationInvitationResponse,
  type OrganizationInvitationsListResponse,
  type OrganizationInvitationView,
  type MembershipsListResponse,
  type OrganizationMembershipRecord,
  type OrganizationMembershipView,
  type OrganizationResponse,
  type OrganizationRole,
  type OrganizationSummary,
  type OrganizationRecord,
  type OrganizationsListResponse,
  type RoleCapabilitiesResponse,
  type WorkspaceCapabilities,
  type WorkspaceKind,
  type WorkspaceRecord,
  type WorkspaceSelectionResponse,
  type WorkspaceSummary,
} from './organizations.types';

type ManagedOrganizationKind = Extract<OrganizationRecord['kind'], 'client' | 'agency'>;
type ManagedOrganizationInvitationRole = OrganizationInvitationRecord['role'];

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'workspace';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getOwnerRoleForOrganization(
  kind: ManagedOrganizationKind,
): ManagedOrganizationInvitationRole {
  return kind === 'agency' ? 'agency_owner' : 'client_owner';
}

function getWorkspaceKindForOrganization(kind: ManagedOrganizationKind): WorkspaceKind {
  return kind === 'agency' ? 'freelancer' : 'client';
}

function getDefaultWorkspaceLabel(kind: ManagedOrganizationKind, name: string) {
  return kind === 'agency' ? `${name} talent workspace` : name;
}

function getAllowedInvitationRoles(
  kind: OrganizationRecord['kind'],
): ManagedOrganizationInvitationRole[] {
  if (kind === 'agency') {
    return ['agency_owner', 'agency_member'];
  }
  if (kind === 'client') {
    return ['client_owner', 'client_recruiter'];
  }
  return [];
}

function getWorkspaceKindForRole(role: OrganizationRole): WorkspaceKind {
  switch (role) {
    case 'client_owner':
    case 'client_recruiter':
      return 'client';
    case 'agency_owner':
    case 'agency_member':
    case 'freelancer':
    case 'operator':
    case 'moderator':
    default:
      return 'freelancer';
  }
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly usersService: UsersService,
  ) {}

  async buildWorkspaceContext(userId: string) {
    const user = await this.usersService.getRequiredById(userId);
    return this.buildWorkspaceContextForUser(user);
  }

  async listOrganizations(userId: string): Promise<OrganizationsListResponse> {
    const context = await this.buildWorkspaceContext(userId);
    const grouped = new Map<string, OrganizationSummary>();
    for (const workspace of context.workspaces) {
      const existing = grouped.get(workspace.organizationId);
      if (existing) {
        existing.workspaces.push(workspace);
        existing.roles = Array.from(new Set([...existing.roles, ...workspace.roles])).sort();
        continue;
      }
      grouped.set(workspace.organizationId, {
        id: workspace.organizationId,
        slug: workspace.organizationSlug,
        name: workspace.organizationName,
        kind: workspace.organizationKind,
        roles: [...workspace.roles].sort(),
        workspaces: [workspace],
      });
    }

    return {
      organizations: Array.from(grouped.values()).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    };
  }

  async listMemberships(userId: string): Promise<MembershipsListResponse> {
    await this.ensurePersonalWorkspaceGraph(userId);
    const organizations = await this.organizationsRepository.listOrganizationsByUserId(userId);
    const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));
    const workspaces = await this.organizationsRepository.listWorkspacesByUserId(userId);
    const workspaceIdsByOrg = new Map<string, string[]>();
    for (const workspace of workspaces) {
      const ids = workspaceIdsByOrg.get(workspace.organizationId) ?? [];
      ids.push(workspace.id);
      workspaceIdsByOrg.set(workspace.organizationId, ids);
    }
    const memberships = await this.organizationsRepository.listMembershipsByUserId(userId);
    const views: OrganizationMembershipView[] = memberships
      .map((membership) => {
        const organization = organizationsById.get(membership.organizationId);
        if (!organization) {
          return null;
        }
        return {
          membershipId: membership.id,
          userId: membership.userId,
          userEmail: user.email,
          organizationId: membership.organizationId,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          organizationKind: organization.kind,
          role: membership.role,
          status: membership.status,
          workspaceIds: (workspaceIdsByOrg.get(membership.organizationId) ?? []).sort(),
        } satisfies OrganizationMembershipView;
      })
      .filter(Boolean) as OrganizationMembershipView[];

    return { memberships: views };
  }

  async listOrganizationMemberships(
    userId: string,
    organizationId: string,
  ): Promise<MembershipsListResponse> {
    await this.ensurePersonalWorkspaceGraph(userId);
    const organization = await this.requireOrganizationAccess(userId, organizationId);
    const workspaces = await this.organizationsRepository.listWorkspacesByOrganizationId(
      organizationId,
    );
    const workspaceIds = workspaces.map((workspace) => workspace.id).sort();
    const memberships = await this.organizationsRepository.listMembershipsByOrganizationId(
      organizationId,
    );
    const usersById = new Map<string, string>();
    for (const membership of memberships) {
      const memberUser = await this.usersService.getById(membership.userId);
      usersById.set(membership.userId, memberUser?.email ?? membership.userId);
    }
    return {
      memberships: memberships.map((membership) => ({
        membershipId: membership.id,
        userId: membership.userId,
        userEmail: usersById.get(membership.userId) ?? membership.userId,
        organizationId,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationKind: organization.kind,
        role: membership.role,
        status: membership.status,
        workspaceIds,
      })),
    };
  }

  async listInvitations(
    userId: string,
  ): Promise<OrganizationInvitationsListResponse> {
    const user = await this.usersService.getRequiredById(userId);
    await this.ensurePersonalWorkspaceGraph(user.id);
    const invitations = await this.organizationsRepository.listInvitationsByUserEmail(
      user.email,
    );
    const pendingInvitations = invitations.filter(
      (invitation) => invitation.status === 'pending',
    );
    return {
      invitations: await this.toInvitationViews(pendingInvitations),
    };
  }

  async listOrganizationInvitations(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationInvitationsListResponse> {
    await this.ensurePersonalWorkspaceGraph(userId);
    await this.requireOrganizationAccess(userId, organizationId);
    const invitations = await this.organizationsRepository.listInvitationsByOrganizationId(
      organizationId,
    );
    return {
      invitations: await this.toInvitationViews(invitations),
    };
  }

  async createOrganization(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const user = await this.usersService.getRequiredById(userId);
    await this.ensurePersonalWorkspaceGraph(user.id);
    const now = Date.now();
    const organizationKind = dto.kind;
    const ownerRole = getOwnerRoleForOrganization(organizationKind);
    const workspaceKind = getWorkspaceKindForOrganization(organizationKind);
    const slug = dto.slug ?? slugify(dto.name);
    const existing = await this.organizationsRepository.getOrganizationBySlug(slug);
    if (existing) {
      throw new ConflictException('Organization slug is already in use');
    }

    const organization: OrganizationRecord = {
      id: randomUUID(),
      slug,
      name: dto.name.trim(),
      kind: organizationKind,
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    const membership: OrganizationMembershipRecord = {
      id: randomUUID(),
      organizationId: organization.id,
      userId: user.id,
      role: ownerRole,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const workspace: WorkspaceRecord = {
      id: randomUUID(),
      organizationId: organization.id,
      kind: workspaceKind,
      label: getDefaultWorkspaceLabel(organizationKind, organization.name),
      slug,
      defaultForUserId: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.organizationsRepository.saveOrganization(organization);
    await this.organizationsRepository.saveMembership(membership);
    await this.organizationsRepository.saveWorkspace(workspace);

    if (dto.setActive !== false) {
      await this.usersService.setActiveWorkspace(user.id, workspace.id);
    }

    return {
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        kind: organization.kind,
        roles: [ownerRole],
        workspaces: [
          this.toWorkspaceSummary(organization, workspace, [ownerRole]),
        ],
      },
    };
  }

  async createInvitation(
    userId: string,
    organizationId: string,
    dto: CreateOrganizationInvitationDto,
  ): Promise<OrganizationInvitationResponse> {
    const user = await this.usersService.getRequiredById(userId);
    await this.ensurePersonalWorkspaceGraph(user.id);
    const organization = await this.requireOrganizationManagement(user.id, organizationId);
    if (!getAllowedInvitationRoles(organization.kind).includes(dto.role)) {
      throw new BadRequestException(
        `Role ${dto.role} is not valid for ${organization.kind} organizations`,
      );
    }

    const invitedEmail = normalizeEmail(dto.email);
    const existingPending = (
      await this.organizationsRepository.listInvitationsByOrganizationId(
        organizationId,
      )
    ).find(
      (invitation) =>
        invitation.status === 'pending' &&
        invitation.invitedEmail === invitedEmail &&
        invitation.role === dto.role,
    );
    if (existingPending) {
      return {
        invitation: (
          await this.toInvitationViews([existingPending])
        )[0] as OrganizationInvitationView,
      };
    }

    const now = Date.now();
    const invitation: OrganizationInvitationRecord = {
      id: randomUUID(),
      organizationId,
      invitedEmail,
      role: dto.role,
      status: 'pending',
      invitedByUserId: user.id,
      acceptedByUserId: null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.organizationsRepository.saveInvitation(invitation);
    return {
      invitation: (await this.toInvitationViews([invitation]))[0] as OrganizationInvitationView,
    };
  }

  async revokeInvitation(
    userId: string,
    organizationId: string,
    invitationId: string,
  ): Promise<OrganizationInvitationResponse> {
    await this.ensurePersonalWorkspaceGraph(userId);
    await this.requireOrganizationManagement(userId, organizationId);
    const invitation = await this.organizationsRepository.getInvitationById(invitationId);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      return {
        invitation: (await this.toInvitationViews([invitation]))[0] as OrganizationInvitationView,
      };
    }
    const revoked = {
      ...invitation,
      status: 'revoked' as const,
      updatedAt: Date.now(),
    };
    await this.organizationsRepository.saveInvitation(revoked);
    return {
      invitation: (await this.toInvitationViews([revoked]))[0] as OrganizationInvitationView,
    };
  }

  async acceptInvitation(
    userId: string,
    invitationId: string,
    dto: AcceptOrganizationInvitationDto,
  ): Promise<WorkspaceSelectionResponse> {
    const user = await this.usersService.getRequiredById(userId);
    await this.ensurePersonalWorkspaceGraph(user.id);
    const invitation = await this.organizationsRepository.getInvitationById(
      invitationId,
    );
    if (!invitation || invitation.status !== 'pending') {
      throw new NotFoundException('Invitation not found');
    }
    if (normalizeEmail(user.email) !== invitation.invitedEmail) {
      throw new BadRequestException(
        'Authenticated user email does not match the invitation target',
      );
    }

    const existingMemberships = await this.organizationsRepository.listMembershipsByOrganizationId(
      invitation.organizationId,
    );
    const now = Date.now();
    const matchingMembership = existingMemberships.find(
      (membership) =>
        membership.userId === user.id && membership.role === invitation.role,
    );
    if (!matchingMembership) {
      await this.organizationsRepository.saveMembership({
        id: randomUUID(),
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }
    await this.organizationsRepository.saveInvitation({
      ...invitation,
      status: 'accepted',
      acceptedByUserId: user.id,
      acceptedAt: now,
      updatedAt: now,
    });

    const workspaces = await this.organizationsRepository.listWorkspacesByOrganizationId(
      invitation.organizationId,
    );
    const preferredWorkspace =
      workspaces.find(
        (workspace) => workspace.kind === getWorkspaceKindForRole(invitation.role),
      ) ??
      workspaces[0] ??
      null;
    if (dto.setActive !== false && preferredWorkspace) {
      await this.usersService.setActiveWorkspace(user.id, preferredWorkspace.id);
    }
    const context = await this.buildWorkspaceContext(user.id);
    if (!context.activeWorkspace) {
      throw new NotFoundException('No active workspace is available after accepting the invitation');
    }
    return {
      activeWorkspace: context.activeWorkspace,
      workspaces: context.workspaces,
    };
  }

  async selectWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceSelectionResponse> {
    const context = await this.buildWorkspaceContext(userId);
    const workspace = context.workspaces.find(
      (candidate) => candidate.workspaceId === workspaceId,
    );
    if (!workspace) {
      throw new NotFoundException('Workspace not found for the authenticated user');
    }

    await this.usersService.setActiveWorkspace(userId, workspace.workspaceId);
    return {
      activeWorkspace: workspace,
      workspaces: context.workspaces,
    };
  }

  async getRoleCapabilities(userId: string): Promise<RoleCapabilitiesResponse> {
    const context = await this.buildWorkspaceContext(userId);
    return {
      activeWorkspace: context.activeWorkspace,
      workspaceRoles: {
        client: {
          roles: ['client_owner', 'client_recruiter'],
          capabilities: this.buildWorkspaceCapabilities('client', [
            'client_owner',
            'client_recruiter',
          ]),
        },
        freelancer: {
          roles: ['freelancer', 'agency_owner', 'agency_member'],
          capabilities: this.buildWorkspaceCapabilities('freelancer', [
            'freelancer',
            'agency_owner',
            'agency_member',
          ]),
        },
      },
    };
  }

  async requireWorkspace(
    userId: string,
    workspaceKind: WorkspaceKind,
    capability?: keyof WorkspaceCapabilities,
  ): Promise<WorkspaceSummary> {
    const context = await this.buildWorkspaceContext(userId);
    const activeWorkspace = context.activeWorkspace;
    const matchingWorkspace =
      (activeWorkspace &&
      activeWorkspace.kind === workspaceKind &&
      (!capability || activeWorkspace.capabilities[capability])
        ? activeWorkspace
        : null) ??
      context.workspaces.find(
        (workspace) =>
          workspace.kind === workspaceKind &&
          (!capability || workspace.capabilities[capability]),
      ) ??
      null;

    if (!matchingWorkspace) {
      throw new BadRequestException(
        `Authenticated user has no ${workspaceKind} workspace with capability ${capability ?? 'access'}`,
      );
    }

    return matchingWorkspace;
  }

  async findAccessibleWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceSummary | null> {
    const context = await this.buildWorkspaceContext(userId);
    return (
      context.workspaces.find((workspace) => workspace.workspaceId === workspaceId) ??
      null
    );
  }

  async buildWorkspaceContextForUser(user: UserRecord) {
    const hydratedUser = await this.ensurePersonalWorkspaceGraph(user.id);
    const [organizations, memberships, workspaces] = await Promise.all([
      this.organizationsRepository.listOrganizationsByUserId(user.id),
      this.organizationsRepository.listMembershipsByUserId(user.id),
      this.organizationsRepository.listWorkspacesByUserId(user.id),
    ]);
    const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));
    const membershipsByOrganizationId = new Map<string, OrganizationRole[]>();
    for (const membership of memberships) {
      const roles = membershipsByOrganizationId.get(membership.organizationId) ?? [];
      roles.push(membership.role);
      membershipsByOrganizationId.set(
        membership.organizationId,
        Array.from(new Set(roles)).sort() as OrganizationRole[],
      );
    }

    const workspaceSummaries = workspaces
      .map((workspace) => {
        const organization = organizationsById.get(workspace.organizationId);
        if (!organization) {
          return null;
        }
        return this.toWorkspaceSummary(
          organization,
          workspace,
          membershipsByOrganizationId.get(workspace.organizationId) ?? [],
        );
      })
      .filter(Boolean) as WorkspaceSummary[];

    let activeWorkspace =
      workspaceSummaries.find(
        (workspace) => workspace.workspaceId === hydratedUser.activeWorkspaceId,
      ) ?? null;
    if (!activeWorkspace) {
      activeWorkspace =
        workspaceSummaries.find((workspace) => workspace.kind === 'client' && workspace.isDefault) ??
        workspaceSummaries[0] ??
        null;
      if (activeWorkspace && hydratedUser.activeWorkspaceId !== activeWorkspace.workspaceId) {
        await this.usersService.setActiveWorkspace(user.id, activeWorkspace.workspaceId);
      }
    }

    return {
      user: {
        ...hydratedUser,
        activeWorkspaceId: activeWorkspace?.workspaceId ?? hydratedUser.activeWorkspaceId,
      },
      workspaces: workspaceSummaries.sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
      activeWorkspace,
    };
  }

  private async ensurePersonalWorkspaceGraph(userId: string) {
    let user = await this.usersService.getRequiredById(userId);
    const organizations = await this.organizationsRepository.listOrganizationsByUserId(userId);
    const personalOrganization =
      organizations.find((organization) => organization.kind === 'personal') ?? null;
    const now = Date.now();
    const personal =
      personalOrganization ??
      ({
        id: randomUUID(),
        slug: `personal-${user.id}`,
        name: 'Personal workspace',
        kind: 'personal',
        createdByUserId: user.id,
        createdAt: now,
        updatedAt: now,
      } satisfies OrganizationRecord);
    if (!personalOrganization) {
      await this.organizationsRepository.saveOrganization(personal);
    }

    const memberships = await this.organizationsRepository.listMembershipsByOrganizationId(personal.id);
    const membershipRoles = new Set(memberships.map((membership) => membership.role));
    if (!membershipRoles.has('client_owner')) {
      await this.organizationsRepository.saveMembership({
        id: randomUUID(),
        organizationId: personal.id,
        userId,
        role: 'client_owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }
    if (!membershipRoles.has('freelancer')) {
      await this.organizationsRepository.saveMembership({
        id: randomUUID(),
        organizationId: personal.id,
        userId,
        role: 'freelancer',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    const workspaces = await this.organizationsRepository.listWorkspacesByOrganizationId(personal.id);
    const clientWorkspace = workspaces.find((workspace) => workspace.kind === 'client');
    if (!clientWorkspace) {
      await this.organizationsRepository.saveWorkspace({
        id: randomUUID(),
        organizationId: personal.id,
        kind: 'client',
        label: 'Personal client workspace',
        slug: `personal-client-${user.id}`,
        defaultForUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    const freelancerWorkspace = workspaces.find((workspace) => workspace.kind === 'freelancer');
    if (!freelancerWorkspace) {
      await this.organizationsRepository.saveWorkspace({
        id: randomUUID(),
        organizationId: personal.id,
        kind: 'freelancer',
        label: 'Personal freelancer workspace',
        slug: `personal-freelancer-${user.id}`,
        defaultForUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!user.activeWorkspaceId) {
      const nextWorkspaces = await this.organizationsRepository.listWorkspacesByOrganizationId(
        personal.id,
      );
      const defaultWorkspace =
        nextWorkspaces.find((workspace) => workspace.kind === 'client') ??
        nextWorkspaces[0] ??
        null;
      if (defaultWorkspace) {
        user = await this.usersService.setActiveWorkspace(userId, defaultWorkspace.id);
      }
    }

    return user;
  }

  private toWorkspaceSummary(
    organization: OrganizationRecord,
    workspace: WorkspaceRecord,
    roles: OrganizationRole[],
  ): WorkspaceSummary {
    return {
      workspaceId: workspace.id,
      kind: workspace.kind,
      label: workspace.label,
      slug: workspace.slug,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationKind: organization.kind,
      roles,
      capabilities: this.buildWorkspaceCapabilities(workspace.kind, roles),
      isDefault: workspace.defaultForUserId !== null,
    };
  }

  private buildWorkspaceCapabilities(
    workspaceKind: WorkspaceKind,
    roles: OrganizationRole[],
  ): WorkspaceCapabilities {
    const next = createEmptyWorkspaceCapabilities();
    if (workspaceKind === 'client') {
      const canClient = roles.includes('client_owner') || roles.includes('client_recruiter');
      next.createOpportunity = canClient;
      next.reviewApplications = canClient;
      next.manageWorkspace = roles.includes('client_owner');
      return next;
    }

    const canFreelancer =
      roles.includes('freelancer') ||
      roles.includes('agency_owner') ||
      roles.includes('agency_member');
    next.manageProfile = canFreelancer;
    next.applyToOpportunity = canFreelancer;
    next.manageWorkspace = roles.includes('agency_owner');
    return next;
  }

  private async requireOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationRecord> {
    const organization = await this.organizationsRepository.getOrganizationById(
      organizationId,
    );
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const memberships = await this.organizationsRepository.listMembershipsByOrganizationId(
      organizationId,
    );
    const hasAccess = memberships.some((membership) => membership.userId === userId);
    if (!hasAccess) {
      throw new NotFoundException('Organization not found for the authenticated user');
    }
    return organization;
  }

  private async requireOrganizationManagement(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationRecord> {
    const organization = await this.requireOrganizationAccess(userId, organizationId);
    if (organization.kind === 'personal') {
      throw new BadRequestException(
        'Personal workspaces do not support organization invitation management',
      );
    }
    const memberships = await this.organizationsRepository.listMembershipsByOrganizationId(
      organizationId,
    );
    const canManage = memberships.some(
      (membership) =>
        membership.userId === userId &&
        membership.role === getOwnerRoleForOrganization(organization.kind),
    );
    if (!canManage) {
      throw new BadRequestException(
        'Authenticated user cannot manage invitations for this organization',
      );
    }
    return organization;
  }

  private async toInvitationViews(
    invitations: OrganizationInvitationRecord[],
  ): Promise<OrganizationInvitationView[]> {
    if (invitations.length === 0) {
      return [];
    }
    const organizationIds = Array.from(
      new Set(invitations.map((invitation) => invitation.organizationId)),
    );
    const organizations = await Promise.all(
      organizationIds.map((organizationId) =>
        this.organizationsRepository.getOrganizationById(organizationId),
      ),
    );
    const organizationsById = new Map(
      organizations.filter(Boolean).map((organization) => [organization!.id, organization!]),
    );
    const workspaceIdsByOrg = new Map<string, string[]>();
    await Promise.all(
      organizationIds.map(async (organizationId) => {
        const workspaces =
          await this.organizationsRepository.listWorkspacesByOrganizationId(
            organizationId,
          );
        workspaceIdsByOrg.set(
          organizationId,
          workspaces.map((workspace) => workspace.id).sort(),
        );
      }),
    );
    return invitations
      .map((invitation) => {
        const organization = organizationsById.get(invitation.organizationId);
        if (!organization) {
          return null;
        }
        return {
          invitationId: invitation.id,
          organizationId: invitation.organizationId,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          organizationKind: organization.kind,
          invitedEmail: invitation.invitedEmail,
          role: invitation.role,
          status: invitation.status,
          invitedByUserId: invitation.invitedByUserId,
          acceptedByUserId: invitation.acceptedByUserId,
          acceptedAt: invitation.acceptedAt,
          createdAt: invitation.createdAt,
          updatedAt: invitation.updatedAt,
          workspaceIds: workspaceIdsByOrg.get(invitation.organizationId) ?? [],
        } satisfies OrganizationInvitationView;
      })
      .filter(Boolean) as OrganizationInvitationView[];
  }
}
