import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  createOrganizationSchema,
  selectWorkspaceSchema,
  type CreateOrganizationDto,
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

  @Get('role-capabilities')
  getRoleCapabilities(@User() user: ReqUser) {
    return this.organizations.getRoleCapabilities(user.id);
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
