import type {
  MarketplaceAbuseReportRecord,
  MarketplaceApplicationRecord,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
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
    resolutionNote: report.resolutionNote?.trim() || null,
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
