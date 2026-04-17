import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolvePromotionReviewSelections,
} from './release-review-selection-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help')) {
  printHelp();
  process.exit(0);
}

const command = args[0];

try {
  if (command !== 'resolve') {
    throw new Error(`Unknown command: ${command ?? '<missing>'}`);
  }

  const environment = readRequiredFlag(args, '--environment');
  const candidateRunId = readRequiredFlag(args, '--candidate-run-id');
  const deployedSmokeRunId = readOptionalFlag(args, '--deployed-smoke-run-id');
  const launchCandidateRunId = readOptionalFlag(args, '--launch-candidate-run-id');
  const writeEnvPath = readOptionalFlag(args, '--write-env');
  const artifacts =
    deployedSmokeRunId && launchCandidateRunId ? [] : await listRepoArtifacts();

  const selection = resolvePromotionReviewSelections({
    environment,
    candidateRunId,
    deployedSmokeRunId,
    launchCandidateRunId,
    artifacts,
  });

  if (writeEnvPath) {
    const resolvedPath = resolve(repoRoot, writeEnvPath);
    mkdirSync(resolve(resolvedPath, '..'), {
      recursive: true,
    });
    writeFileSync(
      resolvedPath,
      [
        `PROMOTION_REVIEW_DEPLOYED_SMOKE_RUN_ID=${selection.deployedSmoke.runId}`,
        `PROMOTION_REVIEW_DEPLOYED_SMOKE_ARTIFACT_NAME=${selection.deployedSmoke.artifactName}`,
        `PROMOTION_REVIEW_DEPLOYED_SMOKE_SELECTION_SOURCE=${selection.deployedSmoke.source}`,
        `PROMOTION_REVIEW_DEPLOYED_SMOKE_ARTIFACT_ID=${selection.deployedSmoke.artifactId ?? ''}`,
        `PROMOTION_REVIEW_DEPLOYED_SMOKE_CREATED_AT=${selection.deployedSmoke.createdAt ?? ''}`,
        `PROMOTION_REVIEW_LAUNCH_CANDIDATE_RUN_ID=${selection.launchCandidate.runId}`,
        `PROMOTION_REVIEW_LAUNCH_CANDIDATE_ARTIFACT_NAME=${selection.launchCandidate.artifactName}`,
        `PROMOTION_REVIEW_LAUNCH_CANDIDATE_SELECTION_SOURCE=${selection.launchCandidate.source}`,
        `PROMOTION_REVIEW_LAUNCH_CANDIDATE_ARTIFACT_ID=${selection.launchCandidate.artifactId ?? ''}`,
        `PROMOTION_REVIEW_LAUNCH_CANDIDATE_CREATED_AT=${selection.launchCandidate.createdAt ?? ''}`,
      ].join('\n') + '\n',
      'utf8',
    );
  }

  console.log(JSON.stringify(selection, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
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
  node ./scripts/release-review-selection.mjs resolve --environment <env> --candidate-run-id <id> [--deployed-smoke-run-id <id>] [--launch-candidate-run-id <id>] [--write-env <path>]

Resolves the deployed-smoke-review and launch-candidate-review artifact names
and workflow run ids for a candidate. If override run ids are omitted, the
script queries the GitHub Actions artifact list and selects the newest
non-expired matching review artifacts for the environment and candidate.`);
}
