import type {
  MarketplaceAbuseReportRecord,
  MarketplaceApplicationRecord,
  MarketplaceOpportunityInviteRecord,
  MarketplaceOpportunitySearchDocument,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceSavedSearchRecord,
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

function normalizeOpportunityInvite(
  invite: MarketplaceOpportunityInviteRecord,
): MarketplaceOpportunityInviteRecord {
  return {
    ...invite,
    invitedProfileSlug: invite.invitedProfileSlug.trim().toLowerCase(),
    message: invite.message?.trim() || null,
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
}
