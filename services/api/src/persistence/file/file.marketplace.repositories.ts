import type {
  MarketplaceApplicationDecisionRecord,
  MarketplaceAbuseReportRecord,
  MarketplaceApplicationRecord,
  MarketplaceApplicationRevisionRecord,
  MarketplaceDigestRecord,
  MarketplaceNotificationPreferencesRecord,
  MarketplaceNotificationRecord,
  MarketplaceAutomationRunRecord,
  MarketplaceAutomationRuleRecord,
  MarketplaceContractDraftRecord,
  MarketplaceContractDraftRevisionRecord,
  MarketplaceContractMetadataSnapshot,
  MarketplaceIdentityRiskReviewRecord,
  MarketplaceInteractionEventRecord,
  MarketplaceInterviewMessageRecord,
  MarketplaceInterviewThreadRecord,
  MarketplaceOfferMilestoneDraft,
  MarketplaceOfferRecord,
  MarketplaceOpportunityInviteRecord,
  MarketplaceOpportunitySearchDocument,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceReviewRecord,
  MarketplaceSavedSearchRecord,
  MarketplaceTalentPoolMemberRecord,
  MarketplaceTalentPoolRecord,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceTalentSearchDocument,
  MarketplaceTalentProofArtifact,
} from '../../modules/marketplace/marketplace.types';
import type { MarketplaceRepository } from '../persistence.types';
import { FilePersistenceStore } from './file-persistence.store';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function normalizeTextList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()))).filter(
    Boolean,
  );
}

function normalizeProofArtifacts(values: MarketplaceTalentProofArtifact[]) {
  return values.map((artifact) => ({
    ...artifact,
    id: artifact.id.trim(),
    label: artifact.label.trim(),
    url: artifact.url.trim(),
    jobId: artifact.jobId?.trim() || null,
  }));
}

function normalizeScreeningQuestions(values: MarketplaceScreeningQuestion[]) {
  return values.map((question) => ({
    ...question,
    id: question.id.trim(),
    prompt: question.prompt.trim(),
  }));
}

function normalizeScreeningAnswers(values: MarketplaceScreeningAnswer[]) {
  return values.map((answer) => ({
    ...answer,
    questionId: answer.questionId.trim(),
    answer: answer.answer.trim(),
  }));
}

function normalizeProfile(
  profile: MarketplaceProfileRecord,
): MarketplaceProfileRecord {
  return {
    ...profile,
    slug: profile.slug.trim().toLowerCase(),
    skills: normalizeTextList(profile.skills),
    specialties: normalizeTextList(profile.specialties),
    portfolioUrls: normalizeTextList(profile.portfolioUrls),
    preferredEngagements: Array.from(new Set(profile.preferredEngagements)),
    proofArtifacts: normalizeProofArtifacts(profile.proofArtifacts),
  };
}

function normalizeOpportunity(
  opportunity: MarketplaceOpportunityRecord,
): MarketplaceOpportunityRecord {
  return {
    ...opportunity,
    category: opportunity.category.trim().toLowerCase(),
    requiredSkills: normalizeTextList(opportunity.requiredSkills),
    mustHaveSkills: normalizeTextList(opportunity.mustHaveSkills),
    outcomes: normalizeTextList(opportunity.outcomes),
    acceptanceCriteria: normalizeTextList(opportunity.acceptanceCriteria),
    screeningQuestions: normalizeScreeningQuestions(
      opportunity.screeningQuestions,
    ),
  };
}

function normalizeApplication(
  application: MarketplaceApplicationRecord,
): MarketplaceApplicationRecord {
  return {
    ...application,
    screeningAnswers: normalizeScreeningAnswers(application.screeningAnswers),
    relevantProofArtifacts: normalizeProofArtifacts(
      application.relevantProofArtifacts,
    ),
    portfolioUrls: normalizeTextList(application.portfolioUrls),
    deliveryApproach: application.deliveryApproach.trim(),
    milestonePlanSummary: application.milestonePlanSummary.trim(),
  };
}

