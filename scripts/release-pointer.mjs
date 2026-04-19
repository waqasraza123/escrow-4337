import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReleasePointer,
  buildReleasePointerArtifactName,
  selectLatestReleasePointerArtifact,
  validateReleasePointer,
} from './release-pointer-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  printHelp();
  process.exit(0);
}

const command = args[0];

try {
  if (command === 'generate') {
    runGenerate(args.slice(1));
    process.exit(0);
  }

  if (command === 'resolve') {
    await runResolve(args.slice(1));
    process.exit(0);
  }

  if (command === 'validate') {
    runValidate(args.slice(1));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function runGenerate(argv) {
  const releaseDossierPath = resolve(repoRoot, readRequiredFlag(argv, '--release-dossier'));
  const outputDir = readOptionalFlag(argv, '--output-dir')
    ? resolve(repoRoot, readOptionalFlag(argv, '--output-dir'))
    : resolve(repoRoot, 'artifacts', 'release-pointer');
  mkdirSync(outputDir, {
    recursive: true,
  });

  const pointer = buildReleasePointer({
    releaseDossier: JSON.parse(readFileSync(releaseDossierPath, 'utf8')),
  });
  const issues = validateReleasePointer(pointer, {
    expectedEnvironment: pointer.environment,
    requireReadyLaunchPosture: true,
  });
  if (issues.length > 0) {
    throw new Error(['Release pointer validation failed.', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  }

  const markdown = buildMarkdown(pointer);
  writeFileSync(resolve(outputDir, 'release-pointer.json'), `${JSON.stringify(pointer, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(outputDir, 'release-pointer.md'), markdown, 'utf8');
  console.log(JSON.stringify(pointer, null, 2));
}

async function runResolve(argv) {
  const environment = readRequiredFlag(argv, '--environment');
  const outputEnv = readOptionalFlag(argv, '--write-env');
  const artifacts = await listRepoArtifacts();
  const selection = selectLatestReleasePointerArtifact({
    artifacts,
    environment,
  });

  if (outputEnv) {
    const resolvedPath = resolve(repoRoot, outputEnv);
    mkdirSync(resolve(resolvedPath, '..'), {
      recursive: true,
    });
    writeFileSync(
      resolvedPath,
      [
        `RELEASE_POINTER_RUN_ID=${selection.runId}`,
        `RELEASE_POINTER_ARTIFACT_NAME=${selection.artifactName}`,
        `RELEASE_POINTER_SELECTION_SOURCE=${selection.source ?? ''}`,
        `RELEASE_POINTER_ARTIFACT_ID=${selection.artifactId ?? ''}`,
        `RELEASE_POINTER_SELECTED_CREATED_AT=${selection.createdAt ?? ''}`,
      ].join('\n') + '\n',
      'utf8',
    );
  }

  console.log(JSON.stringify(selection, null, 2));
}

function runValidate(argv) {
  const pointerPath = resolve(repoRoot, readRequiredFlag(argv, '--pointer'));
  const expectedEnvironment = readOptionalFlag(argv, '--expected-environment');
  const outputEnv = readOptionalFlag(argv, '--write-env');
  const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
  const issues = validateReleasePointer(pointer, {
    expectedEnvironment,
    requireReadyLaunchPosture: argv.includes('--require-ready-launch-posture'),
  });
  if (issues.length > 0) {
    throw new Error(['Release pointer validation failed.', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  }

  if (outputEnv) {
    const resolvedPath = resolve(repoRoot, outputEnv);
    mkdirSync(resolve(resolvedPath, '..'), {
      recursive: true,
    });
    writeFileSync(
      resolvedPath,
      [
        `RELEASE_POINTER_ENVIRONMENT=${pointer.environment}`,
        `RELEASE_POINTER_REPOSITORY=${pointer.repository}`,
        `RELEASE_POINTER_ARTIFACT_NAME=${pointer.artifactName}`,
        `RELEASE_POINTER_RELEASE_REVIEW_RUN_ID=${pointer.releaseReviewRunId}`,
        `RELEASE_POINTER_RELEASE_REVIEW_RUN_URL=${pointer.releaseReviewRunUrl}`,
        `RELEASE_POINTER_CANDIDATE_RUN_ID=${pointer.candidateRunId}`,
        `RELEASE_POINTER_CANDIDATE_RUN_URL=${pointer.candidateRunUrl}`,
        `RELEASE_POINTER_COMMIT_SHA=${pointer.commitSha}`,
        `RELEASE_POINTER_IMAGE_DIGEST=${pointer.imageDigest}`,
        `RELEASE_POINTER_IMAGE_REFERENCE=${pointer.imageReference ?? ''}`,
        `RELEASE_POINTER_IMAGE_NAME=${pointer.imageName ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_IMAGE_SHA=${pointer.rollbackImageSha ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_SOURCE=${pointer.rollbackSource ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_POINTER_RUN_ID=${pointer.rollbackPointerRunId ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_POINTER_ARTIFACT_NAME=${pointer.rollbackPointerArtifactName ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_POINTER_SELECTION_SOURCE=${pointer.rollbackPointerSelectionSource ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_POINTER_ARTIFACT_ID=${pointer.rollbackPointerArtifactId ?? ''}`,
        `RELEASE_POINTER_ROLLBACK_POINTER_SELECTED_CREATED_AT=${pointer.rollbackPointerSelectedCreatedAt ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_PASSED=${pointer.deployedSmokePassed ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_SEEDED_CANARY_PASSED=${pointer.deployedSmokeSeededCanaryPassed ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_MARKETPLACE_SEEDED_CANARY_PASSED=${pointer.deployedSmokeMarketplaceSeededCanaryPassed ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_SELECTION_SOURCE=${pointer.deployedSmokeSelectionSource ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_ARTIFACT_ID=${pointer.deployedSmokeArtifactId ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_ARTIFACT_NAME=${pointer.deployedSmokeArtifactName ?? ''}`,
        `RELEASE_POINTER_DEPLOYED_SMOKE_SELECTED_CREATED_AT=${pointer.deployedSmokeSelectedCreatedAt ?? ''}`,
        `RELEASE_POINTER_LAUNCH_CANDIDATE_SELECTION_SOURCE=${pointer.launchCandidateSelectionSource ?? ''}`,
        `RELEASE_POINTER_LAUNCH_CANDIDATE_ARTIFACT_ID=${pointer.launchCandidateArtifactId ?? ''}`,
        `RELEASE_POINTER_LAUNCH_CANDIDATE_ARTIFACT_NAME=${pointer.launchCandidateArtifactName ?? ''}`,
        `RELEASE_POINTER_LAUNCH_CANDIDATE_SELECTED_CREATED_AT=${pointer.launchCandidateSelectedCreatedAt ?? ''}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_SEEDED_CANARY_FAILURES=${pointer.launchMarketplaceSeededCanaryFailures ?? ''}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_EXACT_CANARY_FAILURES=${pointer.launchMarketplaceExactCanaryFailures ?? ''}`,
        `RELEASE_POINTER_AUTHORITY_AUDIT_SOURCE=${pointer.authorityAuditSource ?? ''}`,
        `RELEASE_POINTER_LAUNCH_REQUIRED_ARTIFACT_COUNT=${pointer.launchRequiredArtifactCount ?? ''}`,
        `RELEASE_POINTER_LAUNCH_MISSING_ARTIFACT_COUNT=${pointer.launchMissingArtifactCount ?? ''}`,
        `RELEASE_POINTER_LAUNCH_EVIDENCE_COMPLETE=${pointer.launchEvidenceComplete ?? ''}`,
        `RELEASE_POINTER_LAUNCH_PROVIDER_FAILURE_COUNT=${pointer.launchProviderFailureCount ?? ''}`,
        `RELEASE_POINTER_LAUNCH_PROVIDER_WARNING_COUNT=${pointer.launchProviderWarningCount ?? ''}`,
        `RELEASE_POINTER_LAUNCH_EXECUTION_TRACE_EXECUTION_COUNT=${pointer.launchExecutionTraceExecutionCount ?? ''}`,
        `RELEASE_POINTER_LAUNCH_EXECUTION_TRACE_CORRELATION_TAGGED_EXECUTIONS=${pointer.launchExecutionTraceCorrelationTaggedExecutions ?? ''}`,
        `RELEASE_POINTER_LAUNCH_EXECUTION_TRACE_REQUEST_TAGGED_EXECUTIONS=${pointer.launchExecutionTraceRequestTaggedExecutions ?? ''}`,
        `RELEASE_POINTER_LAUNCH_EXECUTION_TRACE_OPERATION_TAGGED_EXECUTIONS=${pointer.launchExecutionTraceOperationTaggedExecutions ?? ''}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_ORIGIN_OK=${pointer.launchMarketplaceOriginOk ?? ''}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_ORIGIN_CONFIRMED_MODES=${(pointer.launchMarketplaceOriginConfirmedModes ?? []).join(',')}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_ORIGIN_MISSING_MODES=${(pointer.launchMarketplaceOriginMissingModes ?? []).join(',')}`,
        `RELEASE_POINTER_LAUNCH_MARKETPLACE_ORIGIN_FAILED_MODES=${(pointer.launchMarketplaceOriginFailedModes ?? []).join(',')}`,
      ].join('\n') + '\n',
      'utf8',
    );
  }

  console.log(JSON.stringify(pointer, null, 2));
}

async function listRepoArtifacts() {
  const token = readRequiredEnv('GITHUB_TOKEN');
  const repository = readRequiredEnv('GITHUB_REPOSITORY');
  const apiBaseUrl = process.env.GITHUB_API_URL?.trim() || 'https://api.github.com';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY must be formatted as owner/repo.');
  }

  const artifacts = [];
  let page = 1;

  while (true) {
    const url = new URL(`/repos/${owner}/${repo}/actions/artifacts`, apiBaseUrl);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to list repository artifacts: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    artifacts.push(...(Array.isArray(payload.artifacts) ? payload.artifacts : []));

    if (!Array.isArray(payload.artifacts) || payload.artifacts.length < 100) {
      break;
    }
    page += 1;
  }

  return artifacts;
}

function buildMarkdown(pointer) {
  return `# Release Pointer

- Environment: ${pointer.environment}
- Artifact name: ${pointer.artifactName}
- Release review run ID: ${pointer.releaseReviewRunId}
- Release review run URL: ${pointer.releaseReviewRunUrl}
- Candidate run ID: ${pointer.candidateRunId}
- Candidate run URL: ${pointer.candidateRunUrl}
- Commit SHA: ${pointer.commitSha}
- Image digest: ${pointer.imageDigest}
- Image reference: ${pointer.imageReference ?? 'n/a'}
- Rollback image SHA: ${pointer.rollbackImageSha ?? 'n/a'}
- Rollback source: ${pointer.rollbackSource ?? 'n/a'}
- Rollback pointer run ID: ${pointer.rollbackPointerRunId ?? 'n/a'}
- Rollback pointer artifact: ${pointer.rollbackPointerArtifactName ?? 'n/a'}
- Rollback pointer selection source: ${pointer.rollbackPointerSelectionSource ?? 'n/a'}
- Rollback pointer artifact ID: ${pointer.rollbackPointerArtifactId ?? 'n/a'}
- Rollback pointer selected at: ${pointer.rollbackPointerSelectedCreatedAt ?? 'n/a'}
- Deployed smoke passed: ${formatOptionalBoolean(pointer.deployedSmokePassed)}
- Deployed smoke seeded canary passed: ${formatOptionalBoolean(pointer.deployedSmokeSeededCanaryPassed)}
- Deployed smoke marketplace seeded canary passed: ${formatOptionalBoolean(pointer.deployedSmokeMarketplaceSeededCanaryPassed)}
- Deployed smoke selection source: ${pointer.deployedSmokeSelectionSource ?? 'n/a'}
- Deployed smoke artifact ID: ${pointer.deployedSmokeArtifactId ?? 'n/a'}
- Deployed smoke artifact name: ${pointer.deployedSmokeArtifactName ?? 'n/a'}
- Deployed smoke selected at: ${pointer.deployedSmokeSelectedCreatedAt ?? 'n/a'}
- Launch candidate selection source: ${pointer.launchCandidateSelectionSource ?? 'n/a'}
- Launch candidate artifact ID: ${pointer.launchCandidateArtifactId ?? 'n/a'}
- Launch candidate artifact name: ${pointer.launchCandidateArtifactName ?? 'n/a'}
- Launch candidate selected at: ${pointer.launchCandidateSelectedCreatedAt ?? 'n/a'}
- Launch marketplace seeded canary failures: ${pointer.launchMarketplaceSeededCanaryFailures ?? 'n/a'}
- Launch marketplace exact canary failures: ${pointer.launchMarketplaceExactCanaryFailures ?? 'n/a'}
- Authority audit source: ${pointer.authorityAuditSource ?? 'n/a'}
- Launch required artifact count: ${pointer.launchRequiredArtifactCount ?? 'n/a'}
- Launch missing artifact count: ${pointer.launchMissingArtifactCount ?? 'n/a'}
- Launch evidence complete: ${formatOptionalBoolean(pointer.launchEvidenceComplete)}
- Launch provider failure count: ${pointer.launchProviderFailureCount ?? 'n/a'}
- Launch provider warning count: ${pointer.launchProviderWarningCount ?? 'n/a'}
- Launch execution trace coverage: ${
    pointer.launchExecutionTraceExecutionCount !== null &&
    pointer.launchExecutionTraceExecutionCount !== undefined
      ? `${pointer.launchExecutionTraceCorrelationTaggedExecutions ?? 0}/${pointer.launchExecutionTraceExecutionCount} correlated, ${pointer.launchExecutionTraceRequestTaggedExecutions ?? 0}/${pointer.launchExecutionTraceExecutionCount} request-tagged, ${pointer.launchExecutionTraceOperationTaggedExecutions ?? 0}/${pointer.launchExecutionTraceExecutionCount} operation-tagged`
      : 'n/a'
  }
- Launch marketplace origin proof: ${formatOptionalBoolean(pointer.launchMarketplaceOriginOk)}
- Launch marketplace origin confirmed modes: ${
    pointer.launchMarketplaceOriginConfirmedModes?.length
      ? pointer.launchMarketplaceOriginConfirmedModes.join(', ')
      : 'n/a'
  }
- Launch marketplace origin missing modes: ${
    pointer.launchMarketplaceOriginMissingModes?.length
      ? pointer.launchMarketplaceOriginMissingModes.join(', ')
      : 'none'
  }
- Launch marketplace origin failed modes: ${
    pointer.launchMarketplaceOriginFailedModes?.length
      ? pointer.launchMarketplaceOriginFailedModes.join(', ')
      : 'none'
  }
`;
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function readRequiredFlag(argv, flag) {
  const value = readOptionalFlag(argv, flag);
  if (!value) {
    throw new Error(`Missing required flag ${flag}.`);
  }

  return value;
}

function readOptionalFlag(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function printHelp() {
  console.log(`Usage:
  node ./scripts/release-pointer.mjs generate --release-dossier <path> [--output-dir <path>]
  node ./scripts/release-pointer.mjs resolve --environment <env> [--write-env <path>]
  node ./scripts/release-pointer.mjs validate --pointer <path> [--expected-environment <env>] [--require-ready-launch-posture] [--write-env <path>]

generate: writes a ready-only release pointer derived from release-dossier.json.
resolve: finds the newest non-expired release pointer artifact for an environment and prints the run id plus artifact name.
validate: validates release-pointer.json, can require green launch posture fields, and can write its fields as shell env assignments.`);
}

function formatOptionalBoolean(value) {
  return typeof value === 'boolean' ? String(value) : 'n/a';
}
