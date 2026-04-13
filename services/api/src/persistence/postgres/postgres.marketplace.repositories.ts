import type { QueryResultRow } from 'pg';
import type {
  MarketplaceApplicationRecord,
  MarketplaceCryptoReadiness,
  MarketplaceEngagementType,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceTalentProofArtifact,
} from '../../modules/marketplace/marketplace.types';
import type { MarketplaceRepository } from '../persistence.types';
import { PostgresDatabaseService } from './postgres-database.service';

type MarketplaceProfileRow = QueryResultRow & {
  user_id: string;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  skills_json: string[];
  specialties_json: string[];
  portfolio_urls_json: string[];
  preferred_engagements_json: MarketplaceEngagementType[];
  proof_artifacts_json: MarketplaceTalentProofArtifact[];
  rate_min: string | null;
  rate_max: string | null;
  timezone: string;
  availability: MarketplaceProfileRecord['availability'];
  crypto_readiness: MarketplaceCryptoReadiness;
  moderation_status: MarketplaceProfileRecord['moderationStatus'];
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceOpportunityRow = QueryResultRow & {
  id: string;
  owner_user_id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  currency_address: string;
  required_skills_json: string[];
  must_have_skills_json: string[];
  outcomes_json: string[];
  acceptance_criteria_json: string[];
  screening_questions_json: MarketplaceScreeningQuestion[];
  visibility: MarketplaceOpportunityRecord['visibility'];
  status: MarketplaceOpportunityRecord['status'];
  budget_min: string | null;
  budget_max: string | null;
  timeline: string;
  desired_start_at_ms: string | null;
  timezone_overlap_hours: number | null;
  engagement_type: MarketplaceEngagementType;
  crypto_readiness_required: MarketplaceCryptoReadiness;
  moderation_status: MarketplaceOpportunityRecord['moderationStatus'];
  published_at_ms: string | null;
  hired_application_id: string | null;
  hired_job_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceApplicationRow = QueryResultRow & {
  id: string;
  opportunity_id: string;
  applicant_user_id: string;
  cover_note: string;
  proposed_rate: string | null;
  selected_wallet_address: string;
  screening_answers_json: MarketplaceScreeningAnswer[];
  delivery_approach: string;
  milestone_plan_summary: string;
  estimated_start_at_ms: string | null;
  relevant_proof_artifacts_json: MarketplaceTalentProofArtifact[];
  portfolio_urls_json: string[];
  status: MarketplaceApplicationRecord['status'];
  hired_job_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

function mapProfile(row: MarketplaceProfileRow): MarketplaceProfileRecord {
  return {
    userId: row.user_id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    skills: row.skills_json ?? [],
    specialties: row.specialties_json ?? [],
    portfolioUrls: row.portfolio_urls_json ?? [],
    preferredEngagements: row.preferred_engagements_json ?? [],
    proofArtifacts: row.proof_artifacts_json ?? [],
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    timezone: row.timezone,
    availability: row.availability,
    cryptoReadiness: row.crypto_readiness,
    moderationStatus: row.moderation_status,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapOpportunity(
  row: MarketplaceOpportunityRow,
): MarketplaceOpportunityRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    currencyAddress: row.currency_address,
    requiredSkills: row.required_skills_json ?? [],
    mustHaveSkills: row.must_have_skills_json ?? [],
    outcomes: row.outcomes_json ?? [],
    acceptanceCriteria: row.acceptance_criteria_json ?? [],
    screeningQuestions: row.screening_questions_json ?? [],
    visibility: row.visibility,
    status: row.status,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    timeline: row.timeline,
    desiredStartAt:
      row.desired_start_at_ms === null ? null : Number(row.desired_start_at_ms),
    timezoneOverlapHours: row.timezone_overlap_hours,
    engagementType: row.engagement_type,
    cryptoReadinessRequired: row.crypto_readiness_required,
    moderationStatus: row.moderation_status,
    publishedAt:
      row.published_at_ms === null ? null : Number(row.published_at_ms),
    hiredApplicationId: row.hired_application_id,
    hiredJobId: row.hired_job_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapApplication(
  row: MarketplaceApplicationRow,
): MarketplaceApplicationRecord {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    applicantUserId: row.applicant_user_id,
    coverNote: row.cover_note,
    proposedRate: row.proposed_rate,
    selectedWalletAddress: row.selected_wallet_address,
    screeningAnswers: row.screening_answers_json ?? [],
    deliveryApproach: row.delivery_approach,
    milestonePlanSummary: row.milestone_plan_summary,
    estimatedStartAt:
      row.estimated_start_at_ms === null
        ? null
        : Number(row.estimated_start_at_ms),
    relevantProofArtifacts: row.relevant_proof_artifacts_json ?? [],
    portfolioUrls: row.portfolio_urls_json ?? [],
    status: row.status,
    hiredJobId: row.hired_job_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

export class PostgresMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly db: PostgresDatabaseService) {}

  async getProfileByUserId(userId: string) {
    const result = await this.db.query<MarketplaceProfileRow>(
      `
        SELECT *
        FROM marketplace_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async getProfileBySlug(slug: string) {
    const result = await this.db.query<MarketplaceProfileRow>(
      `
        SELECT *
        FROM marketplace_profiles
        WHERE slug = $1
        LIMIT 1
      `,
      [slug.trim().toLowerCase()],
    );

    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async listProfiles() {
    const result = await this.db.query<MarketplaceProfileRow>(
      `
        SELECT *
        FROM marketplace_profiles
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapProfile);
  }

  async saveProfile(profile: MarketplaceProfileRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_profiles (
          user_id,
          slug,
          display_name,
          headline,
          bio,
          skills_json,
          specialties_json,
          portfolio_urls_json,
          preferred_engagements_json,
          proof_artifacts_json,
          rate_min,
          rate_max,
          timezone,
          availability,
          crypto_readiness,
          moderation_status,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
          $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          slug = EXCLUDED.slug,
          display_name = EXCLUDED.display_name,
          headline = EXCLUDED.headline,
          bio = EXCLUDED.bio,
          skills_json = EXCLUDED.skills_json,
          specialties_json = EXCLUDED.specialties_json,
          portfolio_urls_json = EXCLUDED.portfolio_urls_json,
          preferred_engagements_json = EXCLUDED.preferred_engagements_json,
          proof_artifacts_json = EXCLUDED.proof_artifacts_json,
          rate_min = EXCLUDED.rate_min,
          rate_max = EXCLUDED.rate_max,
          timezone = EXCLUDED.timezone,
          availability = EXCLUDED.availability,
          crypto_readiness = EXCLUDED.crypto_readiness,
          moderation_status = EXCLUDED.moderation_status,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        profile.userId,
        profile.slug,
        profile.displayName,
        profile.headline,
        profile.bio,
        JSON.stringify(profile.skills),
        JSON.stringify(profile.specialties),
        JSON.stringify(profile.portfolioUrls),
        JSON.stringify(profile.preferredEngagements),
        JSON.stringify(profile.proofArtifacts),
        profile.rateMin,
        profile.rateMax,
        profile.timezone,
        profile.availability,
        profile.cryptoReadiness,
        profile.moderationStatus,
        String(profile.createdAt),
        String(profile.updatedAt),
      ],
    );
  }

  async getOpportunityById(opportunityId: string) {
    const result = await this.db.query<MarketplaceOpportunityRow>(
      `
        SELECT *
        FROM marketplace_opportunities
        WHERE id = $1
        LIMIT 1
      `,
      [opportunityId],
    );

    return result.rows[0] ? mapOpportunity(result.rows[0]) : null;
  }

  async listOpportunities() {
    const result = await this.db.query<MarketplaceOpportunityRow>(
      `
        SELECT *
        FROM marketplace_opportunities
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapOpportunity);
  }

  async saveOpportunity(opportunity: MarketplaceOpportunityRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_opportunities (
          id,
          owner_user_id,
          title,
          summary,
          description,
          category,
          currency_address,
          required_skills_json,
          must_have_skills_json,
          outcomes_json,
          acceptance_criteria_json,
          screening_questions_json,
          visibility,
          status,
          budget_min,
          budget_max,
          timeline,
          desired_start_at_ms,
          timezone_overlap_hours,
          engagement_type,
          crypto_readiness_required,
          moderation_status,
          published_at_ms,
          hired_application_id,
          hired_job_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          currency_address = EXCLUDED.currency_address,
          required_skills_json = EXCLUDED.required_skills_json,
          must_have_skills_json = EXCLUDED.must_have_skills_json,
          outcomes_json = EXCLUDED.outcomes_json,
          acceptance_criteria_json = EXCLUDED.acceptance_criteria_json,
          screening_questions_json = EXCLUDED.screening_questions_json,
          visibility = EXCLUDED.visibility,
          status = EXCLUDED.status,
          budget_min = EXCLUDED.budget_min,
          budget_max = EXCLUDED.budget_max,
          timeline = EXCLUDED.timeline,
          desired_start_at_ms = EXCLUDED.desired_start_at_ms,
          timezone_overlap_hours = EXCLUDED.timezone_overlap_hours,
          engagement_type = EXCLUDED.engagement_type,
          crypto_readiness_required = EXCLUDED.crypto_readiness_required,
          moderation_status = EXCLUDED.moderation_status,
          published_at_ms = EXCLUDED.published_at_ms,
          hired_application_id = EXCLUDED.hired_application_id,
          hired_job_id = EXCLUDED.hired_job_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        opportunity.id,
        opportunity.ownerUserId,
        opportunity.title,
        opportunity.summary,
        opportunity.description,
        opportunity.category,
        opportunity.currencyAddress,
        JSON.stringify(opportunity.requiredSkills),
        JSON.stringify(opportunity.mustHaveSkills),
        JSON.stringify(opportunity.outcomes),
        JSON.stringify(opportunity.acceptanceCriteria),
        JSON.stringify(opportunity.screeningQuestions),
        opportunity.visibility,
        opportunity.status,
        opportunity.budgetMin,
        opportunity.budgetMax,
        opportunity.timeline,
        opportunity.desiredStartAt === null
          ? null
          : String(opportunity.desiredStartAt),
        opportunity.timezoneOverlapHours,
        opportunity.engagementType,
        opportunity.cryptoReadinessRequired,
        opportunity.moderationStatus,
        opportunity.publishedAt === null
          ? null
          : String(opportunity.publishedAt),
        opportunity.hiredApplicationId,
        opportunity.hiredJobId,
        String(opportunity.createdAt),
        String(opportunity.updatedAt),
      ],
    );
  }

  async getApplicationById(applicationId: string) {
    const result = await this.db.query<MarketplaceApplicationRow>(
      `
        SELECT *
        FROM marketplace_applications
        WHERE id = $1
        LIMIT 1
      `,
      [applicationId],
    );

    return result.rows[0] ? mapApplication(result.rows[0]) : null;
  }

  async listApplications() {
    const result = await this.db.query<MarketplaceApplicationRow>(
      `
        SELECT *
        FROM marketplace_applications
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapApplication);
  }

  async saveApplication(application: MarketplaceApplicationRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_applications (
          id,
          opportunity_id,
          applicant_user_id,
          cover_note,
          proposed_rate,
          selected_wallet_address,
          screening_answers_json,
          delivery_approach,
          milestone_plan_summary,
          estimated_start_at_ms,
          relevant_proof_artifacts_json,
          portfolio_urls_json,
          status,
          hired_job_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16
        )
        ON CONFLICT (id)
        DO UPDATE SET
          cover_note = EXCLUDED.cover_note,
          proposed_rate = EXCLUDED.proposed_rate,
          selected_wallet_address = EXCLUDED.selected_wallet_address,
          screening_answers_json = EXCLUDED.screening_answers_json,
          delivery_approach = EXCLUDED.delivery_approach,
          milestone_plan_summary = EXCLUDED.milestone_plan_summary,
          estimated_start_at_ms = EXCLUDED.estimated_start_at_ms,
          relevant_proof_artifacts_json = EXCLUDED.relevant_proof_artifacts_json,
          portfolio_urls_json = EXCLUDED.portfolio_urls_json,
          status = EXCLUDED.status,
          hired_job_id = EXCLUDED.hired_job_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        application.id,
        application.opportunityId,
        application.applicantUserId,
        application.coverNote,
        application.proposedRate,
        application.selectedWalletAddress,
        JSON.stringify(application.screeningAnswers),
        application.deliveryApproach,
        application.milestonePlanSummary,
        application.estimatedStartAt === null
          ? null
          : String(application.estimatedStartAt),
        JSON.stringify(application.relevantProofArtifacts),
        JSON.stringify(application.portfolioUrls),
        application.status,
        application.hiredJobId,
        String(application.createdAt),
        String(application.updatedAt),
      ],
    );
  }
}