function normalizeApplicationRevision(
  revision: MarketplaceApplicationRevisionRecord,
): MarketplaceApplicationRevisionRecord {
  return {
    ...revision,
    screeningAnswers: normalizeScreeningAnswers(revision.screeningAnswers),
    relevantProofArtifacts: normalizeProofArtifacts(
      revision.relevantProofArtifacts,
    ),
    portfolioUrls: normalizeTextList(revision.portfolioUrls),
    revisionReason: revision.revisionReason?.trim() || null,
  };
}

function normalizeInterviewThread(
  thread: MarketplaceInterviewThreadRecord,
): MarketplaceInterviewThreadRecord {
  return {
    ...thread,
  };
}

function normalizeInterviewMessage(
  message: MarketplaceInterviewMessageRecord,
): MarketplaceInterviewMessageRecord {
  return {
    ...message,
    body: message.body.trim(),
  };
}

function normalizeOfferMilestones(values: MarketplaceOfferMilestoneDraft[]) {
  return values.map((milestone) => ({
    ...milestone,
    title: milestone.title.trim(),
    deliverable: milestone.deliverable.trim(),
  }));
}

function normalizeOffer(offer: MarketplaceOfferRecord): MarketplaceOfferRecord {
  return {
    ...offer,
    message: offer.message?.trim() || null,
    counterMessage: offer.counterMessage?.trim() || null,
    declineReason: offer.declineReason?.trim() || null,
    milestones: normalizeOfferMilestones(offer.milestones),
  };
}

function normalizeContractSnapshot(
  snapshot: MarketplaceContractMetadataSnapshot,
): MarketplaceContractMetadataSnapshot {
  return {
    ...snapshot,
    title: snapshot.title.trim(),
    description: snapshot.description.trim(),
    category: snapshot.category.trim().toLowerCase(),
    contractorEmail: snapshot.contractorEmail.trim().toLowerCase(),
    workerAddress: snapshot.workerAddress.trim(),
    currencyAddress: snapshot.currencyAddress.trim(),
    scopeSummary: snapshot.scopeSummary.trim(),
    acceptanceCriteria: normalizeTextList(snapshot.acceptanceCriteria),
    outcomes: normalizeTextList(snapshot.outcomes),
    timeline: snapshot.timeline.trim(),
    milestones: normalizeOfferMilestones(snapshot.milestones),
    disputeModel: snapshot.disputeModel.trim(),
    evidenceExpectation: snapshot.evidenceExpectation.trim(),
    kickoffNote: snapshot.kickoffNote.trim(),
    platformFeeLabel: snapshot.platformFeeLabel.trim(),
  };
}

function normalizeContractDraftRevisions(
  revisions: MarketplaceContractDraftRevisionRecord[],
) {
  return revisions.map((revision) => ({
    ...revision,
    snapshot: normalizeContractSnapshot(revision.snapshot),
    reason: revision.reason?.trim() || null,
  }));
}

function normalizeContractDraft(
  draft: MarketplaceContractDraftRecord,
): MarketplaceContractDraftRecord {
  return {
    ...draft,
    latestSnapshot: normalizeContractSnapshot(draft.latestSnapshot),
    revisions: normalizeContractDraftRevisions(draft.revisions),
  };
}

function normalizeApplicationDecision(
  decision: MarketplaceApplicationDecisionRecord,
): MarketplaceApplicationDecisionRecord {
  return {
    ...decision,
    reason: decision.reason?.trim() || null,
    noHireReason: decision.noHireReason ?? null,
  };
}

