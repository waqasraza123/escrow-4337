import type { EscrowContractAction } from './onchain/escrow-contract.types';
import type {
  EscrowExecutionRecord,
  EscrowExecutionTraceGroup,
  EscrowExecutionTraceSummary,
} from './escrow.types';

function executionAt(execution: EscrowExecutionRecord) {
  return execution.confirmedAt ?? execution.submittedAt;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      ),
    ),
  );
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is number => typeof value === 'number'),
    ),
  ).sort((left, right) => left - right);
}

function buildTraceId(execution: EscrowExecutionRecord) {
  if (execution.correlationId) {
    return execution.correlationId;
  }
  if (execution.requestId) {
    return `request:${execution.requestId}`;
  }
  if (execution.idempotencyKey) {
    return `idempotency:${execution.idempotencyKey}`;
  }
  if (execution.operationKey) {
    return `operation:${execution.operationKey}`;
  }
  return `execution:${execution.id}`;
}

export function buildExecutionTraceSummary(
  executions: EscrowExecutionRecord[],
): EscrowExecutionTraceSummary {
  const grouped = new Map<string, EscrowExecutionRecord[]>();
  let confirmedExecutions = 0;
  let failedExecutions = 0;
  let requestTaggedExecutions = 0;
  let correlationTaggedExecutions = 0;
  let idempotentExecutions = 0;
  let operationTaggedExecutions = 0;
  let confirmedWithoutCorrelation = 0;
  let failedWithoutCorrelation = 0;

  for (const execution of executions) {
    if (execution.status === 'confirmed') {
      confirmedExecutions += 1;
    } else {
      failedExecutions += 1;
    }

    if (execution.requestId) {
      requestTaggedExecutions += 1;
    }
    if (execution.correlationId) {
      correlationTaggedExecutions += 1;
    } else if (execution.status === 'confirmed') {
      confirmedWithoutCorrelation += 1;
    } else if (execution.status === 'failed') {
      failedWithoutCorrelation += 1;
    }
    if (execution.idempotencyKey) {
      idempotentExecutions += 1;
    }
    if (execution.operationKey) {
      operationTaggedExecutions += 1;
    }

    const traceId = buildTraceId(execution);
    const existing = grouped.get(traceId);
    if (existing) {
      existing.push(execution);
    } else {
      grouped.set(traceId, [execution]);
    }
  }

  const traces: EscrowExecutionTraceGroup[] = Array.from(grouped.entries())
    .map(([traceId, traceExecutions]) => {
      const sortedExecutions = [...traceExecutions].sort(
        (left, right) =>
          executionAt(left) - executionAt(right) ||
          left.submittedAt - right.submittedAt ||
          left.id.localeCompare(right.id),
      );
      const latestExecution = sortedExecutions[sortedExecutions.length - 1];
      const actions = uniqueStrings(
        sortedExecutions.map((execution) => execution.action),
      ) as EscrowContractAction[];
      const txHashes = uniqueStrings(
        sortedExecutions.map((execution) => execution.txHash ?? null),
      );

      return {
        traceId,
        correlationId:
          sortedExecutions.find((execution) => execution.correlationId)
            ?.correlationId ?? null,
        requestIds: uniqueStrings(
          sortedExecutions.map((execution) => execution.requestId ?? null),
        ),
        idempotencyKeys: uniqueStrings(
          sortedExecutions.map((execution) => execution.idempotencyKey ?? null),
        ),
        operationKeys: uniqueStrings(
          sortedExecutions.map((execution) => execution.operationKey ?? null),
        ),
        actions,
        milestoneIndices: uniqueNumbers(
          sortedExecutions.map((execution) => execution.milestoneIndex ?? null),
        ),
        txHashes,
        statusCounts: {
          pending: 0,
          confirmed: sortedExecutions.filter(
            (execution) => execution.status === 'confirmed',
          ).length,
          failed: sortedExecutions.filter(
            (execution) => execution.status === 'failed',
          ).length,
        },
        firstSubmittedAt: sortedExecutions[0]?.submittedAt ?? 0,
        latestSubmittedAt: latestExecution?.submittedAt ?? 0,
        latestConfirmedAt:
          sortedExecutions
            .map((execution) => execution.confirmedAt ?? null)
            .filter((value): value is number => typeof value === 'number')
            .sort((left, right) => right - left)[0] ?? null,
      };
    })
    .sort(
      (left, right) =>
        right.latestSubmittedAt - left.latestSubmittedAt ||
        right.firstSubmittedAt - left.firstSubmittedAt ||
        right.traceId.localeCompare(left.traceId),
    );

  return {
    executionCount: executions.length,
    traceCount: traces.length,
    confirmedExecutions,
    failedExecutions,
    pendingExecutions: Math.max(
      executions.length - confirmedExecutions - failedExecutions,
      0,
    ),
    requestTaggedExecutions,
    correlationTaggedExecutions,
    idempotentExecutions,
    operationTaggedExecutions,
    confirmedWithoutCorrelation,
    failedWithoutCorrelation,
    traces,
  };
}
