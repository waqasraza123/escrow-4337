import type { QueryResultRow } from 'pg';
import type {
  MarketplaceApplicationDecisionRecord,
  MarketplaceAbuseReportRecord,
  MarketplaceAbuseReportStatus,
  MarketplaceAbuseReportSubjectType,
  MarketplaceApplicationRecord,
  MarketplaceApplicationRevisionRecord,
  MarketplaceDigestCadence,
  MarketplaceDigestHighlight,
  MarketplaceDigestRecord,
  MarketplaceDigestStats,
  MarketplaceDigestStatus,
  MarketplaceNotificationKind,
  MarketplaceNotificationPreferencesRecord,
  MarketplaceNotificationRecord,
  MarketplaceNotificationStatus,
  MarketplaceAutomationRunItem,
  MarketplaceAutomationRunRecord,
  MarketplaceAutomationRunTrigger,
  MarketplaceAutomationRuleKind,
  MarketplaceAutomationRuleRecord,
  MarketplaceAutomationRuleSchedule,
  MarketplaceContractDraftRecord,
  MarketplaceContractDraftRevisionRecord,
  MarketplaceContractDraftStatus,
  MarketplaceContractMetadataSnapshot,
  MarketplaceCryptoReadiness,
  MarketplaceEngagementType,
  MarketplaceIdentityConfidenceLabel,
  MarketplaceIdentityRiskLevel,
  MarketplaceIdentityRiskReviewRecord,
  MarketplaceInteractionEntityType,
  MarketplaceInteractionEventRecord,
  MarketplaceInteractionEventType,
  MarketplaceInteractionSurface,
  MarketplaceInterviewMessageKind,
  MarketplaceInterviewMessageRecord,
  MarketplaceInterviewThreadRecord,
  MarketplaceInterviewThreadStatus,
  MarketplaceNoHireReason,
  MarketplaceOfferMilestoneDraft,
  MarketplaceOfferRecord,
  MarketplaceOfferStatus,
  MarketplaceOpportunityInviteRecord,
  MarketplaceOpportunityInviteStatus,
  MarketplaceOpportunitySearchDocument,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceRankingFeatureSnapshot,
  MarketplaceReviewRecord,
  MarketplaceReviewScores,
  MarketplaceReviewVisibilityStatus,
  MarketplaceRiskSignalCode,
  MarketplaceSavedSearchAlertFrequency,
  MarketplaceSavedSearchKind,
  MarketplaceSavedSearchRecord,
  MarketplaceSearchReason,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceTalentPoolMemberRecord,
  MarketplaceTalentPoolMemberStage,
  MarketplaceTalentPoolRecord,
  MarketplaceTalentSearchDocument,
  MarketplaceTalentProofArtifact,
} from '../../modules/marketplace/marketplace.types';
import type { MarketplaceRepository } from '../persistence.types';
import { PostgresDatabaseService } from './postgres-database.service';