function normalizeAbuseReport(
  report: MarketplaceAbuseReportRecord,
): MarketplaceAbuseReportRecord {
  return {
    ...report,
    subjectId: report.subjectId.trim(),
    details: report.details?.trim() || null,
    evidenceUrls: normalizeTextList(report.evidenceUrls),
    claimedByUserId: report.claimedByUserId ?? null,
    claimedAt: report.claimedAt ?? null,
    escalationReason: report.escalationReason?.trim() || null,
    escalatedByUserId: report.escalatedByUserId ?? null,
    escalatedAt: report.escalatedAt ?? null,
    evidenceReviewStatus: report.evidenceReviewStatus ?? 'pending',
    investigationSummary: report.investigationSummary?.trim() || null,
    evidenceReviewedByUserId: report.evidenceReviewedByUserId ?? null,
    evidenceReviewedAt: report.evidenceReviewedAt ?? null,
    resolutionNote: report.resolutionNote?.trim() || null,
    subjectModerationStatus: report.subjectModerationStatus ?? null,
    subjectModeratedByUserId: report.subjectModeratedByUserId ?? null,
    subjectModeratedAt: report.subjectModeratedAt ?? null,
  };
}

function normalizeTalentSearchDocument(
  document: MarketplaceTalentSearchDocument,
): MarketplaceTalentSearchDocument {
  return {
    ...document,
    profileSlug: document.profileSlug.trim().toLowerCase(),
    searchableText: document.searchableText.trim(),
    skills: normalizeTextList(document.skills),
    specialties: normalizeTextList(document.specialties),
    reasons: document.reasons.map((reason) => ({
      ...reason,
      label: reason.label.trim(),
    })),
  };
}

function normalizeOpportunitySearchDocument(
  document: MarketplaceOpportunitySearchDocument,
): MarketplaceOpportunitySearchDocument {
  return {
    ...document,
    category: document.category.trim().toLowerCase(),
    searchableText: document.searchableText.trim(),
    requiredSkills: normalizeTextList(document.requiredSkills),
    mustHaveSkills: normalizeTextList(document.mustHaveSkills),
    reasons: document.reasons.map((reason) => ({
      ...reason,
      label: reason.label.trim(),
    })),
  };
}

function normalizeSavedSearch(
  search: MarketplaceSavedSearchRecord,
): MarketplaceSavedSearchRecord {
  return {
    ...search,
    label: search.label.trim(),
  };
}

function normalizeTalentPool(
  pool: MarketplaceTalentPoolRecord,
): MarketplaceTalentPoolRecord {
  return {
    ...pool,
    label: pool.label.trim(),
    focusSkills: normalizeTextList(pool.focusSkills),
    note: pool.note?.trim() || null,
  };
}

function normalizeTalentPoolMember(
  member: MarketplaceTalentPoolMemberRecord,
): MarketplaceTalentPoolMemberRecord {
  return {
    ...member,
    profileSlug: member.profileSlug.trim().toLowerCase(),
    note: member.note?.trim() || null,
    sourceOpportunityId: member.sourceOpportunityId?.trim() || null,
    sourceApplicationId: member.sourceApplicationId?.trim() || null,
    sourceJobId: member.sourceJobId?.trim() || null,
  };
}

function normalizeAutomationRule(
  rule: MarketplaceAutomationRuleRecord,
): MarketplaceAutomationRuleRecord {
  return {
    ...rule,
    label: rule.label.trim(),
    targetId: rule.targetId?.trim() || null,
  };
}

function normalizeAutomationRun(
  run: MarketplaceAutomationRunRecord,
): MarketplaceAutomationRunRecord {
  return {
    ...run,
    ruleLabel: run.ruleLabel.trim(),
    matchedTaskIds: normalizeTextList(run.matchedTaskIds),
    items: run.items.map((item) => ({
      ...item,
      title: item.title.trim(),
      detail: item.detail.trim(),
      relatedEntityId: item.relatedEntityId?.trim() || null,
      recommendation: item.recommendation.trim(),
    })),
    summary: run.summary.trim(),
  };
}

