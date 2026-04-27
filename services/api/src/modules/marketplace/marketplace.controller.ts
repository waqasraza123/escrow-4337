import {
  Body,
  Controller,
  Delete,
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
    @Query(new ZodValidationPipe(marketplaceDto.marketplaceProfilesQuerySchema))
    query: marketplaceDto.MarketplaceProfilesQueryDto,
  ) {
    return this.marketplaceService.listProfiles(query);
  }

  @Get('talent/search')
  searchTalent(
    @Query(new ZodValidationPipe(marketplaceDto.marketplaceProfilesQuerySchema))
    query: marketplaceDto.MarketplaceProfilesQueryDto,
  ) {
    return this.marketplaceService.searchTalent(query);
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

  @Get('opportunities/search')
  searchOpportunities(
    @Query(
      new ZodValidationPipe(marketplaceDto.marketplaceOpportunitiesQuerySchema),
    )
    query: marketplaceDto.MarketplaceOpportunitiesQueryDto,
  ) {
    return this.marketplaceService.searchOpportunities(query);
  }

  @Post('analytics/interactions')
  recordInteraction(
    @Body(
      new ZodValidationPipe(marketplaceDto.recordMarketplaceInteractionSchema),
    )
    body: marketplaceDto.RecordMarketplaceInteractionDto,
  ) {
    return this.marketplaceService.recordInteraction(null, body);
  }

  @UseGuards(AuthGuard)
  @Get('analytics/overview')
  getAnalyticsOverview(@User() user: ReqUser) {
    return this.marketplaceService.getAnalyticsOverview(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('recommendations/talent')
  getTalentRecommendations(
    @User() user: ReqUser,
    @Query(
      new ZodValidationPipe(marketplaceDto.marketplaceOpportunitiesQuerySchema),
    )
    query: marketplaceDto.MarketplaceOpportunitiesQueryDto,
  ) {
    return this.marketplaceService.getTalentRecommendations(user.id, query);
  }

  @UseGuards(AuthGuard)
  @Get('recommendations/opportunities')
  getOpportunityRecommendations(
    @User() user: ReqUser,
    @Query(new ZodValidationPipe(marketplaceDto.marketplaceProfilesQuerySchema))
    query: marketplaceDto.MarketplaceProfilesQueryDto,
  ) {
    return this.marketplaceService.getOpportunityRecommendations(
      user.id,
      query,
    );
  }

  @UseGuards(AuthGuard)
  @Get('saved-searches')
  listSavedSearches(
    @User() user: ReqUser,
    @Query(
      new ZodValidationPipe(marketplaceDto.marketplaceSavedSearchesQuerySchema),
    )
    query: marketplaceDto.MarketplaceSavedSearchesQueryDto,
  ) {
    return this.marketplaceService.listSavedSearches(user.id, query);
  }

  @UseGuards(AuthGuard)
  @Post('saved-searches')
  createSavedSearch(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(marketplaceDto.createMarketplaceSavedSearchSchema),
    )
    body: marketplaceDto.CreateMarketplaceSavedSearchDto,
  ) {
    return this.marketplaceService.createSavedSearch(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Delete('saved-searches/:id')
  deleteSavedSearch(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.deleteSavedSearch(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('talent-pools')
  listTalentPools(@User() user: ReqUser) {
    return this.marketplaceService.listTalentPools(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('talent-pools')
  createTalentPool(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(marketplaceDto.createMarketplaceTalentPoolSchema),
    )
    body: marketplaceDto.CreateMarketplaceTalentPoolDto,
  ) {
    return this.marketplaceService.createTalentPool(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('talent-pools/:id/members')
  addTalentPoolMember(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.addMarketplaceTalentPoolMemberSchema,
      ),
    )
    body: marketplaceDto.AddMarketplaceTalentPoolMemberDto,
  ) {
    return this.marketplaceService.addTalentPoolMember(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('talent-pools/:poolId/members/:memberId')
  updateTalentPoolMember(
    @User() user: ReqUser,
    @Param('poolId') poolId: string,
    @Param('memberId') memberId: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.updateMarketplaceTalentPoolMemberSchema,
      ),
    )
    body: marketplaceDto.UpdateMarketplaceTalentPoolMemberDto,
  ) {
    return this.marketplaceService.updateTalentPoolMember(
      user.id,
      poolId,
      memberId,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Get('automation-rules')
  listAutomationRules(@User() user: ReqUser) {
    return this.marketplaceService.listAutomationRules(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('automation-rules')
  createAutomationRule(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.createMarketplaceAutomationRuleSchema,
      ),
    )
    body: marketplaceDto.CreateMarketplaceAutomationRuleDto,
  ) {
    return this.marketplaceService.createAutomationRule(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('automation-rules/:id')
  updateAutomationRule(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.updateMarketplaceAutomationRuleSchema,
      ),
    )
    body: marketplaceDto.UpdateMarketplaceAutomationRuleDto,
  ) {
    return this.marketplaceService.updateAutomationRule(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('automation-runs')
  listAutomationRuns(@User() user: ReqUser) {
    return this.marketplaceService.listAutomationRuns(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('notifications')
  listNotifications(@User() user: ReqUser) {
    return this.marketplaceService.listNotifications(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('notifications/read-all')
  markAllNotificationsRead(@User() user: ReqUser) {
    return this.marketplaceService.markAllNotificationsRead(user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('notifications/:id')
  updateNotification(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.updateMarketplaceNotificationSchema),
    )
    body: marketplaceDto.UpdateMarketplaceNotificationDto,
  ) {
    return this.marketplaceService.updateNotification(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('notification-preferences')
  getNotificationPreferences(@User() user: ReqUser) {
    return this.marketplaceService.getNotificationPreferences(user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('notification-preferences')
  updateNotificationPreferences(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.updateMarketplaceNotificationPreferencesSchema,
      ),
    )
    body: marketplaceDto.UpdateMarketplaceNotificationPreferencesDto,
  ) {
    return this.marketplaceService.updateNotificationPreferences(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Get('digests')
  listDigests(@User() user: ReqUser) {
    return this.marketplaceService.listDigests(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('digest-dispatch-runs')
  listDigestDispatchRuns(@User() user: ReqUser) {
    return this.marketplaceService.listDigestDispatchRuns(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('digests/generate')
  generateDigest(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(marketplaceDto.generateMarketplaceDigestSchema))
    body: marketplaceDto.GenerateMarketplaceDigestDto,
  ) {
    return this.marketplaceService.generateDigest(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('digest-dispatch-runs/dispatch')
  dispatchDigests(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(marketplaceDto.dispatchMarketplaceDigestsSchema),
    )
    body: marketplaceDto.DispatchMarketplaceDigestsDto,
  ) {
    return this.marketplaceService.dispatchDigests(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Patch('digests/:id')
  updateDigest(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.updateMarketplaceDigestSchema))
    body: marketplaceDto.UpdateMarketplaceDigestDto,
  ) {
    return this.marketplaceService.updateDigest(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('automation-runs/dispatch')
  dispatchAutomationRuns(
    @User() user: ReqUser,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.dispatchMarketplaceAutomationRunsSchema,
      ),
    )
    body: marketplaceDto.DispatchMarketplaceAutomationRunsDto,
  ) {
    return this.marketplaceService.dispatchAutomationRuns(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('automation-rules/:id/run')
  runAutomationRule(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.runMarketplaceAutomationRuleSchema),
    )
    body: marketplaceDto.RunMarketplaceAutomationRuleDto,
  ) {
    return this.marketplaceService.runAutomationRule(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('lifecycle/digest')
  getLifecycleDigest(@User() user: ReqUser) {
    return this.marketplaceService.getLifecycleDigest(user.id);
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
  @Get('jobs/:id/reviews')
  getJobReviews(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getJobReviews(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('jobs/:id/reviews')
  createJobReview(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.createMarketplaceReviewSchema))
    body: marketplaceDto.CreateMarketplaceReviewDto,
  ) {
    return this.marketplaceService.createJobReview(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('jobs/:id/rehire-opportunity')
  createRehireOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.createMarketplaceRehireOpportunitySchema,
      ),
    )
    body: marketplaceDto.CreateMarketplaceRehireOpportunityDto,
  ) {
    return this.marketplaceService.createRehireOpportunity(user.id, id, body);
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
    return this.marketplaceService.updateOpportunityScreening(
      user.id,
      id,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/pause')
  pauseOpportunity(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.pauseOpportunity(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/:id/applications')
  getOpportunityApplications(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getOpportunityApplications(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/:id/matches')
  getOpportunityMatches(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getOpportunityMatches(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('invites/mine')
  listMyInvites(@User() user: ReqUser) {
    return this.marketplaceService.listMyOpportunityInvites(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/invite')
  inviteTalentToOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.createMarketplaceOpportunityInviteSchema,
      ),
    )
    body: marketplaceDto.CreateMarketplaceOpportunityInviteDto,
  ) {
    return this.marketplaceService.inviteTalentToOpportunity(user.id, id, body);
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
  @Post('profiles/:slug/report')
  reportProfile(
    @User() user: ReqUser,
    @Param('slug') slug: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.createMarketplaceAbuseReportSchema),
    )
    body: marketplaceDto.CreateMarketplaceAbuseReportDto,
  ) {
    return this.marketplaceService.reportProfile(user.id, slug, body);
  }

  @UseGuards(AuthGuard)
  @Post('opportunities/:id/report')
  reportOpportunity(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.createMarketplaceAbuseReportSchema),
    )
    body: marketplaceDto.CreateMarketplaceAbuseReportDto,
  ) {
    return this.marketplaceService.reportOpportunity(user.id, id, body);
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
  withdrawApplication(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.applicationDecisionNoteSchema))
    body: marketplaceDto.ApplicationDecisionNoteDto,
  ) {
    return this.marketplaceService.withdrawApplication(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/shortlist')
  shortlistApplication(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.applicationDecisionNoteSchema))
    body: marketplaceDto.ApplicationDecisionNoteDto = {},
  ) {
    return this.marketplaceService.shortlistApplication(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/reject')
  rejectApplication(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.applicationDecisionNoteSchema))
    body: marketplaceDto.ApplicationDecisionNoteDto,
  ) {
    return this.marketplaceService.rejectApplication(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/revisions')
  reviseApplication(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.reviseMarketplaceApplicationSchema),
    )
    body: marketplaceDto.ReviseMarketplaceApplicationDto,
  ) {
    return this.marketplaceService.reviseApplication(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('applications/:id/timeline')
  getApplicationTimeline(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getApplicationTimeline(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('applications/:id/interview')
  getApplicationInterviewThread(
    @User() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.marketplaceService.getApplicationInterviewThread(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/interview/read')
  markApplicationInterviewThreadRead(
    @User() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.marketplaceService.markApplicationInterviewThreadRead(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/interview/messages')
  postApplicationInterviewMessage(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.createMarketplaceInterviewMessageSchema,
      ),
    )
    body: marketplaceDto.CreateMarketplaceInterviewMessageDto,
  ) {
    return this.marketplaceService.postApplicationInterviewMessage(
      user.id,
      id,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/offers')
  createApplicationOffer(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.createMarketplaceOfferSchema))
    body: marketplaceDto.CreateMarketplaceOfferDto,
  ) {
    return this.marketplaceService.createApplicationOffer(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('applications/:id/hire')
  hireApplication(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.applicationDecisionNoteSchema))
    body: marketplaceDto.ApplicationDecisionNoteDto = {},
  ) {
    return this.marketplaceService.hireApplication(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('opportunities/:id/compare')
  getOpportunityApplicationComparison(
    @User() user: ReqUser,
    @Param('id') id: string,
  ) {
    return this.marketplaceService.getOpportunityApplicationComparison(
      user.id,
      id,
    );
  }

  @UseGuards(AuthGuard)
  @Post('offers/:id/respond')
  respondToMarketplaceOffer(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketplaceDto.respondToMarketplaceOfferSchema))
    body: marketplaceDto.RespondToMarketplaceOfferDto,
  ) {
    return this.marketplaceService.respondToMarketplaceOffer(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Get('contract-drafts/:id')
  getMarketplaceContractDraft(@User() user: ReqUser, @Param('id') id: string) {
    return this.marketplaceService.getMarketplaceContractDraft(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('contract-drafts/:id/revise')
  reviseMarketplaceContractDraft(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.reviseMarketplaceContractDraftSchema,
      ),
    )
    body: marketplaceDto.ReviseMarketplaceContractDraftDto,
  ) {
    return this.marketplaceService.reviseMarketplaceContractDraft(
      user.id,
      id,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('contract-drafts/:id/approve')
  approveMarketplaceContractDraft(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.approveMarketplaceContractDraftSchema,
      ),
    )
    body: marketplaceDto.ApproveMarketplaceContractDraftDto,
  ) {
    return this.marketplaceService.approveMarketplaceContractDraft(
      user.id,
      id,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('contract-drafts/:id/convert')
  convertMarketplaceContractDraft(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.convertMarketplaceContractDraftSchema,
      ),
    )
    body: marketplaceDto.ConvertMarketplaceContractDraftDto,
  ) {
    return this.marketplaceService.convertMarketplaceContractDraft(
      user.id,
      id,
      body,
    );
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
  @Get('moderation/reports')
  listModerationReports(
    @User() user: ReqUser,
    @Query(
      new ZodValidationPipe(
        marketplaceDto.marketplaceModerationReportsQuerySchema,
      ),
    )
    query: marketplaceDto.MarketplaceModerationReportsQueryDto,
  ) {
    return this.marketplaceService.listModerationReports(user.id, query);
  }

  @UseGuards(AuthGuard)
  @Get('moderation/reviews')
  listModerationReviews(@User() user: ReqUser) {
    return this.marketplaceService.listModerationReviews(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('moderation/intelligence')
  getModerationIntelligence(@User() user: ReqUser) {
    return this.marketplaceService.getModerationIntelligence(user.id);
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

  @UseGuards(AuthGuard)
  @Post('moderation/reviews/:id')
  updateModerationReview(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.updateMarketplaceReviewModerationSchema,
      ),
    )
    body: marketplaceDto.UpdateMarketplaceReviewModerationDto,
  ) {
    return this.marketplaceService.updateModerationReview(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('moderation/reports/:id')
  updateModerationReport(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(marketplaceDto.updateMarketplaceAbuseReportSchema),
    )
    body: marketplaceDto.UpdateMarketplaceAbuseReportDto,
  ) {
    return this.marketplaceService.updateModerationReport(user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('moderation/identity/:userId')
  updateIdentityRiskReview(
    @User() user: ReqUser,
    @Param('userId') targetUserId: string,
    @Body(
      new ZodValidationPipe(
        marketplaceDto.updateMarketplaceIdentityRiskReviewSchema,
      ),
    )
    body: marketplaceDto.UpdateMarketplaceIdentityRiskReviewDto,
  ) {
    return this.marketplaceService.updateIdentityRiskReview(
      user.id,
      targetUserId,
      body,
    );
  }
}
