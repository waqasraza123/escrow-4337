import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import * as marketplaceDto from './marketplace.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('profiles')
  listProfiles(
    @Query(
      new ZodValidationPipe(marketplaceDto.marketplaceProfilesQuerySchema),
    )
    query: marketplaceDto.MarketplaceProfilesQueryDto,
  ) {
    return this.marketplaceService.listProfiles(query);
  }

  @UseGuards(AuthGuard)
  @Get('profiles/me')
  getMyProfile(@User() user: ReqUser) {
    return this.marketplaceService.getMyProfile(user.id);
  }

  @Get('profiles/:slug')
  getProfile(@Param('slug') slug: string) {
    return this.marketplaceService.getPublicProfile(slug);
  }

  @UseGuards(AuthGuard)
  @Post('profiles')
  upsertProfile(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(marketplaceDto.upsertMarketplaceProfileSchema))
    body: marketplaceDto.UpsertMarketplaceProfileDto,
  ) {
    return this.marketplaceService.upsertProfile(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('profiles/me/proofs')
  updateProofs(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(marketplaceDto.updateMarketplaceProofsSchema))
    body: marketplaceDto.UpdateMarketplaceProofsDto,
  ) {
    return this.marketplaceService.updateProfileProofs(user.id, body);
  }

  @Get('opportunities')
  listOpportunities(
    @Query(
      new ZodValidationPipe(marketplaceDto.marketplaceOpportunitiesQuerySchema),
    )
    query: marketplaceDto.MarketplaceOpportunitiesQueryDto,
  ) {
    return this.marketplaceService.listOpportunities(query);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/mine')
  listMyOpportunities(@User() user: ReqUser) {
    return this.marketplaceService.listMyOpportunities(user.id);
  }

  @Get('opportunities/:id')
  getOpportunity(@Param('id') id: string) {
    return this.marketplaceService.getPublicOpportunity(id);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities')
  createOpportunity(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(marketplaceDto.createMarketplaceOpportunitySchema),
    )
    body: marketplaceDto.CreateMarketplaceOpportunityDto,
  ) {
    return this.marketplaceService.createOpportunity(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('opportunities/:id')
  updateOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.updateMarketplaceOpportunitySchema),
    )
    body: marketplaceDto.UpdateMarketplaceOpportunityDto,
  ) {
    return this.marketplaceService.updateOpportunity(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/publish')
  publishOpportunity(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.publishOpportunity(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/screening')
  updateOpportunityScreening(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.updateMarketplaceScreeningSchema),
    )
    body: marketplaceDto.UpdateMarketplaceScreeningDto,
  ) {
    return this.marketplaceService.updateOpportunityScreening(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/pause')
  pauseOpportunity(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.pauseOpportunity(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/:id/applications')
  getOpportunityApplications(
    @User() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.marketplaceService.getOpportunityApplications(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/:id/matches')
  getOpportunityMatches(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getOpportunityMatches(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/applications')
  applyToOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.applyToOpportunitySchema))
    body: marketplaceDto.ApplyToOpportunityDto,
  ) {
    return this.marketplaceService.applyToOpportunity(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('applications/mine')
  listMyApplications(@User() user: ReqUser) {
    return this.marketplaceService.listMyApplications(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('applications/:id/dossier')
  getApplicationDossier(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getApplicationDossier(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/withdraw')
  withdrawApplication(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.withdrawApplication(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/shortlist')
  shortlistApplication(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.shortlistApplication(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/reject')
  rejectApplication(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.rejectApplication(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/hire')
  hireApplication(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.hireApplication(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('moderation/dashboard')
  getModerationDashboard(@User() user: ReqUser) {
    return this.marketplaceService.getModerationDashboard(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('moderation/profiles')
  listModerationProfiles(@User() user: ReqUser) {
    return this.marketplaceService.listModerationProfiles(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('moderation/opportunities')
  listModerationOpportunities(@User() user: ReqUser) {
    return this.marketplaceService.listModerationOpportunities(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('moderation/profiles/:userId')
  moderateProfile(
    @User() user: ReqUser,
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(marketplaceDto.updateModerationSchema))
    body: marketplaceDto.UpdateModerationDto,
  ) {
    return this.marketplaceService.moderateProfile(user.id, targetUserId, body);
  }

  @UseGuards(AuthGuard)
  @Post('moderation/opportunities/:id')
  moderateOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.updateModerationSchema))
    body: marketplaceDto.UpdateModerationDto,
  ) {
    return this.marketplaceService.moderateOpportunity(user.id, id, body);
  }
}