function normalizeNotification(
  notification: MarketplaceNotificationRecord,
): MarketplaceNotificationRecord {
  return {
    ...notification,
    workspaceId: notification.workspaceId?.trim() || null,
    title: notification.title.trim(),
    detail: notification.detail.trim(),
    actorUserId: notification.actorUserId?.trim() || null,
    relatedOpportunityId: notification.relatedOpportunityId?.trim() || null,
    relatedApplicationId: notification.relatedApplicationId?.trim() || null,
    relatedOfferId: notification.relatedOfferId?.trim() || null,
    relatedJobId: notification.relatedJobId?.trim() || null,
    relatedAutomationRunId: notification.relatedAutomationRunId?.trim() || null,
  };
}

function normalizeNotificationPreferences(
  preferences: MarketplaceNotificationPreferencesRecord,
): MarketplaceNotificationPreferencesRecord {
  return {
    ...preferences,
  };
}

function normalizeDigest(digest: MarketplaceDigestRecord): MarketplaceDigestRecord {
  return {
    ...digest,
    workspaceId: digest.workspaceId?.trim() || null,
    title: digest.title.trim(),
    summary: digest.summary.trim(),
    highlights: digest.highlights.map((highlight) => ({
      ...highlight,
      title: highlight.title.trim(),
      detail: highlight.detail.trim(),
      relatedEntityId: highlight.relatedEntityId?.trim() || null,
    })),
  };
}

function normalizeOpportunityInvite(
  invite: MarketplaceOpportunityInviteRecord,
): MarketplaceOpportunityInviteRecord {
  return {
    ...invite,
    invitedProfileSlug: invite.invitedProfileSlug.trim().toLowerCase(),
    message: invite.message?.trim() || null,
  };
}

function normalizeReview(review: MarketplaceReviewRecord): MarketplaceReviewRecord {
  return {
    ...review,
    headline: review.headline?.trim() || null,
    body: review.body?.trim() || null,
    moderationNote: review.moderationNote?.trim() || null,
  };
}

function normalizeIdentityRiskReview(
  review: MarketplaceIdentityRiskReviewRecord,
): MarketplaceIdentityRiskReviewRecord {
  return {
    ...review,
    flags: Array.from(new Set(review.flags)),
    operatorSummary: review.operatorSummary?.trim() || null,
  };
}

function normalizeInteractionEvent(
  event: MarketplaceInteractionEventRecord,
): MarketplaceInteractionEventRecord {
  return {
    ...event,
    entityId: event.entityId?.trim() || null,
    queryLabel: event.queryLabel?.trim() || null,
    category: event.category?.trim().toLowerCase() || null,
    timezone: event.timezone?.trim() || null,
    skillTags: normalizeTextList(event.skillTags),
    relatedOpportunityId: event.relatedOpportunityId?.trim() || null,
    relatedProfileUserId: event.relatedProfileUserId?.trim() || null,
    relatedApplicationId: event.relatedApplicationId?.trim() || null,
    relatedJobId: event.relatedJobId?.trim() || null,
    resultCount: Math.max(1, Math.trunc(event.resultCount || 1)),
  };
}

