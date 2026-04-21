import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  acceptOrganizationInvitationSchema,
  createOrganizationSchema,
  createOrganizationInvitationSchema,
  selectWorkspaceSchema,
  type AcceptOrganizationInvitationDto,
  type CreateOrganizationDto,
  type CreateOrganizationInvitationDto,
  type SelectWorkspaceDto,
} from './organizations.dto';
import { OrganizationsService } from './organizations.service';

@Controller()
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('organizations')
  listOrganizations(@User() user: ReqUser) {
    return this.organizations.listOrganizations(user.id);
  }

  @Post('organizations')
  createOrganization(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(createOrganizationSchema))
    body: CreateOrganizationDto,
  ) {
    return this.organizations.createOrganization(user.id, body);
  }

  @Get('memberships')
  listMemberships(@User() user: ReqUser) {
    return this.organizations.listMemberships(user.id);
  }

  @Get('invitations')
  listInvitations(@User() user: ReqUser) {
    return this.organizations.listInvitations(user.id);
  }

  @Get('organizations/:organizationId/invitations')
  listOrganizationInvitations(
    @User() user: ReqUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.listOrganizationInvitations(user.id, organizationId);
  }

  @Get('organizations/:organizationId/memberships')
  listOrganizationMemberships(
    @User() user: ReqUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.listOrganizationMemberships(user.id, organizationId);
  }

  @Get('role-capabilities')
  getRoleCapabilities(@User() user: ReqUser) {
    return this.organizations.getRoleCapabilities(user.id);
  }

  @Post('organizations/:organizationId/invitations')
  createInvitation(
    @User() user: ReqUser,
    @Param('organizationId') organizationId: string,
    @Body(new ZodValidationPipe(createOrganizationInvitationSchema))
    body: CreateOrganizationInvitationDto,
  ) {
    return this.organizations.createInvitation(user.id, organizationId, body);
  }

  @Post('organizations/:organizationId/invitations/:invitationId/revoke')
  revokeInvitation(
    @User() user: ReqUser,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizations.revokeInvitation(user.id, organizationId, invitationId);
  }

  @Post('invitations/:invitationId/accept')
  acceptInvitation(
    @User() user: ReqUser,
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(acceptOrganizationInvitationSchema))
    body: AcceptOrganizationInvitationDto,
  ) {
    return this.organizations.acceptInvitation(user.id, invitationId, body);
  }

  @Post('workspaces/select')
  selectWorkspace(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(selectWorkspaceSchema))
    body: SelectWorkspaceDto,
  ) {
    return this.organizations.selectWorkspace(user.id, body.workspaceId);
  }
}
