import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDeployedSmokeMetadata,
  buildDeployedSmokeRecord,
  buildDeployedSmokeRecordMarkdown,
  buildPromotionReview,
  buildPromotionReviewMarkdown,
  validateDeployedSmokeMetadata,
  writeGitHubStepSummary,
} from './promotion-review-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  printHelp();
  process.exit(0);
}

const command = args[0];

try {
  if (command === 'smoke-record') {
    runSmokeRecord(args.slice(1));
    process.exit(0);
  }

  if (command === 'review') {
    runPromotionReview(args.slice(1));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function runSmokeRecord(argv) {
  const outputDir = readOptionalFlag(argv, '--output-dir')
    ? resolve(repoRoot, readOptionalFlag(argv, '--output-dir'))
    : resolve(repoRoot, 'artifacts', 'deployed-smoke-review');
  mkdirSync(outputDir, {
    recursive: true,
  });

  const metadata = buildDeployedSmokeMetadata(process.env);
  const issues = validateDeployedSmokeMetadata(metadata, process.env);
  if (issues.length > 0) {
    const error = [
      'Deployed smoke review artifact is blocked because the review metadata is incomplete.',
      ...issues.map((issue) => `- ${issue}`),
    ].join('\n');
    writeFileSync(resolve(outputDir, 'deployed-smoke-record-validation.txt'), `${error}\n`, 'utf8');
    throw new Error(error);
  }

  const record = buildDeployedSmokeRecord({
    metadata,
    smokePassed: readBooleanEnv(process.env.DEPLOYED_SMOKE_PASSED, true),
    seededCanaryPassed: readBooleanEnv(process.env.DEPLOYED_SMOKE_SEEDED_CANARY_PASSED, true),
    marketplaceSeededCanaryPassed: readBooleanEnv(
      process.env.DEPLOYED_SMOKE_MARKETPLACE_SEEDED_CANARY_PASSED,
      true,
    ),
  });
  const markdown = buildDeployedSmokeRecordMarkdown(record);

  writeFileSync(
    resolve(outputDir, 'deployed-smoke-record.json'),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(resolve(outputDir, 'deployed-smoke-record.md'), markdown, 'utf8');
  writeGitHubStepSummary(markdown, process.env);
  console.log(JSON.stringify(record, null, 2));
}

function runPromotionReview(argv) {
  const imageManifestPath = resolve(repoRoot, readRequiredFlag(argv, '--image-manifest'));
  const deployedSmokeRecordPath = resolve(repoRoot, readRequiredFlag(argv, '--deployed-smoke-record'));
  const launchPromotionRecordPath = resolve(
    repoRoot,
    readRequiredFlag(argv, '--launch-promotion-record'),
  );
  const launchEvidenceManifestPath = resolve(
    repoRoot,
    readRequiredFlag(argv, '--launch-evidence-manifest'),
  );
  const outputDir = readOptionalFlag(argv, '--output-dir')
    ? resolve(repoRoot, readOptionalFlag(argv, '--output-dir'))
    : resolve(repoRoot, 'artifacts', 'promotion-review');
  mkdirSync(outputDir, {
    recursive: true,
  });

  const review = buildPromotionReview({
    imageManifest: readJson(imageManifestPath),
    deployedSmokeRecord: readJson(deployedSmokeRecordPath),
    launchPromotionRecord: readJson(launchPromotionRecordPath),
    launchEvidenceManifest: readJson(launchEvidenceManifestPath),
    deployedSmokeSelection: {
      source: readOptionalFlag(argv, '--deployed-smoke-selection-source'),
      artifactId: readOptionalFlag(argv, '--deployed-smoke-artifact-id'),
      artifactName: readOptionalFlag(argv, '--deployed-smoke-artifact-name'),
      createdAt: readOptionalFlag(argv, '--deployed-smoke-created-at'),
    },
    launchCandidateSelection: {
      source: readOptionalFlag(argv, '--launch-candidate-selection-source'),
      artifactId: readOptionalFlag(argv, '--launch-candidate-artifact-id'),
      artifactName: readOptionalFlag(argv, '--launch-candidate-artifact-name'),
      createdAt: readOptionalFlag(argv, '--launch-candidate-created-at'),
    },
    expectedEnvironment: readOptionalFlag(argv, '--expected-environment'),
    expectedRepository: readOptionalFlag(argv, '--expected-repository'),
    expectedCandidateRunId: readOptionalFlag(argv, '--expected-candidate-run-id'),
    expectedSmokeRunId: readOptionalFlag(argv, '--expected-smoke-run-id'),
    expectedLaunchRunId: readOptionalFlag(argv, '--expected-launch-run-id'),
  });
  const markdown = buildPromotionReviewMarkdown(review);

  writeFileSync(
    resolve(outputDir, 'promotion-review.json'),
    `${JSON.stringify(review, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(resolve(outputDir, 'promotion-review.md'), markdown, 'utf8');
  writeGitHubStepSummary(markdown, process.env);
  console.log(JSON.stringify(review, null, 2));

  if (review.status !== 'ready') {
    throw new Error(
      ['Promotion review is blocked.', ...review.blockers.map((blocker) => `- ${blocker}`)].join('\n'),
    );
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
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
  node ./scripts/promotion-review.mjs smoke-record [--output-dir <path>]
  node ./scripts/promotion-review.mjs review --image-manifest <path> --deployed-smoke-record <path> --launch-promotion-record <path> --launch-evidence-manifest <path> [--output-dir <path>] [--expected-environment <env>] [--expected-repository <repo>] [--expected-candidate-run-id <id>] [--expected-smoke-run-id <id>] [--expected-launch-run-id <id>] [--deployed-smoke-selection-source <source>] [--deployed-smoke-artifact-id <id>] [--deployed-smoke-artifact-name <name>] [--deployed-smoke-created-at <timestamp>] [--launch-candidate-selection-source <source>] [--launch-candidate-artifact-id <id>] [--launch-candidate-artifact-name <name>] [--launch-candidate-created-at <timestamp>]

smoke-record: writes deployed-smoke-record.json and .md for a completed deployed smoke workflow run.
review: reconciles the CI image manifest, deployed smoke review, and launch-candidate review into promotion-review.json and .md.`);
}

function readBooleanEnv(rawValue, defaultValue) {
  if (typeof rawValue !== 'string') {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return defaultValue;
}
