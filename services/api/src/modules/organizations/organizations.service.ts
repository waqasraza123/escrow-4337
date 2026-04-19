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
  CreateOrganizationDto,
} from './organizations.dto';
import {
  createEmptyWorkspaceCapabilities,
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

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'workspace';
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

  async createOrganization(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const user = await this.usersService.getRequiredById(userId);
    await this.ensurePersonalWorkspaceGraph(user.id);
    const now = Date.now();
    const slug = dto.slug ?? slugify(dto.name);
    const existing = await this.organizationsRepository.getOrganizationBySlug(slug);
    if (existing) {
      throw new ConflictException('Organization slug is already in use');
    }

    const organization: OrganizationRecord = {
      id: randomUUID(),
      slug,
      name: dto.name.trim(),
      kind: 'client',
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    const membership: OrganizationMembershipRecord = {
      id: randomUUID(),
      organizationId: organization.id,
      userId: user.id,
      role: 'client_owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const workspace: WorkspaceRecord = {
      id: randomUUID(),
      organizationId: organization.id,
      kind: 'client',
      label: organization.name,
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
        roles: ['client_owner'],
        workspaces: [
          this.toWorkspaceSummary(organization, workspace, ['client_owner']),
        ],
      },
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
          roles: ['freelancer'],
          capabilities: this.buildWorkspaceCapabilities('freelancer', ['freelancer']),
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

    const canFreelancer = roles.includes('freelancer');
    next.manageProfile = canFreelancer;
    next.applyToOpportunity = canFreelancer;
    return next;
  }
}
