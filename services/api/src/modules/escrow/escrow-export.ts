import type {
  EscrowAuditBundle,
  EscrowDisputeCaseExport,
  EscrowExportArtifactKind,
  EscrowExportDocument,
  EscrowExportFormat,
  EscrowExportTimelineEntry,
  EscrowJobHistoryExport,
} from './escrow.types';
import { buildExecutionTraceSummary } from './escrow-execution-traces';

const EXPORT_SCHEMA_VERSION = 1 as const;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableStringify(nestedValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((value) =>
      escapeCsv(value === null || value === undefined ? '' : String(value)),
    )
    .join(',');
}

function sortTimeline(
  entries: EscrowExportTimelineEntry[],
): EscrowExportTimelineEntry[] {
  return [...entries].sort((left, right) => {
    if (left.at !== right.at) {
      return left.at - right.at;
    }

    if (left.source !== right.source) {
      return left.source.localeCompare(right.source);
    }

    if (left.label !== right.label) {
      return left.label.localeCompare(right.label);
    }

    return (left.milestoneIndex ?? -1) - (right.milestoneIndex ?? -1);
  });
}

function latestActivityAt(bundle: EscrowAuditBundle['bundle']) {
  const auditTimes = bundle.audit.map((event) => event.at);
  const executionTimes = bundle.executions.map(
    (execution) => execution.confirmedAt ?? execution.submittedAt,
  );
  const milestoneTimes = bundle.job.milestones.flatMap((milestone) =>
    [
      milestone.dueAt,
      milestone.deliveredAt,
      milestone.disputedAt,
      milestone.releasedAt,
      milestone.resolvedAt,
    ].filter((value): value is number => Boolean(value)),
  );
  const times = [...auditTimes, ...executionTimes, ...milestoneTimes];

  return times.length > 0 ? Math.max(...times) : null;
}

function buildTimeline(bundle: EscrowAuditBundle['bundle']) {
  const auditEntries = bundle.audit.map(
    (event): EscrowExportTimelineEntry => ({
      source: 'audit',
      at: event.at,
      label: event.type,
      milestoneIndex:
        'milestoneIndex' in event.payload &&
        typeof event.payload.milestoneIndex === 'number'
          ? event.payload.milestoneIndex
          : null,
      status: null,
      actorAddress: null,
      txHash: null,
      detail: {
        payload: event.payload,
      },
    }),
  );
  const executionEntries = bundle.executions.map(
    (execution): EscrowExportTimelineEntry => ({
      source: 'execution',
      at: execution.confirmedAt ?? execution.submittedAt,
      label: execution.action,
      milestoneIndex: execution.milestoneIndex ?? null,
      status: execution.status,
      actorAddress: execution.actorAddress,
      txHash: execution.txHash ?? null,
      detail: {
        chainId: execution.chainId,
        contractAddress: execution.contractAddress,
        requestId: execution.requestId ?? null,
        correlationId: execution.correlationId ?? null,
        idempotencyKey: execution.idempotencyKey ?? null,
        operationKey: execution.operationKey ?? null,
        blockNumber: execution.blockNumber ?? null,
        submittedAt: execution.submittedAt,
        confirmedAt: execution.confirmedAt ?? null,
        escrowId: execution.escrowId ?? null,
        failureCode: execution.failureCode ?? null,
        failureMessage: execution.failureMessage ?? null,
      },
    }),
  );

  return sortTimeline([...auditEntries, ...executionEntries]);
}

function buildJobHistoryExport(
  bundle: EscrowAuditBundle['bundle'],
  exportedAt: string,
): EscrowJobHistoryExport {
  const executionTraces = buildExecutionTraceSummary(bundle.executions);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    artifact: 'job-history',
    exportedAt,
    authority: bundle.authority,
    job: bundle.job,
    summary: {
      milestoneCount: bundle.job.milestones.length,
      disputedMilestones: bundle.job.milestones.filter(
        (milestone) => milestone.status === 'disputed',
      ).length,
      failedExecutions: bundle.executions.filter(
        (execution) => execution.status === 'failed',
      ).length,
      latestActivityAt: latestActivityAt(bundle),
      executionTraces,
    },
    audit: bundle.audit,
    executions: bundle.executions,
    timeline: buildTimeline(bundle),
  };
}