export class FileMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async getProfileByUserId(userId: string) {
    return this.store.read((data) => {
      const profile = data.marketplaceProfiles[userId];
      return profile ? cloneValue(normalizeProfile(profile)) : null;
    });
  }

  async getProfileBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    return this.store.read((data) => {
      const profile = Object.values(data.marketplaceProfiles).find(
        (candidate) => candidate.slug === normalizedSlug,
      );
      return profile ? cloneValue(normalizeProfile(profile)) : null;
    });
  }

  async listProfiles() {
    return this.store.read((data) =>
      Object.values(data.marketplaceProfiles)
        .map((profile) => cloneValue(normalizeProfile(profile)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveProfile(profile: MarketplaceProfileRecord) {
    await this.store.write((data) => {
      data.marketplaceProfiles[profile.userId] = cloneValue(
        normalizeProfile(profile),
      );
    });
  }

  async listTalentSearchDocuments() {
    return this.store.read((data) =>
      Object.values(data.marketplaceTalentSearchDocuments)
        .map((document) => cloneValue(normalizeTalentSearchDocument(document)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveTalentSearchDocument(document: MarketplaceTalentSearchDocument) {
    await this.store.write((data) => {
      data.marketplaceTalentSearchDocuments[document.profileUserId] = cloneValue(
        normalizeTalentSearchDocument(document),
      );
    });
  }

  async getOpportunityById(opportunityId: string) {
    return this.store.read((data) => {
      const opportunity = data.marketplaceOpportunities[opportunityId];
      return opportunity ? cloneValue(normalizeOpportunity(opportunity)) : null;
    });
  }

  async listOpportunities() {
    return this.store.read((data) =>
      Object.values(data.marketplaceOpportunities)
        .map((opportunity) => cloneValue(normalizeOpportunity(opportunity)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveOpportunity(opportunity: MarketplaceOpportunityRecord) {
    await this.store.write((data) => {
      data.marketplaceOpportunities[opportunity.id] = cloneValue(
        normalizeOpportunity(opportunity),
      );
    });
  }

  async listOpportunitySearchDocuments() {
    return this.store.read((data) =>
      Object.values(data.marketplaceOpportunitySearchDocuments)
        .map((document) =>
          cloneValue(normalizeOpportunitySearchDocument(document)),
        )
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveOpportunitySearchDocument(
    document: MarketplaceOpportunitySearchDocument,
  ) {
    await this.store.write((data) => {
      data.marketplaceOpportunitySearchDocuments[document.opportunityId] =
        cloneValue(normalizeOpportunitySearchDocument(document));
    });
  }

  async getApplicationById(applicationId: string) {
    return this.store.read((data) => {
      const application = data.marketplaceApplications[applicationId];
      return application ? cloneValue(normalizeApplication(application)) : null;
    });
  }

  async listApplications() {
    return this.store.read((data) =>
      Object.values(data.marketplaceApplications)
        .map((application) => cloneValue(normalizeApplication(application)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveApplication(application: MarketplaceApplicationRecord) {
    await this.store.write((data) => {
      data.marketplaceApplications[application.id] = cloneValue(
        normalizeApplication(application),
      );
    });
  }

  async getApplicationRevisionById(revisionId: string) {
    return this.store.read((data) => {
      const revision = data.marketplaceApplicationRevisions[revisionId];
      return revision ? cloneValue(normalizeApplicationRevision(revision)) : null;
    });
  }

  async listApplicationRevisions() {
    return this.store.read((data) =>
      Object.values(data.marketplaceApplicationRevisions)
        .map((revision) => cloneValue(normalizeApplicationRevision(revision)))
        .sort((left, right) => right.createdAt - left.createdAt),
    );
  }

  async saveApplicationRevision(revision: MarketplaceApplicationRevisionRecord) {
    await this.store.write((data) => {
      data.marketplaceApplicationRevisions[revision.id] = cloneValue(
        normalizeApplicationRevision(revision),
      );
    });
  }

  async getInterviewThreadById(threadId: string) {
    return this.store.read((data) => {
      const thread = data.marketplaceInterviewThreads[threadId];
      return thread ? cloneValue(normalizeInterviewThread(thread)) : null;
    });
  }

  async listInterviewThreads() {
    return this.store.read((data) =>
      Object.values(data.marketplaceInterviewThreads)
        .map((thread) => cloneValue(normalizeInterviewThread(thread)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveInterviewThread(thread: MarketplaceInterviewThreadRecord) {
    await this.store.write((data) => {
      data.marketplaceInterviewThreads[thread.id] = cloneValue(
        normalizeInterviewThread(thread),
      );
    });
  }

  async getInterviewMessageById(messageId: string) {
    return this.store.read((data) => {
      const message = data.marketplaceInterviewMessages[messageId];
      return message ? cloneValue(normalizeInterviewMessage(message)) : null;
    });
  }

  async listInterviewMessages() {
    return this.store.read((data) =>
      Object.values(data.marketplaceInterviewMessages)
        .map((message) => cloneValue(normalizeInterviewMessage(message)))
        .sort((left, right) => left.createdAt - right.createdAt),
    );
  }

  async saveInterviewMessage(message: MarketplaceInterviewMessageRecord) {
    await this.store.write((data) => {
      data.marketplaceInterviewMessages[message.id] = cloneValue(
        normalizeInterviewMessage(message),
      );
    });
  }

  async getOfferById(offerId: string) {
    return this.store.read((data) => {
      const offer = data.marketplaceOffers[offerId];
      return offer ? cloneValue(normalizeOffer(offer)) : null;
    });
  }

  async listOffers() {
    return this.store.read((data) =>
      Object.values(data.marketplaceOffers)
        .map((offer) => cloneValue(normalizeOffer(offer)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveOffer(offer: MarketplaceOfferRecord) {
    await this.store.write((data) => {
      data.marketplaceOffers[offer.id] = cloneValue(normalizeOffer(offer));
    });
  }

  async getContractDraftById(draftId: string) {
    return this.store.read((data) => {
      const draft = data.marketplaceContractDrafts[draftId];
      return draft ? cloneValue(normalizeContractDraft(draft)) : null;
    });
  }

  async getContractDraftByApplicationId(applicationId: string) {
    return this.store.read((data) => {
      const draft = Object.values(data.marketplaceContractDrafts).find(
        (candidate) => candidate.applicationId === applicationId,
      );
      return draft ? cloneValue(normalizeContractDraft(draft)) : null;
    });
  }

  async listContractDrafts() {
    return this.store.read((data) =>
      Object.values(data.marketplaceContractDrafts)
        .map((draft) => cloneValue(normalizeContractDraft(draft)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveContractDraft(draft: MarketplaceContractDraftRecord) {
    await this.store.write((data) => {
      data.marketplaceContractDrafts[draft.id] = cloneValue(
        normalizeContractDraft(draft),
      );
    });
  }

  async getApplicationDecisionById(decisionId: string) {
    return this.store.read((data) => {
      const decision = data.marketplaceApplicationDecisions[decisionId];
      return decision ? cloneValue(normalizeApplicationDecision(decision)) : null;
    });
  }

  async listApplicationDecisions() {
    return this.store.read((data) =>
      Object.values(data.marketplaceApplicationDecisions)
        .map((decision) => cloneValue(normalizeApplicationDecision(decision)))
        .sort((left, right) => left.createdAt - right.createdAt),
    );
  }

  async saveApplicationDecision(decision: MarketplaceApplicationDecisionRecord) {
    await this.store.write((data) => {
      data.marketplaceApplicationDecisions[decision.id] = cloneValue(
        normalizeApplicationDecision(decision),
      );
    });
  }

  async getSavedSearchById(searchId: string) {
    return this.store.read((data) => {
      const search = data.marketplaceSavedSearches[searchId];
      return search ? cloneValue(normalizeSavedSearch(search)) : null;
    });
  }

  async listSavedSearches() {
    return this.store.read((data) =>
      Object.values(data.marketplaceSavedSearches)
        .map((search) => cloneValue(normalizeSavedSearch(search)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveSavedSearch(search: MarketplaceSavedSearchRecord) {
    await this.store.write((data) => {
      data.marketplaceSavedSearches[search.id] = cloneValue(
        normalizeSavedSearch(search),
      );
    });
  }

  async deleteSavedSearch(searchId: string) {
    await this.store.write((data) => {
      delete data.marketplaceSavedSearches[searchId];
    });
  }

  async getTalentPoolById(poolId: string) {
    return this.store.read((data) => {
      const pool = data.marketplaceTalentPools[poolId];
      return pool ? cloneValue(normalizeTalentPool(pool)) : null;
    });
  }

  async listTalentPools() {
    return this.store.read((data) =>
      Object.values(data.marketplaceTalentPools)
        .map((pool) => cloneValue(normalizeTalentPool(pool)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveTalentPool(pool: MarketplaceTalentPoolRecord) {
    await this.store.write((data) => {
      data.marketplaceTalentPools[pool.id] = cloneValue(normalizeTalentPool(pool));
    });
  }

  async getTalentPoolMemberById(memberId: string) {
    return this.store.read((data) => {
      const member = data.marketplaceTalentPoolMembers[memberId];
      return member ? cloneValue(normalizeTalentPoolMember(member)) : null;
    });
  }

  async listTalentPoolMembers() {
    return this.store.read((data) =>
      Object.values(data.marketplaceTalentPoolMembers)
        .map((member) => cloneValue(normalizeTalentPoolMember(member)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveTalentPoolMember(member: MarketplaceTalentPoolMemberRecord) {
    await this.store.write((data) => {
      data.marketplaceTalentPoolMembers[member.id] = cloneValue(
        normalizeTalentPoolMember(member),
      );
    });
  }

  async getAutomationRuleById(ruleId: string) {
    return this.store.read((data) => {
      const rule = data.marketplaceAutomationRules[ruleId];
      return rule ? cloneValue(normalizeAutomationRule(rule)) : null;
    });
  }

  async listAutomationRules() {
    return this.store.read((data) =>
      Object.values(data.marketplaceAutomationRules)
        .map((rule) => cloneValue(normalizeAutomationRule(rule)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveAutomationRule(rule: MarketplaceAutomationRuleRecord) {
    await this.store.write((data) => {
      data.marketplaceAutomationRules[rule.id] = cloneValue(
        normalizeAutomationRule(rule),
      );
    });
  }

  async getAutomationRunById(runId: string) {
    return this.store.read((data) => {
      const run = data.marketplaceAutomationRuns[runId];
      return run ? cloneValue(normalizeAutomationRun(run)) : null;
    });
  }

  async listAutomationRuns() {
    return this.store.read((data) =>
      Object.values(data.marketplaceAutomationRuns)
        .map((run) => cloneValue(normalizeAutomationRun(run)))
        .sort((left, right) => right.createdAt - left.createdAt),
    );
  }

  async saveAutomationRun(run: MarketplaceAutomationRunRecord) {
    await this.store.write((data) => {
      data.marketplaceAutomationRuns[run.id] = cloneValue(
        normalizeAutomationRun(run),
      );
    });
  }

  async getNotificationById(notificationId: string) {
    return this.store.read((data) => {
      const notification = data.marketplaceNotifications[notificationId];
      return notification ? cloneValue(normalizeNotification(notification)) : null;
    });
  }

  async listNotifications() {
    return this.store.read((data) =>
      Object.values(data.marketplaceNotifications)
        .map((notification) => cloneValue(normalizeNotification(notification)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveNotification(notification: MarketplaceNotificationRecord) {
    await this.store.write((data) => {
      data.marketplaceNotifications[notification.id] = cloneValue(
        normalizeNotification(notification),
      );
    });
  }

  async getNotificationPreferencesByUserId(userId: string) {
    return this.store.read((data) => {
      const preferences = data.marketplaceNotificationPreferences[userId];
      return preferences
        ? cloneValue(normalizeNotificationPreferences(preferences))
        : null;
    });
  }

  async listNotificationPreferences() {
    return this.store.read((data) =>
      Object.values(data.marketplaceNotificationPreferences)
        .map((preferences) =>
          cloneValue(normalizeNotificationPreferences(preferences)),
        )
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveNotificationPreferences(
    preferences: MarketplaceNotificationPreferencesRecord,
  ) {
    await this.store.write((data) => {
      data.marketplaceNotificationPreferences[preferences.userId] = cloneValue(
        normalizeNotificationPreferences(preferences),
      );
    });
  }

  async getDigestById(digestId: string) {
    return this.store.read((data) => {
      const digest = data.marketplaceDigests[digestId];
      return digest ? cloneValue(normalizeDigest(digest)) : null;
    });
  }

  async listDigests() {
    return this.store.read((data) =>
      Object.values(data.marketplaceDigests)
        .map((digest) => cloneValue(normalizeDigest(digest)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveDigest(digest: MarketplaceDigestRecord) {
    await this.store.write((data) => {
      data.marketplaceDigests[digest.id] = cloneValue(normalizeDigest(digest));
    });
  }

  async getOpportunityInviteById(inviteId: string) {
    return this.store.read((data) => {
      const invite = data.marketplaceOpportunityInvites[inviteId];
      return invite ? cloneValue(normalizeOpportunityInvite(invite)) : null;
    });
  }

  async listOpportunityInvites() {
    return this.store.read((data) =>
      Object.values(data.marketplaceOpportunityInvites)
        .map((invite) => cloneValue(normalizeOpportunityInvite(invite)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveOpportunityInvite(invite: MarketplaceOpportunityInviteRecord) {
    await this.store.write((data) => {
      data.marketplaceOpportunityInvites[invite.id] = cloneValue(
        normalizeOpportunityInvite(invite),
      );
    });
  }

  async getAbuseReportById(reportId: string) {
    return this.store.read((data) => {
      const report = data.marketplaceAbuseReports[reportId];
      return report ? cloneValue(normalizeAbuseReport(report)) : null;
    });
  }

  async listAbuseReports() {
    return this.store.read((data) =>
      Object.values(data.marketplaceAbuseReports)
        .map((report) => cloneValue(normalizeAbuseReport(report)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveAbuseReport(report: MarketplaceAbuseReportRecord) {
    await this.store.write((data) => {
      data.marketplaceAbuseReports[report.id] = cloneValue(
        normalizeAbuseReport(report),
      );
    });
  }

  async getReviewById(reviewId: string) {
    return this.store.read((data) => {
      const review = data.marketplaceReviews[reviewId];
      return review ? cloneValue(normalizeReview(review)) : null;
    });
  }

  async listReviews() {
    return this.store.read((data) =>
      Object.values(data.marketplaceReviews)
        .map((review) => cloneValue(normalizeReview(review)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveReview(review: MarketplaceReviewRecord) {
    await this.store.write((data) => {
      data.marketplaceReviews[review.id] = cloneValue(normalizeReview(review));
    });
  }

  async getIdentityRiskReviewByUserId(userId: string) {
    return this.store.read((data) => {
      const review = Object.values(data.marketplaceIdentityRiskReviews).find(
        (candidate) => candidate.subjectUserId === userId,
      );
      return review ? cloneValue(normalizeIdentityRiskReview(review)) : null;
    });
  }

  async listIdentityRiskReviews() {
    return this.store.read((data) =>
      Object.values(data.marketplaceIdentityRiskReviews)
        .map((review) => cloneValue(normalizeIdentityRiskReview(review)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async saveIdentityRiskReview(review: MarketplaceIdentityRiskReviewRecord) {
    await this.store.write((data) => {
      data.marketplaceIdentityRiskReviews[review.id] = cloneValue(
        normalizeIdentityRiskReview(review),
      );
    });
  }

  async listInteractionEvents() {
    return this.store.read((data) =>
      Object.values(data.marketplaceInteractionEvents)
        .map((event) => cloneValue(normalizeInteractionEvent(event)))
        .sort((left, right) => right.createdAt - left.createdAt),
    );
  }

  async saveInteractionEvent(event: MarketplaceInteractionEventRecord) {
    await this.store.write((data) => {
      data.marketplaceInteractionEvents[event.id] = cloneValue(
        normalizeInteractionEvent(event),
      );
    });
  }
}