type MarketplaceProfileRow = QueryResultRow & {
  user_id: string;
  organization_id: string | null;
  workspace_id: string | null;
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
  owner_organization_id: string | null;
  owner_workspace_id: string | null;
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
  applicant_organization_id: string | null;
  applicant_workspace_id: string | null;
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

type MarketplaceApplicationRevisionRow = QueryResultRow & {
  id: string;
  application_id: string;
  opportunity_id: string;
  applicant_user_id: string;
  revision_number: number;
  cover_note: string;
  proposed_rate: string | null;
  screening_answers_json: MarketplaceScreeningAnswer[];
  delivery_approach: string;
  milestone_plan_summary: string;
  estimated_start_at_ms: string | null;
  relevant_proof_artifacts_json: MarketplaceTalentProofArtifact[];
  portfolio_urls_json: string[];
  revision_reason: string | null;
  created_at_ms: string;
};

type MarketplaceInterviewThreadRow = QueryResultRow & {
  id: string;
  application_id: string;
  opportunity_id: string;
  client_user_id: string;
  applicant_user_id: string;
  status: MarketplaceInterviewThreadStatus;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceInterviewMessageRow = QueryResultRow & {
  id: string;
  thread_id: string;
  application_id: string;
  opportunity_id: string;
  sender_user_id: string;
  sender_workspace_id: string | null;
  kind: MarketplaceInterviewMessageKind;
  body: string;
  created_at_ms: string;
};

type MarketplaceOfferRow = QueryResultRow & {
  id: string;
  application_id: string;
  opportunity_id: string;
  client_user_id: string;
  applicant_user_id: string;
  status: MarketplaceOfferStatus;
  message: string | null;
  counter_message: string | null;
  decline_reason: string | null;
  proposed_rate: string | null;
  milestones_json: MarketplaceOfferMilestoneDraft[];
  revision_number: number;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceContractDraftRow = QueryResultRow & {
  id: string;
  application_id: string;
  opportunity_id: string;
  offer_id: string;
  client_user_id: string;
  applicant_user_id: string;
  status: MarketplaceContractDraftStatus;
  latest_snapshot_json: MarketplaceContractMetadataSnapshot;
  metadata_hash: string;
  revisions_json: MarketplaceContractDraftRevisionRecord[];
  client_approved_at_ms: string | null;
  applicant_approved_at_ms: string | null;
  finalized_at_ms: string | null;
  converted_job_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceApplicationDecisionRow = QueryResultRow & {
  id: string;
  application_id: string;
  opportunity_id: string;
  actor_user_id: string;
  action: MarketplaceApplicationDecisionRecord['action'];
  reason: string | null;
  no_hire_reason: MarketplaceNoHireReason | null;
  created_at_ms: string;
};

type MarketplaceAbuseReportRow = QueryResultRow & {
  id: string;
  subject_type: MarketplaceAbuseReportSubjectType;
  subject_id: string;
  reporter_user_id: string;
  reason: MarketplaceAbuseReportRecord['reason'];
  details: string | null;
  evidence_urls_json: string[];
  status: MarketplaceAbuseReportStatus;
  claimed_by_user_id: string | null;
  claimed_at_ms: string | null;
  escalation_reason: string | null;
  escalated_by_user_id: string | null;
  escalated_at_ms: string | null;
  evidence_review_status: MarketplaceAbuseReportRecord['evidenceReviewStatus'];
  investigation_summary: string | null;
  evidence_reviewed_by_user_id: string | null;
  evidence_reviewed_at_ms: string | null;
  resolution_note: string | null;
  resolved_by_user_id: string | null;
  subject_moderation_status:
    | MarketplaceProfileRecord['moderationStatus']
    | null;
  subject_moderated_by_user_id: string | null;
  subject_moderated_at_ms: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceTalentSearchDocumentRow = QueryResultRow & {
  profile_user_id: string;
  profile_slug: string;
  workspace_id: string | null;
  organization_id: string | null;
  display_name: string;
  headline: string;
  searchable_text: string;
  skills_json: string[];
  specialties_json: string[];
  timezone: string;
  availability: MarketplaceProfileRecord['availability'];
  preferred_engagements_json: MarketplaceEngagementType[];
  crypto_readiness: MarketplaceCryptoReadiness;
  verification_level: MarketplaceProfileRecord['moderationStatus'] | 'unverified';
  ranking_json: MarketplaceRankingFeatureSnapshot;
  reasons_json: MarketplaceSearchReason[];
  updated_at_ms: string;
};

type MarketplaceOpportunitySearchDocumentRow = QueryResultRow & {
  opportunity_id: string;
  owner_user_id: string;
  owner_workspace_id: string | null;
  owner_organization_id: string | null;
  title: string;
  summary: string;
  category: string;
  searchable_text: string;
  required_skills_json: string[];
  must_have_skills_json: string[];
  engagement_type: MarketplaceEngagementType;
  crypto_readiness_required: MarketplaceCryptoReadiness;
  timezone_overlap_hours: number | null;
  budget_min: string | null;
  budget_max: string | null;
  visibility: MarketplaceOpportunityRecord['visibility'];
  status: MarketplaceOpportunityRecord['status'];
  ranking_json: MarketplaceRankingFeatureSnapshot;
  reasons_json: MarketplaceSearchReason[];
  published_at_ms: string | null;
  updated_at_ms: string;
};

type MarketplaceSavedSearchRow = QueryResultRow & {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: MarketplaceSavedSearchKind;
  label: string;
  query_json: Record<string, string | number | boolean | null>;
  alert_frequency: MarketplaceSavedSearchAlertFrequency;
  last_result_count: number;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceTalentPoolRow = QueryResultRow & {
  id: string;
  owner_user_id: string;
  workspace_id: string;
  label: string;
  focus_skills_json: string[];
  note: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceTalentPoolMemberRow = QueryResultRow & {
  id: string;
  pool_id: string;
  profile_user_id: string;
  profile_slug: string;
  added_by_user_id: string;
  stage: MarketplaceTalentPoolMemberStage;
  note: string | null;
  source_opportunity_id: string | null;
  source_application_id: string | null;
  source_job_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceAutomationRuleRow = QueryResultRow & {
  id: string;
  owner_user_id: string;
  workspace_id: string;
  kind: MarketplaceAutomationRuleKind;
  label: string;
  target_id: string | null;
  schedule: MarketplaceAutomationRuleSchedule;
  enabled: boolean;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceAutomationRunRow = QueryResultRow & {
  id: string;
  rule_id: string;
  owner_user_id: string;
  workspace_id: string;
  kind: MarketplaceAutomationRuleKind;
  schedule: MarketplaceAutomationRuleSchedule;
  trigger: MarketplaceAutomationRunTrigger;
  rule_label: string;
  matched_task_ids_json: string[];
  items_json: MarketplaceAutomationRunItem[];
  summary: string;
  created_at_ms: string;
};

type MarketplaceNotificationRow = QueryResultRow & {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: MarketplaceNotificationKind;
  status: MarketplaceNotificationStatus;
  title: string;
  detail: string;
  actor_user_id: string | null;
  related_opportunity_id: string | null;
  related_application_id: string | null;
  related_offer_id: string | null;
  related_job_id: string | null;
  related_automation_run_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceNotificationPreferencesRow = QueryResultRow & {
  user_id: string;
  digest_cadence: MarketplaceDigestCadence;
  talent_invites_enabled: boolean;
  application_activity_enabled: boolean;
  interview_messages_enabled: boolean;
  offer_activity_enabled: boolean;
  review_activity_enabled: boolean;
  automation_activity_enabled: boolean;
  lifecycle_digest_enabled: boolean;
  analytics_digest_enabled: boolean;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceDigestRow = QueryResultRow & {
  id: string;
  user_id: string;
  workspace_id: string | null;
  cadence: MarketplaceDigestCadence;
  status: MarketplaceDigestStatus;
  title: string;
  summary: string;
  highlights_json: MarketplaceDigestHighlight[];
  stats_json: MarketplaceDigestStats;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceOpportunityInviteRow = QueryResultRow & {
  id: string;
  opportunity_id: string;
  invited_profile_user_id: string;
  invited_profile_slug: string;
  invited_by_user_id: string;
  invited_workspace_id: string | null;
  message: string | null;
  status: MarketplaceOpportunityInviteStatus;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceReviewRow = QueryResultRow & {
  id: string;
  job_id: string;
  reviewer_user_id: string;
  reviewee_user_id: string;
  reviewer_role: MarketplaceReviewRecord['reviewerRole'];
  reviewee_role: MarketplaceReviewRecord['revieweeRole'];
  rating: number;
  scores_json: MarketplaceReviewScores;
  headline: string | null;
  body: string | null;
  visibility_status: MarketplaceReviewVisibilityStatus;
  moderation_note: string | null;
  moderated_by_user_id: string | null;
  moderated_at_ms: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceIdentityRiskReviewRow = QueryResultRow & {
  id: string;
  subject_user_id: string;
  confidence_label: MarketplaceIdentityConfidenceLabel;
  risk_level: MarketplaceIdentityRiskLevel;
  flags_json: MarketplaceRiskSignalCode[];
  operator_summary: string | null;
  reviewed_by_user_id: string;
  reviewed_at_ms: string;
  created_at_ms: string;
  updated_at_ms: string;
};

type MarketplaceInteractionEventRow = QueryResultRow & {
  id: string;
  actor_user_id: string | null;
  actor_workspace_id: string | null;
  surface: MarketplaceInteractionSurface;
  entity_type: MarketplaceInteractionEntityType;
  event_type: MarketplaceInteractionEventType;
  entity_id: string | null;
  search_kind: MarketplaceInteractionEventRecord['searchKind'];
  query_label: string | null;
  category: string | null;
  timezone: string | null;
  skill_tags_json: string[];
  result_count: number;
  related_opportunity_id: string | null;
  related_profile_user_id: string | null;
  related_application_id: string | null;
  related_job_id: string | null;
  created_at_ms: string;
};

function mapProfile(row: MarketplaceProfileRow): MarketplaceProfileRecord {
  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
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
    ownerOrganizationId: row.owner_organization_id,
    ownerWorkspaceId: row.owner_workspace_id,
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
    applicantOrganizationId: row.applicant_organization_id,
    applicantWorkspaceId: row.applicant_workspace_id,
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

function mapApplicationRevision(
  row: MarketplaceApplicationRevisionRow,
): MarketplaceApplicationRevisionRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    applicantUserId: row.applicant_user_id,
    revisionNumber: row.revision_number,
    coverNote: row.cover_note,
    proposedRate: row.proposed_rate,
    screeningAnswers: row.screening_answers_json ?? [],
    deliveryApproach: row.delivery_approach,
    milestonePlanSummary: row.milestone_plan_summary,
    estimatedStartAt:
      row.estimated_start_at_ms === null ? null : Number(row.estimated_start_at_ms),
    relevantProofArtifacts: row.relevant_proof_artifacts_json ?? [],
    portfolioUrls: row.portfolio_urls_json ?? [],
    revisionReason: row.revision_reason,
    createdAt: Number(row.created_at_ms),
  };
}

function mapInterviewThread(
  row: MarketplaceInterviewThreadRow,
): MarketplaceInterviewThreadRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    clientUserId: row.client_user_id,
    applicantUserId: row.applicant_user_id,
    status: row.status,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapInterviewMessage(
  row: MarketplaceInterviewMessageRow,
): MarketplaceInterviewMessageRecord {
  return {
    id: row.id,
    threadId: row.thread_id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    senderUserId: row.sender_user_id,
    senderWorkspaceId: row.sender_workspace_id,
    kind: row.kind,
    body: row.body,
    createdAt: Number(row.created_at_ms),
  };
}

function mapOffer(row: MarketplaceOfferRow): MarketplaceOfferRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    clientUserId: row.client_user_id,
    applicantUserId: row.applicant_user_id,
    status: row.status,
    message: row.message,
    counterMessage: row.counter_message,
    declineReason: row.decline_reason,
    proposedRate: row.proposed_rate,
    milestones: row.milestones_json ?? [],
    revisionNumber: row.revision_number,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapContractDraft(
  row: MarketplaceContractDraftRow,
): MarketplaceContractDraftRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    offerId: row.offer_id,
    clientUserId: row.client_user_id,
    applicantUserId: row.applicant_user_id,
    status: row.status,
    latestSnapshot: row.latest_snapshot_json,
    metadataHash: row.metadata_hash,
    revisions: row.revisions_json ?? [],
    clientApprovedAt:
      row.client_approved_at_ms === null ? null : Number(row.client_approved_at_ms),
    applicantApprovedAt:
      row.applicant_approved_at_ms === null
        ? null
        : Number(row.applicant_approved_at_ms),
    finalizedAt:
      row.finalized_at_ms === null ? null : Number(row.finalized_at_ms),
    convertedJobId: row.converted_job_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapApplicationDecision(
  row: MarketplaceApplicationDecisionRow,
): MarketplaceApplicationDecisionRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    opportunityId: row.opportunity_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    reason: row.reason,
    noHireReason: row.no_hire_reason,
    createdAt: Number(row.created_at_ms),
  };
}

function mapAbuseReport(
  row: MarketplaceAbuseReportRow,
): MarketplaceAbuseReportRecord {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    reporterUserId: row.reporter_user_id,
    reason: row.reason,
    details: row.details,
    evidenceUrls: row.evidence_urls_json ?? [],
    status: row.status,
    claimedByUserId: row.claimed_by_user_id,
    claimedAt: row.claimed_at_ms === null ? null : Number(row.claimed_at_ms),
    escalationReason: row.escalation_reason,
    escalatedByUserId: row.escalated_by_user_id,
    escalatedAt:
      row.escalated_at_ms === null ? null : Number(row.escalated_at_ms),
    evidenceReviewStatus: row.evidence_review_status,
    investigationSummary: row.investigation_summary,
    evidenceReviewedByUserId: row.evidence_reviewed_by_user_id,
    evidenceReviewedAt:
      row.evidence_reviewed_at_ms === null
        ? null
        : Number(row.evidence_reviewed_at_ms),
    resolutionNote: row.resolution_note,
    resolvedByUserId: row.resolved_by_user_id,
    subjectModerationStatus: row.subject_moderation_status,
    subjectModeratedByUserId: row.subject_moderated_by_user_id,
    subjectModeratedAt:
      row.subject_moderated_at_ms === null
        ? null
        : Number(row.subject_moderated_at_ms),
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapTalentSearchDocument(
  row: MarketplaceTalentSearchDocumentRow,
): MarketplaceTalentSearchDocument {
  return {
    profileUserId: row.profile_user_id,
    profileSlug: row.profile_slug,
    workspaceId: row.workspace_id,
    organizationId: row.organization_id,
    displayName: row.display_name,
    headline: row.headline,
    searchableText: row.searchable_text,
    skills: row.skills_json ?? [],
    specialties: row.specialties_json ?? [],
    timezone: row.timezone,
    availability: row.availability,
    preferredEngagements: row.preferred_engagements_json ?? [],
    cryptoReadiness: row.crypto_readiness,
    verificationLevel: row.verification_level as
      | MarketplaceTalentSearchDocument['verificationLevel'],
    ranking: row.ranking_json,
    reasons: row.reasons_json ?? [],
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapOpportunitySearchDocument(
  row: MarketplaceOpportunitySearchDocumentRow,
): MarketplaceOpportunitySearchDocument {
  return {
    opportunityId: row.opportunity_id,
    ownerUserId: row.owner_user_id,
    ownerWorkspaceId: row.owner_workspace_id,
    ownerOrganizationId: row.owner_organization_id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    searchableText: row.searchable_text,
    requiredSkills: row.required_skills_json ?? [],
    mustHaveSkills: row.must_have_skills_json ?? [],
    engagementType: row.engagement_type,
    cryptoReadinessRequired: row.crypto_readiness_required,
    timezoneOverlapHours: row.timezone_overlap_hours,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    visibility: row.visibility,
    status: row.status,
    ranking: row.ranking_json,
    reasons: row.reasons_json ?? [],
    publishedAt:
      row.published_at_ms === null ? null : Number(row.published_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapSavedSearch(row: MarketplaceSavedSearchRow): MarketplaceSavedSearchRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    label: row.label,
    query: row.query_json ?? {},
    alertFrequency: row.alert_frequency,
    lastResultCount: row.last_result_count,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapTalentPool(row: MarketplaceTalentPoolRow): MarketplaceTalentPoolRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    label: row.label,
    focusSkills: row.focus_skills_json ?? [],
    note: row.note,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapTalentPoolMember(
  row: MarketplaceTalentPoolMemberRow,
): MarketplaceTalentPoolMemberRecord {
  return {
    id: row.id,
    poolId: row.pool_id,
    profileUserId: row.profile_user_id,
    profileSlug: row.profile_slug,
    addedByUserId: row.added_by_user_id,
    stage: row.stage,
    note: row.note,
    sourceOpportunityId: row.source_opportunity_id,
    sourceApplicationId: row.source_application_id,
    sourceJobId: row.source_job_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapAutomationRule(
  row: MarketplaceAutomationRuleRow,
): MarketplaceAutomationRuleRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    label: row.label,
    targetId: row.target_id,
    schedule: row.schedule,
    enabled: row.enabled,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapAutomationRun(
  row: MarketplaceAutomationRunRow,
): MarketplaceAutomationRunRecord {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    schedule: row.schedule,
    trigger: row.trigger,
    ruleLabel: row.rule_label,
    matchedTaskIds: row.matched_task_ids_json ?? [],
    items: row.items_json ?? [],
    summary: row.summary,
    createdAt: Number(row.created_at_ms),
  };
}

function mapNotification(
  row: MarketplaceNotificationRow,
): MarketplaceNotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    detail: row.detail,
    actorUserId: row.actor_user_id,
    relatedOpportunityId: row.related_opportunity_id,
    relatedApplicationId: row.related_application_id,
    relatedOfferId: row.related_offer_id,
    relatedJobId: row.related_job_id,
    relatedAutomationRunId: row.related_automation_run_id,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapNotificationPreferences(
  row: MarketplaceNotificationPreferencesRow,
): MarketplaceNotificationPreferencesRecord {
  return {
    userId: row.user_id,
    digestCadence: row.digest_cadence,
    talentInvitesEnabled: row.talent_invites_enabled,
    applicationActivityEnabled: row.application_activity_enabled,
    interviewMessagesEnabled: row.interview_messages_enabled,
    offerActivityEnabled: row.offer_activity_enabled,
    reviewActivityEnabled: row.review_activity_enabled,
    automationActivityEnabled: row.automation_activity_enabled,
    lifecycleDigestEnabled: row.lifecycle_digest_enabled,
    analyticsDigestEnabled: row.analytics_digest_enabled,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapDigest(row: MarketplaceDigestRow): MarketplaceDigestRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    cadence: row.cadence,
    status: row.status,
    title: row.title,
    summary: row.summary,
    highlights: row.highlights_json ?? [],
    stats: row.stats_json,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapOpportunityInvite(
  row: MarketplaceOpportunityInviteRow,
): MarketplaceOpportunityInviteRecord {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    invitedProfileUserId: row.invited_profile_user_id,
    invitedProfileSlug: row.invited_profile_slug,
    invitedByUserId: row.invited_by_user_id,
    invitedWorkspaceId: row.invited_workspace_id,
    message: row.message,
    status: row.status,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapReview(row: MarketplaceReviewRow): MarketplaceReviewRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    reviewerUserId: row.reviewer_user_id,
    revieweeUserId: row.reviewee_user_id,
    reviewerRole: row.reviewer_role,
    revieweeRole: row.reviewee_role,
    rating: row.rating,
    scores: row.scores_json,
    headline: row.headline,
    body: row.body,
    visibilityStatus: row.visibility_status,
    moderationNote: row.moderation_note,
    moderatedByUserId: row.moderated_by_user_id,
    moderatedAt:
      row.moderated_at_ms === null ? null : Number(row.moderated_at_ms),
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapIdentityRiskReview(
  row: MarketplaceIdentityRiskReviewRow,
): MarketplaceIdentityRiskReviewRecord {
  return {
    id: row.id,
    subjectUserId: row.subject_user_id,
    confidenceLabel: row.confidence_label,
    riskLevel: row.risk_level,
    flags: row.flags_json ?? [],
    operatorSummary: row.operator_summary,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: Number(row.reviewed_at_ms),
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapInteractionEvent(
  row: MarketplaceInteractionEventRow,
): MarketplaceInteractionEventRecord {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorWorkspaceId: row.actor_workspace_id,
    surface: row.surface,
    entityType: row.entity_type,
    eventType: row.event_type,
    entityId: row.entity_id,
    searchKind: row.search_kind,
    queryLabel: row.query_label,
    category: row.category,
    timezone: row.timezone,
    skillTags: row.skill_tags_json ?? [],
    resultCount: row.result_count,
    relatedOpportunityId: row.related_opportunity_id,
    relatedProfileUserId: row.related_profile_user_id,
    relatedApplicationId: row.related_application_id,
    relatedJobId: row.related_job_id,
    createdAt: Number(row.created_at_ms),
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
          organization_id,
          workspace_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16, $17, $18, $19, $20
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          workspace_id = EXCLUDED.workspace_id,
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
        profile.organizationId,
        profile.workspaceId,
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

  async listTalentSearchDocuments() {
    const result = await this.db.query<MarketplaceTalentSearchDocumentRow>(
      `
        SELECT *
        FROM marketplace_talent_search_documents
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapTalentSearchDocument);
  }

  async saveTalentSearchDocument(document: MarketplaceTalentSearchDocument) {
    await this.db.query(
      `
        INSERT INTO marketplace_talent_search_documents (
          profile_user_id,
          profile_slug,
          workspace_id,
          organization_id,
          display_name,
          headline,
          searchable_text,
          skills_json,
          specialties_json,
          timezone,
          availability,
          preferred_engagements_json,
          crypto_readiness,
          verification_level,
          ranking_json,
          reasons_json,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb,
          $13, $14, $15::jsonb, $16::jsonb, $17
        )
        ON CONFLICT (profile_user_id)
        DO UPDATE SET
          profile_slug = EXCLUDED.profile_slug,
          workspace_id = EXCLUDED.workspace_id,
          organization_id = EXCLUDED.organization_id,
          display_name = EXCLUDED.display_name,
          headline = EXCLUDED.headline,
          searchable_text = EXCLUDED.searchable_text,
          skills_json = EXCLUDED.skills_json,
          specialties_json = EXCLUDED.specialties_json,
          timezone = EXCLUDED.timezone,
          availability = EXCLUDED.availability,
          preferred_engagements_json = EXCLUDED.preferred_engagements_json,
          crypto_readiness = EXCLUDED.crypto_readiness,
          verification_level = EXCLUDED.verification_level,
          ranking_json = EXCLUDED.ranking_json,
          reasons_json = EXCLUDED.reasons_json,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        document.profileUserId,
        document.profileSlug,
        document.workspaceId,
        document.organizationId,
        document.displayName,
        document.headline,
        document.searchableText,
        JSON.stringify(document.skills),
        JSON.stringify(document.specialties),
        document.timezone,
        document.availability,
        JSON.stringify(document.preferredEngagements),
        document.cryptoReadiness,
        document.verificationLevel,
        JSON.stringify(document.ranking),
        JSON.stringify(document.reasons),
        String(document.updatedAt),
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
          owner_organization_id,
          owner_workspace_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        ON CONFLICT (id)
        DO UPDATE SET
          owner_organization_id = EXCLUDED.owner_organization_id,
          owner_workspace_id = EXCLUDED.owner_workspace_id,
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
        opportunity.ownerOrganizationId,
        opportunity.ownerWorkspaceId,
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

  async listOpportunitySearchDocuments() {
    const result = await this.db.query<MarketplaceOpportunitySearchDocumentRow>(
      `
        SELECT *
        FROM marketplace_opportunity_search_documents
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapOpportunitySearchDocument);
  }

  async saveOpportunitySearchDocument(
    document: MarketplaceOpportunitySearchDocument,
  ) {
    await this.db.query(
      `
        INSERT INTO marketplace_opportunity_search_documents (
          opportunity_id,
          owner_user_id,
          owner_workspace_id,
          owner_organization_id,
          title,
          summary,
          category,
          searchable_text,
          required_skills_json,
          must_have_skills_json,
          engagement_type,
          crypto_readiness_required,
          timezone_overlap_hours,
          budget_min,
          budget_max,
          visibility,
          status,
          ranking_json,
          reasons_json,
          published_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13,
          $14, $15, $16, $17, $18::jsonb, $19::jsonb, $20, $21
        )
        ON CONFLICT (opportunity_id)
        DO UPDATE SET
          owner_user_id = EXCLUDED.owner_user_id,
          owner_workspace_id = EXCLUDED.owner_workspace_id,
          owner_organization_id = EXCLUDED.owner_organization_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          category = EXCLUDED.category,
          searchable_text = EXCLUDED.searchable_text,
          required_skills_json = EXCLUDED.required_skills_json,
          must_have_skills_json = EXCLUDED.must_have_skills_json,
          engagement_type = EXCLUDED.engagement_type,
          crypto_readiness_required = EXCLUDED.crypto_readiness_required,
          timezone_overlap_hours = EXCLUDED.timezone_overlap_hours,
          budget_min = EXCLUDED.budget_min,
          budget_max = EXCLUDED.budget_max,
          visibility = EXCLUDED.visibility,
          status = EXCLUDED.status,
          ranking_json = EXCLUDED.ranking_json,
          reasons_json = EXCLUDED.reasons_json,
          published_at_ms = EXCLUDED.published_at_ms,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        document.opportunityId,
        document.ownerUserId,
        document.ownerWorkspaceId,
        document.ownerOrganizationId,
        document.title,
        document.summary,
        document.category,
        document.searchableText,
        JSON.stringify(document.requiredSkills),
        JSON.stringify(document.mustHaveSkills),
        document.engagementType,
        document.cryptoReadinessRequired,
        document.timezoneOverlapHours,
        document.budgetMin,
        document.budgetMax,
        document.visibility,
        document.status,
        JSON.stringify(document.ranking),
        JSON.stringify(document.reasons),
        document.publishedAt === null ? null : String(document.publishedAt),
        String(document.updatedAt),
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
          applicant_organization_id,
          applicant_workspace_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb, $14::jsonb,
          $15, $16, $17, $18
        )
        ON CONFLICT (id)
        DO UPDATE SET
          applicant_organization_id = EXCLUDED.applicant_organization_id,
          applicant_workspace_id = EXCLUDED.applicant_workspace_id,
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
        application.applicantOrganizationId,
        application.applicantWorkspaceId,
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

  async getApplicationRevisionById(revisionId: string) {
    const result = await this.db.query<MarketplaceApplicationRevisionRow>(
      `
        SELECT *
        FROM marketplace_application_revisions
        WHERE id = $1
        LIMIT 1
      `,
      [revisionId],
    );

    return result.rows[0] ? mapApplicationRevision(result.rows[0]) : null;
  }

  async listApplicationRevisions() {
    const result = await this.db.query<MarketplaceApplicationRevisionRow>(
      `
        SELECT *
        FROM marketplace_application_revisions
        ORDER BY created_at_ms DESC
      `,
    );

    return result.rows.map(mapApplicationRevision);
  }

  async saveApplicationRevision(revision: MarketplaceApplicationRevisionRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_application_revisions (
          id, application_id, opportunity_id, applicant_user_id, revision_number,
          cover_note, proposed_rate, screening_answers_json, delivery_approach,
          milestone_plan_summary, estimated_start_at_ms, relevant_proof_artifacts_json,
          portfolio_urls_json, revision_reason, created_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8::jsonb, $9,
          $10, $11, $12::jsonb,
          $13::jsonb, $14, $15
        )
        ON CONFLICT (id)
        DO UPDATE SET
          cover_note = EXCLUDED.cover_note,
          proposed_rate = EXCLUDED.proposed_rate,
          screening_answers_json = EXCLUDED.screening_answers_json,
          delivery_approach = EXCLUDED.delivery_approach,
          milestone_plan_summary = EXCLUDED.milestone_plan_summary,
          estimated_start_at_ms = EXCLUDED.estimated_start_at_ms,
          relevant_proof_artifacts_json = EXCLUDED.relevant_proof_artifacts_json,
          portfolio_urls_json = EXCLUDED.portfolio_urls_json,
          revision_reason = EXCLUDED.revision_reason
      `,
      [
        revision.id,
        revision.applicationId,
        revision.opportunityId,
        revision.applicantUserId,
        revision.revisionNumber,
        revision.coverNote,
        revision.proposedRate,
        JSON.stringify(revision.screeningAnswers),
        revision.deliveryApproach,
        revision.milestonePlanSummary,
        revision.estimatedStartAt === null ? null : String(revision.estimatedStartAt),
        JSON.stringify(revision.relevantProofArtifacts),
        JSON.stringify(revision.portfolioUrls),
        revision.revisionReason,
        String(revision.createdAt),
      ],
    );
  }

  async getInterviewThreadById(threadId: string) {
    const result = await this.db.query<MarketplaceInterviewThreadRow>(
      `
        SELECT *
        FROM marketplace_interview_threads
        WHERE id = $1
        LIMIT 1
      `,
      [threadId],
    );

    return result.rows[0] ? mapInterviewThread(result.rows[0]) : null;
  }

  async listInterviewThreads() {
    const result = await this.db.query<MarketplaceInterviewThreadRow>(
      `
        SELECT *
        FROM marketplace_interview_threads
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapInterviewThread);
  }

  async saveInterviewThread(thread: MarketplaceInterviewThreadRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_interview_threads (
          id, application_id, opportunity_id, client_user_id, applicant_user_id,
          status, created_at_ms, updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          status = EXCLUDED.status,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        thread.id,
        thread.applicationId,
        thread.opportunityId,
        thread.clientUserId,
        thread.applicantUserId,
        thread.status,
        String(thread.createdAt),
        String(thread.updatedAt),
      ],
    );
  }

  async getInterviewMessageById(messageId: string) {
    const result = await this.db.query<MarketplaceInterviewMessageRow>(
      `
        SELECT *
        FROM marketplace_interview_messages
        WHERE id = $1
        LIMIT 1
      `,
      [messageId],
    );

    return result.rows[0] ? mapInterviewMessage(result.rows[0]) : null;
  }

  async listInterviewMessages() {
    const result = await this.db.query<MarketplaceInterviewMessageRow>(
      `
        SELECT *
        FROM marketplace_interview_messages
        ORDER BY created_at_ms ASC
      `,
    );

    return result.rows.map(mapInterviewMessage);
  }

  async saveInterviewMessage(message: MarketplaceInterviewMessageRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_interview_messages (
          id, thread_id, application_id, opportunity_id, sender_user_id,
          sender_workspace_id, kind, body, created_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id)
        DO UPDATE SET
          body = EXCLUDED.body
      `,
      [
        message.id,
        message.threadId,
        message.applicationId,
        message.opportunityId,
        message.senderUserId,
        message.senderWorkspaceId,
        message.kind,
        message.body,
        String(message.createdAt),
      ],
    );
  }

  async getOfferById(offerId: string) {
    const result = await this.db.query<MarketplaceOfferRow>(
      `
        SELECT *
        FROM marketplace_offers
        WHERE id = $1
        LIMIT 1
      `,
      [offerId],
    );

    return result.rows[0] ? mapOffer(result.rows[0]) : null;
  }

  async listOffers() {
    const result = await this.db.query<MarketplaceOfferRow>(
      `
        SELECT *
        FROM marketplace_offers
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapOffer);
  }

  async saveOffer(offer: MarketplaceOfferRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_offers (
          id, application_id, opportunity_id, client_user_id, applicant_user_id,
          status, message, counter_message, decline_reason, proposed_rate,
          milestones_json, revision_number, created_at_ms, updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11::jsonb, $12, $13, $14
        )
        ON CONFLICT (id)
        DO UPDATE SET
          status = EXCLUDED.status,
          message = EXCLUDED.message,
          counter_message = EXCLUDED.counter_message,
          decline_reason = EXCLUDED.decline_reason,
          proposed_rate = EXCLUDED.proposed_rate,
          milestones_json = EXCLUDED.milestones_json,
          revision_number = EXCLUDED.revision_number,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        offer.id,
        offer.applicationId,
        offer.opportunityId,
        offer.clientUserId,
        offer.applicantUserId,
        offer.status,
        offer.message,
        offer.counterMessage,
        offer.declineReason,
        offer.proposedRate,
        JSON.stringify(offer.milestones),
        offer.revisionNumber,
        String(offer.createdAt),
        String(offer.updatedAt),
      ],
    );
  }

  async getContractDraftById(draftId: string) {
    const result = await this.db.query<MarketplaceContractDraftRow>(
      `
        SELECT *
        FROM marketplace_contract_drafts
        WHERE id = $1
        LIMIT 1
      `,
      [draftId],
    );

    return result.rows[0] ? mapContractDraft(result.rows[0]) : null;
  }

  async getContractDraftByApplicationId(applicationId: string) {
    const result = await this.db.query<MarketplaceContractDraftRow>(
      `
        SELECT *
        FROM marketplace_contract_drafts
        WHERE application_id = $1
        LIMIT 1
      `,
      [applicationId],
    );

    return result.rows[0] ? mapContractDraft(result.rows[0]) : null;
  }

  async listContractDrafts() {
    const result = await this.db.query<MarketplaceContractDraftRow>(
      `
        SELECT *
        FROM marketplace_contract_drafts
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapContractDraft);
  }

  async saveContractDraft(draft: MarketplaceContractDraftRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_contract_drafts (
          id, application_id, opportunity_id, offer_id, client_user_id, applicant_user_id,
          status, latest_snapshot_json, metadata_hash, revisions_json, client_approved_at_ms,
          applicant_approved_at_ms, finalized_at_ms, converted_job_id, created_at_ms, updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8::jsonb, $9, $10::jsonb, $11,
          $12, $13, $14, $15, $16
        )
        ON CONFLICT (id)
        DO UPDATE SET
          offer_id = EXCLUDED.offer_id,
          status = EXCLUDED.status,
          latest_snapshot_json = EXCLUDED.latest_snapshot_json,
          metadata_hash = EXCLUDED.metadata_hash,
          revisions_json = EXCLUDED.revisions_json,
          client_approved_at_ms = EXCLUDED.client_approved_at_ms,
          applicant_approved_at_ms = EXCLUDED.applicant_approved_at_ms,
          finalized_at_ms = EXCLUDED.finalized_at_ms,
          converted_job_id = EXCLUDED.converted_job_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        draft.id,
        draft.applicationId,
        draft.opportunityId,
        draft.offerId,
        draft.clientUserId,
        draft.applicantUserId,
        draft.status,
        JSON.stringify(draft.latestSnapshot),
        draft.metadataHash,
        JSON.stringify(draft.revisions),
        draft.clientApprovedAt === null ? null : String(draft.clientApprovedAt),
        draft.applicantApprovedAt === null
          ? null
          : String(draft.applicantApprovedAt),
        draft.finalizedAt === null ? null : String(draft.finalizedAt),
        draft.convertedJobId,
        String(draft.createdAt),
        String(draft.updatedAt),
      ],
    );
  }

  async getApplicationDecisionById(decisionId: string) {
    const result = await this.db.query<MarketplaceApplicationDecisionRow>(
      `
        SELECT *
        FROM marketplace_application_decisions
        WHERE id = $1
        LIMIT 1
      `,
      [decisionId],
    );

    return result.rows[0] ? mapApplicationDecision(result.rows[0]) : null;
  }

  async listApplicationDecisions() {
    const result = await this.db.query<MarketplaceApplicationDecisionRow>(
      `
        SELECT *
        FROM marketplace_application_decisions
        ORDER BY created_at_ms ASC
      `,
    );

    return result.rows.map(mapApplicationDecision);
  }

  async saveApplicationDecision(decision: MarketplaceApplicationDecisionRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_application_decisions (
          id, application_id, opportunity_id, actor_user_id, action,
          reason, no_hire_reason, created_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          action = EXCLUDED.action,
          reason = EXCLUDED.reason,
          no_hire_reason = EXCLUDED.no_hire_reason
      `,
      [
        decision.id,
        decision.applicationId,
        decision.opportunityId,
        decision.actorUserId,
        decision.action,
        decision.reason,
        decision.noHireReason,
        String(decision.createdAt),
      ],
    );
  }

  async getSavedSearchById(searchId: string) {
    const result = await this.db.query<MarketplaceSavedSearchRow>(
      `
        SELECT *
        FROM marketplace_saved_searches
        WHERE id = $1
        LIMIT 1
      `,
      [searchId],
    );

    return result.rows[0] ? mapSavedSearch(result.rows[0]) : null;
  }

  async listSavedSearches() {
    const result = await this.db.query<MarketplaceSavedSearchRow>(
      `
        SELECT *
        FROM marketplace_saved_searches
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapSavedSearch);
  }

  async saveSavedSearch(search: MarketplaceSavedSearchRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_saved_searches (
          id,
          user_id,
          workspace_id,
          kind,
          label,
          query_json,
          alert_frequency,
          last_result_count,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
        ON CONFLICT (id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          query_json = EXCLUDED.query_json,
          alert_frequency = EXCLUDED.alert_frequency,
          last_result_count = EXCLUDED.last_result_count,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        search.id,
        search.userId,
        search.workspaceId,
        search.kind,
        search.label,
        JSON.stringify(search.query),
        search.alertFrequency,
        search.lastResultCount,
        String(search.createdAt),
        String(search.updatedAt),
      ],
    );
  }

  async deleteSavedSearch(searchId: string) {
    await this.db.query(
      `
        DELETE FROM marketplace_saved_searches
        WHERE id = $1
      `,
      [searchId],
    );
  }

  async getTalentPoolById(poolId: string) {
    const result = await this.db.query<MarketplaceTalentPoolRow>(
      `
        SELECT *
        FROM marketplace_talent_pools
        WHERE id = $1
        LIMIT 1
      `,
      [poolId],
    );

    return result.rows[0] ? mapTalentPool(result.rows[0]) : null;
  }

  async listTalentPools() {
    const result = await this.db.query<MarketplaceTalentPoolRow>(
      `
        SELECT *
        FROM marketplace_talent_pools
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapTalentPool);
  }

  async saveTalentPool(pool: MarketplaceTalentPoolRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_talent_pools (
          id,
          owner_user_id,
          workspace_id,
          label,
          focus_skills_json,
          note,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2::uuid, $3, $4, $5::jsonb, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          owner_user_id = EXCLUDED.owner_user_id,
          workspace_id = EXCLUDED.workspace_id,
          label = EXCLUDED.label,
          focus_skills_json = EXCLUDED.focus_skills_json,
          note = EXCLUDED.note,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        pool.id,
        pool.ownerUserId,
        pool.workspaceId,
        pool.label,
        JSON.stringify(pool.focusSkills),
        pool.note,
        String(pool.createdAt),
        String(pool.updatedAt),
      ],
    );
  }

  async getTalentPoolMemberById(memberId: string) {
    const result = await this.db.query<MarketplaceTalentPoolMemberRow>(
      `
        SELECT *
        FROM marketplace_talent_pool_members
        WHERE id = $1
        LIMIT 1
      `,
      [memberId],
    );

    return result.rows[0] ? mapTalentPoolMember(result.rows[0]) : null;
  }

  async listTalentPoolMembers() {
    const result = await this.db.query<MarketplaceTalentPoolMemberRow>(
      `
        SELECT *
        FROM marketplace_talent_pool_members
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapTalentPoolMember);
  }

  async saveTalentPoolMember(member: MarketplaceTalentPoolMemberRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_talent_pool_members (
          id,
          pool_id,
          profile_user_id,
          profile_slug,
          added_by_user_id,
          stage,
          note,
          source_opportunity_id,
          source_application_id,
          source_job_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (id)
        DO UPDATE SET
          stage = EXCLUDED.stage,
          note = EXCLUDED.note,
          source_opportunity_id = EXCLUDED.source_opportunity_id,
          source_application_id = EXCLUDED.source_application_id,
          source_job_id = EXCLUDED.source_job_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        member.id,
        member.poolId,
        member.profileUserId,
        member.profileSlug,
        member.addedByUserId,
        member.stage,
        member.note,
        member.sourceOpportunityId,
        member.sourceApplicationId,
        member.sourceJobId,
        String(member.createdAt),
        String(member.updatedAt),
      ],
    );
  }

  async getAutomationRuleById(ruleId: string) {
    const result = await this.db.query<MarketplaceAutomationRuleRow>(
      `
        SELECT *
        FROM marketplace_automation_rules
        WHERE id = $1
        LIMIT 1
      `,
      [ruleId],
    );

    return result.rows[0] ? mapAutomationRule(result.rows[0]) : null;
  }

  async listAutomationRules() {
    const result = await this.db.query<MarketplaceAutomationRuleRow>(
      `
        SELECT *
        FROM marketplace_automation_rules
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapAutomationRule);
  }

  async saveAutomationRule(rule: MarketplaceAutomationRuleRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_automation_rules (
          id,
          owner_user_id,
          workspace_id,
          kind,
          label,
          target_id,
          schedule,
          enabled,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id)
        DO UPDATE SET
          owner_user_id = EXCLUDED.owner_user_id,
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          target_id = EXCLUDED.target_id,
          schedule = EXCLUDED.schedule,
          enabled = EXCLUDED.enabled,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        rule.id,
        rule.ownerUserId,
        rule.workspaceId,
        rule.kind,
        rule.label,
        rule.targetId,
        rule.schedule,
        rule.enabled,
        String(rule.createdAt),
        String(rule.updatedAt),
      ],
    );
  }

  async getAutomationRunById(runId: string) {
    const result = await this.db.query<MarketplaceAutomationRunRow>(
      `
        SELECT *
        FROM marketplace_automation_runs
        WHERE id = $1
        LIMIT 1
      `,
      [runId],
    );

    return result.rows[0] ? mapAutomationRun(result.rows[0]) : null;
  }

  async listAutomationRuns() {
    const result = await this.db.query<MarketplaceAutomationRunRow>(
      `
        SELECT *
        FROM marketplace_automation_runs
        ORDER BY created_at_ms DESC
      `,
    );

    return result.rows.map(mapAutomationRun);
  }

  async saveAutomationRun(run: MarketplaceAutomationRunRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_automation_runs (
          id,
          rule_id,
          owner_user_id,
          workspace_id,
          kind,
          schedule,
          trigger,
          rule_label,
          matched_task_ids_json,
          items_json,
          summary,
          created_at_ms
        )
        VALUES (
          $1, $2, $3::uuid, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12
        )
        ON CONFLICT (id)
        DO UPDATE SET
          rule_id = EXCLUDED.rule_id,
          owner_user_id = EXCLUDED.owner_user_id,
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          schedule = EXCLUDED.schedule,
          trigger = EXCLUDED.trigger,
          rule_label = EXCLUDED.rule_label,
          matched_task_ids_json = EXCLUDED.matched_task_ids_json,
          items_json = EXCLUDED.items_json,
          summary = EXCLUDED.summary,
          created_at_ms = EXCLUDED.created_at_ms
      `,
      [
        run.id,
        run.ruleId,
        run.ownerUserId,
        run.workspaceId,
        run.kind,
        run.schedule,
        run.trigger,
        run.ruleLabel,
        JSON.stringify(run.matchedTaskIds),
        JSON.stringify(run.items),
        run.summary,
        String(run.createdAt),
      ],
    );
  }

  async getNotificationById(notificationId: string) {
    const result = await this.db.query<MarketplaceNotificationRow>(
      `
        SELECT *
        FROM marketplace_notifications
        WHERE id = $1
        LIMIT 1
      `,
      [notificationId],
    );

    return result.rows[0] ? mapNotification(result.rows[0]) : null;
  }

  async listNotifications() {
    const result = await this.db.query<MarketplaceNotificationRow>(
      `
        SELECT *
        FROM marketplace_notifications
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapNotification);
  }

  async saveNotification(notification: MarketplaceNotificationRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_notifications (
          id,
          user_id,
          workspace_id,
          kind,
          status,
          title,
          detail,
          actor_user_id,
          related_opportunity_id,
          related_application_id,
          related_offer_id,
          related_job_id,
          related_automation_run_id,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, $8::uuid, $9, $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          detail = EXCLUDED.detail,
          actor_user_id = EXCLUDED.actor_user_id,
          related_opportunity_id = EXCLUDED.related_opportunity_id,
          related_application_id = EXCLUDED.related_application_id,
          related_offer_id = EXCLUDED.related_offer_id,
          related_job_id = EXCLUDED.related_job_id,
          related_automation_run_id = EXCLUDED.related_automation_run_id,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        notification.id,
        notification.userId,
        notification.workspaceId,
        notification.kind,
        notification.status,
        notification.title,
        notification.detail,
        notification.actorUserId,
        notification.relatedOpportunityId,
        notification.relatedApplicationId,
        notification.relatedOfferId,
        notification.relatedJobId,
        notification.relatedAutomationRunId,
        String(notification.createdAt),
        String(notification.updatedAt),
      ],
    );
  }

  async getNotificationPreferencesByUserId(userId: string) {
    const result = await this.db.query<MarketplaceNotificationPreferencesRow>(
      `
        SELECT *
        FROM marketplace_notification_preferences
        WHERE user_id = $1::uuid
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ? mapNotificationPreferences(result.rows[0]) : null;
  }

  async listNotificationPreferences() {
    const result = await this.db.query<MarketplaceNotificationPreferencesRow>(
      `
        SELECT *
        FROM marketplace_notification_preferences
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapNotificationPreferences);
  }

  async saveNotificationPreferences(
    preferences: MarketplaceNotificationPreferencesRecord,
  ) {
    await this.db.query(
      `
        INSERT INTO marketplace_notification_preferences (
          user_id,
          digest_cadence,
          talent_invites_enabled,
          application_activity_enabled,
          interview_messages_enabled,
          offer_activity_enabled,
          review_activity_enabled,
          automation_activity_enabled,
          lifecycle_digest_enabled,
          analytics_digest_enabled,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          digest_cadence = EXCLUDED.digest_cadence,
          talent_invites_enabled = EXCLUDED.talent_invites_enabled,
          application_activity_enabled = EXCLUDED.application_activity_enabled,
          interview_messages_enabled = EXCLUDED.interview_messages_enabled,
          offer_activity_enabled = EXCLUDED.offer_activity_enabled,
          review_activity_enabled = EXCLUDED.review_activity_enabled,
          automation_activity_enabled = EXCLUDED.automation_activity_enabled,
          lifecycle_digest_enabled = EXCLUDED.lifecycle_digest_enabled,
          analytics_digest_enabled = EXCLUDED.analytics_digest_enabled,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        preferences.userId,
        preferences.digestCadence,
        preferences.talentInvitesEnabled,
        preferences.applicationActivityEnabled,
        preferences.interviewMessagesEnabled,
        preferences.offerActivityEnabled,
        preferences.reviewActivityEnabled,
        preferences.automationActivityEnabled,
        preferences.lifecycleDigestEnabled,
        preferences.analyticsDigestEnabled,
        String(preferences.createdAt),
        String(preferences.updatedAt),
      ],
    );
  }

  async getDigestById(digestId: string) {
    const result = await this.db.query<MarketplaceDigestRow>(
      `
        SELECT *
        FROM marketplace_digests
        WHERE id = $1
        LIMIT 1
      `,
      [digestId],
    );

    return result.rows[0] ? mapDigest(result.rows[0]) : null;
  }

  async listDigests() {
    const result = await this.db.query<MarketplaceDigestRow>(
      `
        SELECT *
        FROM marketplace_digests
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapDigest);
  }

  async saveDigest(digest: MarketplaceDigestRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_digests (
          id,
          user_id,
          workspace_id,
          cadence,
          status,
          title,
          summary,
          highlights_json,
          stats_json,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11
        )
        ON CONFLICT (id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          cadence = EXCLUDED.cadence,
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          highlights_json = EXCLUDED.highlights_json,
          stats_json = EXCLUDED.stats_json,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        digest.id,
        digest.userId,
        digest.workspaceId,
        digest.cadence,
        digest.status,
        digest.title,
        digest.summary,
        JSON.stringify(digest.highlights),
        JSON.stringify(digest.stats),
        String(digest.createdAt),
        String(digest.updatedAt),
      ],
    );
  }

  async getOpportunityInviteById(inviteId: string) {
    const result = await this.db.query<MarketplaceOpportunityInviteRow>(
      `
        SELECT *
        FROM marketplace_opportunity_invites
        WHERE id = $1
        LIMIT 1
      `,
      [inviteId],
    );

    return result.rows[0] ? mapOpportunityInvite(result.rows[0]) : null;
  }

  async listOpportunityInvites() {
    const result = await this.db.query<MarketplaceOpportunityInviteRow>(
      `
        SELECT *
        FROM marketplace_opportunity_invites
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapOpportunityInvite);
  }

  async saveOpportunityInvite(invite: MarketplaceOpportunityInviteRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_opportunity_invites (
          id,
          opportunity_id,
          invited_profile_user_id,
          invited_profile_slug,
          invited_by_user_id,
          invited_workspace_id,
          message,
          status,
          created_at_ms,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id)
        DO UPDATE SET
          message = EXCLUDED.message,
          status = EXCLUDED.status,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        invite.id,
        invite.opportunityId,
        invite.invitedProfileUserId,
        invite.invitedProfileSlug,
        invite.invitedByUserId,
        invite.invitedWorkspaceId,
        invite.message,
        invite.status,
        String(invite.createdAt),
        String(invite.updatedAt),
      ],
    );
  }

  async getAbuseReportById(reportId: string) {
    const result = await this.db.query<MarketplaceAbuseReportRow>(
      `
        SELECT *
        FROM marketplace_abuse_reports
        WHERE id = $1
        LIMIT 1
      `,
      [reportId],
    );

    return result.rows[0] ? mapAbuseReport(result.rows[0]) : null;
  }

  async listAbuseReports() {
    const result = await this.db.query<MarketplaceAbuseReportRow>(
      `
        SELECT *
        FROM marketplace_abuse_reports
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapAbuseReport);
  }

  async saveAbuseReport(report: MarketplaceAbuseReportRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_abuse_reports (
          id,
          subject_type,
          subject_id,
          reporter_user_id,
          reason,
          details,
          evidence_urls_json,
          status,
          claimed_by_user_id,
          claimed_at_ms,
          escalation_reason,
          escalated_by_user_id,
          escalated_at_ms,
          evidence_review_status,
          investigation_summary,
          evidence_reviewed_by_user_id,
          evidence_reviewed_at_ms,
          resolution_note,
          resolved_by_user_id,
          subject_moderation_status,
          subject_moderated_by_user_id,
          subject_moderated_at_ms,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3, $4::uuid, $5, $6, $7::jsonb, $8, $9::uuid, $10, $11, $12::uuid, $13, $14, $15, $16::uuid, $17, $18, $19::uuid, $20, $21::uuid, $22, $23, $24
        )
        ON CONFLICT (id)
        DO UPDATE SET
          subject_type = EXCLUDED.subject_type,
          subject_id = EXCLUDED.subject_id,
          reporter_user_id = EXCLUDED.reporter_user_id,
          reason = EXCLUDED.reason,
          details = EXCLUDED.details,
          evidence_urls_json = EXCLUDED.evidence_urls_json,
          status = EXCLUDED.status,
          claimed_by_user_id = EXCLUDED.claimed_by_user_id,
          claimed_at_ms = EXCLUDED.claimed_at_ms,
          escalation_reason = EXCLUDED.escalation_reason,
          escalated_by_user_id = EXCLUDED.escalated_by_user_id,
          escalated_at_ms = EXCLUDED.escalated_at_ms,
          evidence_review_status = EXCLUDED.evidence_review_status,
          investigation_summary = EXCLUDED.investigation_summary,
          evidence_reviewed_by_user_id = EXCLUDED.evidence_reviewed_by_user_id,
          evidence_reviewed_at_ms = EXCLUDED.evidence_reviewed_at_ms,
          resolution_note = EXCLUDED.resolution_note,
          resolved_by_user_id = EXCLUDED.resolved_by_user_id,
          subject_moderation_status = EXCLUDED.subject_moderation_status,
          subject_moderated_by_user_id = EXCLUDED.subject_moderated_by_user_id,
          subject_moderated_at_ms = EXCLUDED.subject_moderated_at_ms,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        report.id,
        report.subjectType,
        report.subjectId,
        report.reporterUserId,
        report.reason,
        report.details,
        JSON.stringify(report.evidenceUrls),
        report.status,
        report.claimedByUserId,
        report.claimedAt === null ? null : String(report.claimedAt),
        report.escalationReason,
        report.escalatedByUserId,
        report.escalatedAt === null ? null : String(report.escalatedAt),
        report.evidenceReviewStatus,
        report.investigationSummary,
        report.evidenceReviewedByUserId,
        report.evidenceReviewedAt === null
          ? null
          : String(report.evidenceReviewedAt),
        report.resolutionNote,
        report.resolvedByUserId,
        report.subjectModerationStatus,
        report.subjectModeratedByUserId,
        report.subjectModeratedAt === null
          ? null
          : String(report.subjectModeratedAt),
        String(report.createdAt),
        String(report.updatedAt),
      ],
    );
  }

  async getReviewById(reviewId: string) {
    const result = await this.db.query<MarketplaceReviewRow>(
      `
        SELECT *
        FROM marketplace_reviews
        WHERE id = $1
        LIMIT 1
      `,
      [reviewId],
    );

    return result.rows[0] ? mapReview(result.rows[0]) : null;
  }

  async listReviews() {
    const result = await this.db.query<MarketplaceReviewRow>(
      `
        SELECT *
        FROM marketplace_reviews
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapReview);
  }

  async saveReview(review: MarketplaceReviewRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_reviews (
          id,
          job_id,
          reviewer_user_id,
          reviewee_user_id,
          reviewer_role,
          reviewee_role,
          rating,
          scores_json,
          headline,
          body,
          visibility_status,
          moderation_note,
          moderated_by_user_id,
          moderated_at_ms,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8::jsonb, $9, $10, $11,
          $12, $13::uuid, $14, $15, $16
        )
        ON CONFLICT (id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          scores_json = EXCLUDED.scores_json,
          headline = EXCLUDED.headline,
          body = EXCLUDED.body,
          visibility_status = EXCLUDED.visibility_status,
          moderation_note = EXCLUDED.moderation_note,
          moderated_by_user_id = EXCLUDED.moderated_by_user_id,
          moderated_at_ms = EXCLUDED.moderated_at_ms,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        review.id,
        review.jobId,
        review.reviewerUserId,
        review.revieweeUserId,
        review.reviewerRole,
        review.revieweeRole,
        review.rating,
        JSON.stringify(review.scores),
        review.headline,
        review.body,
        review.visibilityStatus,
        review.moderationNote,
        review.moderatedByUserId,
        review.moderatedAt === null ? null : String(review.moderatedAt),
        String(review.createdAt),
        String(review.updatedAt),
      ],
    );
  }

  async getIdentityRiskReviewByUserId(userId: string) {
    const result = await this.db.query<MarketplaceIdentityRiskReviewRow>(
      `
        SELECT *
        FROM marketplace_identity_risk_reviews
        WHERE subject_user_id = $1::uuid
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ? mapIdentityRiskReview(result.rows[0]) : null;
  }

  async listIdentityRiskReviews() {
    const result = await this.db.query<MarketplaceIdentityRiskReviewRow>(
      `
        SELECT *
        FROM marketplace_identity_risk_reviews
        ORDER BY updated_at_ms DESC
      `,
    );

    return result.rows.map(mapIdentityRiskReview);
  }

  async saveIdentityRiskReview(review: MarketplaceIdentityRiskReviewRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_identity_risk_reviews (
          id,
          subject_user_id,
          confidence_label,
          risk_level,
          flags_json,
          operator_summary,
          reviewed_by_user_id,
          reviewed_at_ms,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5::jsonb, $6, $7::uuid, $8, $9, $10
        )
        ON CONFLICT (subject_user_id)
        DO UPDATE SET
          confidence_label = EXCLUDED.confidence_label,
          risk_level = EXCLUDED.risk_level,
          flags_json = EXCLUDED.flags_json,
          operator_summary = EXCLUDED.operator_summary,
          reviewed_by_user_id = EXCLUDED.reviewed_by_user_id,
          reviewed_at_ms = EXCLUDED.reviewed_at_ms,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        review.id,
        review.subjectUserId,
        review.confidenceLabel,
        review.riskLevel,
        JSON.stringify(review.flags),
        review.operatorSummary,
        review.reviewedByUserId,
        String(review.reviewedAt),
        String(review.createdAt),
        String(review.updatedAt),
      ],
    );
  }

  async listInteractionEvents() {
    const result = await this.db.query<MarketplaceInteractionEventRow>(
      `
        SELECT *
        FROM marketplace_interaction_events
        ORDER BY created_at_ms DESC
      `,
    );

    return result.rows.map(mapInteractionEvent);
  }

  async saveInteractionEvent(event: MarketplaceInteractionEventRecord) {
    await this.db.query(
      `
        INSERT INTO marketplace_interaction_events (
          id,
          actor_user_id,
          actor_workspace_id,
          surface,
          entity_type,
          event_type,
          entity_id,
          search_kind,
          query_label,
          category,
          timezone,
          skill_tags_json,
          result_count,
          related_opportunity_id,
          related_profile_user_id,
          related_application_id,
          related_job_id,
          created_at_ms
        )
        VALUES (
          $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13,
          $14, $15::uuid, $16, $17, $18
        )
        ON CONFLICT (id)
        DO UPDATE SET
          actor_user_id = EXCLUDED.actor_user_id,
          actor_workspace_id = EXCLUDED.actor_workspace_id,
          surface = EXCLUDED.surface,
          entity_type = EXCLUDED.entity_type,
          event_type = EXCLUDED.event_type,
          entity_id = EXCLUDED.entity_id,
          search_kind = EXCLUDED.search_kind,
          query_label = EXCLUDED.query_label,
          category = EXCLUDED.category,
          timezone = EXCLUDED.timezone,
          skill_tags_json = EXCLUDED.skill_tags_json,
          result_count = EXCLUDED.result_count,
          related_opportunity_id = EXCLUDED.related_opportunity_id,
          related_profile_user_id = EXCLUDED.related_profile_user_id,
          related_application_id = EXCLUDED.related_application_id,
          related_job_id = EXCLUDED.related_job_id,
          created_at_ms = EXCLUDED.created_at_ms
      `,
      [
        event.id,
        event.actorUserId,
        event.actorWorkspaceId,
        event.surface,
        event.entityType,
        event.eventType,
        event.entityId,
        event.searchKind,
        event.queryLabel,
        event.category,
        event.timezone,
        JSON.stringify(event.skillTags),
        event.resultCount,
        event.relatedOpportunityId,
        event.relatedProfileUserId,
        event.relatedApplicationId,
        event.relatedJobId,
        String(event.createdAt),
      ],
    );
  }
}