function buildDisputeCaseExport(
  bundle: EscrowAuditBundle['bundle'],
  exportedAt: string,
): EscrowDisputeCaseExport {
  const executionTraces = buildExecutionTraceSummary(bundle.executions);
  const disputes = bundle.job.milestones
    .map((milestone, milestoneIndex) => {
      const relatedAudit = bundle.audit.filter(
        (event) =>
          'milestoneIndex' in event.payload &&
          event.payload.milestoneIndex === milestoneIndex,
      );
      const relatedExecutions = bundle.executions.filter(
        (execution) => execution.milestoneIndex === milestoneIndex,
      );
      const hasDisputeMaterial =
        milestone.disputedAt !== undefined ||
        milestone.resolutionAction !== undefined ||
        Boolean(milestone.disputeReason?.trim()) ||
        relatedAudit.some(
          (event) =>
            event.type === 'milestone.disputed' ||
            event.type === 'milestone.resolved',
        );

      if (!hasDisputeMaterial) {
        return null;
      }

      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        disputedAt: milestone.disputedAt ?? null,
        resolvedAt: milestone.resolvedAt ?? null,
        disputeReason: milestone.disputeReason?.trim() || null,
        disputeEvidenceUrls: milestone.disputeEvidenceUrls ?? [],
        resolutionAction: milestone.resolutionAction ?? null,
        resolutionNote: milestone.resolutionNote?.trim() || null,
        relatedAudit,
        relatedExecutions,
      };
    })
    .filter(
      (
        dispute,
      ): dispute is NonNullable<EscrowDisputeCaseExport['disputes'][number]> =>
        Boolean(dispute),
    );

  const failedExecutions = bundle.executions.filter(
    (execution) => execution.status === 'failed',
  );

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    artifact: 'dispute-case',
    exportedAt,
    authority: bundle.authority,
    job: bundle.job,
    summary: {
      disputeCount: disputes.length,
      openDisputes: disputes.filter((dispute) => dispute.status === 'disputed')
        .length,
      resolvedDisputes: disputes.filter(
        (dispute) => dispute.resolutionAction !== null,
      ).length,
      failedExecutions: failedExecutions.length,
      latestActivityAt: latestActivityAt(bundle),
      executionTraces,
    },
    disputes,
    failedExecutions,
  };
}

function buildJobHistoryCsv(exportDocument: EscrowJobHistoryExport) {
  const header = toCsvRow([
    'job_id',
    'job_title',
    'artifact',
    'source',
    'occurred_at',
    'label',
    'milestone_index',
    'status',
    'actor_address',
    'tx_hash',
    'detail_json',
  ]);
  const rows = exportDocument.timeline.map((entry) =>
    toCsvRow([
      exportDocument.job.id,
      exportDocument.job.title,
      exportDocument.artifact,
      entry.source,
      entry.at,
      entry.label,
      entry.milestoneIndex,
      entry.status,
      entry.actorAddress,
      entry.txHash,
      stableStringify(entry.detail),
    ]),
  );

  return [header, ...rows].join('\n');
}

function buildDisputeCaseCsv(exportDocument: EscrowDisputeCaseExport) {
  const header = toCsvRow([
    'job_id',
    'job_title',
    'artifact',
    'milestone_index',
    'milestone_title',
    'status',
    'amount',
    'disputed_at',
    'resolved_at',
    'dispute_reason',
    'dispute_evidence_urls',
    'resolution_action',
    'resolution_note',
    'related_audit_count',
    'related_execution_count',
    'failed_execution_count',
  ]);
  const rows = exportDocument.disputes.map((dispute) =>
    toCsvRow([
      exportDocument.job.id,
      exportDocument.job.title,
      exportDocument.artifact,
      dispute.milestoneIndex,
      dispute.title,
      dispute.status,
      dispute.amount,
      dispute.disputedAt,
      dispute.resolvedAt,
      dispute.disputeReason,
      dispute.disputeEvidenceUrls.join(' '),
      dispute.resolutionAction,
      dispute.resolutionNote,
      dispute.relatedAudit.length,
      dispute.relatedExecutions.length,
      dispute.relatedExecutions.filter(
        (execution) => execution.status === 'failed',
      ).length,
    ]),
  );

  return [header, ...rows].join('\n');
}

function buildFileName(
  jobId: string,
  artifact: EscrowExportArtifactKind,
  format: EscrowExportFormat,
  exportedAt: string,
) {
  const safeTimestamp = exportedAt
    .replace(/[:.]/g, '-')
    .replace(/-+Z$/, 'Z')
    .replace(/[^0-9TZ-]/g, '');

  return `escrow-${jobId}-${artifact}-${safeTimestamp}.${format}`;
}

export function buildEscrowExportDocument(
  bundle: EscrowAuditBundle['bundle'],
  artifact: EscrowExportArtifactKind,
  format: EscrowExportFormat,
  exportedAt = new Date().toISOString(),
): EscrowExportDocument {
  const fileName = buildFileName(bundle.job.id, artifact, format, exportedAt);

  if (artifact === 'job-history') {
    const exportDocument = buildJobHistoryExport(bundle, exportedAt);

    if (format === 'json') {
      return {
        artifact,
        format,
        contentType: 'application/json; charset=utf-8',
        fileName,
        body: exportDocument,
      };
    }

    return {
      artifact,
      format,
      contentType: 'text/csv; charset=utf-8',
      fileName,
      body: buildJobHistoryCsv(exportDocument),
    };
  }

  const exportDocument = buildDisputeCaseExport(bundle, exportedAt);

  if (format === 'json') {
    return {
      artifact,
      format,
      contentType: 'application/json; charset=utf-8',
      fileName,
      body: exportDocument,
    };
  }

  return {
    artifact,
    format,
    contentType: 'text/csv; charset=utf-8',
    fileName,
    body: buildDisputeCaseCsv(exportDocument),
  };
}
