import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildApiImageManifest,
  buildApiImageManifestMarkdown,
  buildImageCandidateSelection,
  validateApiImageManifest,
  writeGitHubStepSummary,
} from './api-image-manifest-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'generate') {
  runGenerate(args.slice(1));
} else if (command === 'resolve') {
  runResolve(args.slice(1));
} else {
  throw new Error(`Unknown command: ${command}`);
}

function runGenerate(argv) {
  const outputDir = readFlag(argv, '--output-dir')
    ? resolve(repoRoot, readFlag(argv, '--output-dir'))
    : resolve(repoRoot, 'artifacts', 'api-image-manifest');
  mkdirSync(outputDir, {
    recursive: true,
  });

  const manifest = buildApiImageManifest({
    repository: readRequiredEnv('GITHUB_REPOSITORY'),
    workflow: readRequiredEnv('GITHUB_WORKFLOW'),
    runId: readRequiredEnv('GITHUB_RUN_ID'),
    runAttempt: readRequiredEnv('GITHUB_RUN_ATTEMPT'),
    runUrl:
      process.env.GITHUB_RUN_URL?.trim() ||
      `${readRequiredEnv('GITHUB_SERVER_URL')}/${readRequiredEnv('GITHUB_REPOSITORY')}/actions/runs/${readRequiredEnv('GITHUB_RUN_ID')}`,
    eventName: readRequiredEnv('GITHUB_EVENT_NAME'),
    gitRef: process.env.GITHUB_REF_NAME?.trim() || readRequiredEnv('GITHUB_REF'),
    commitSha: readRequiredEnv('GITHUB_SHA'),
    imageName: readRequiredEnv('API_IMAGE_NAME'),
    imageDigest: readRequiredEnv('API_IMAGE_DIGEST'),
    imageTags: readRequiredEnv('API_IMAGE_TAGS'),
  });
  const markdown = buildApiImageManifestMarkdown(manifest);

  writeFileSync(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(outputDir, 'manifest.md'), markdown, 'utf8');
  writeGitHubStepSummary(markdown, process.env);
  console.log(JSON.stringify(manifest, null, 2));
}

function runResolve(argv) {
  const manifestPath = resolve(repoRoot, readRequiredFlag(argv, '--manifest'));
  const envFile = readFlag(argv, '--write-env')
    ? resolve(repoRoot, readFlag(argv, '--write-env'))
    : null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const issues = validateApiImageManifest(manifest, {
    expectedRepository: readFlag(argv, '--expected-repository'),
    expectedCommitSha: readFlag(argv, '--expected-commit-sha'),
    expectedRunId: readFlag(argv, '--expected-run-id'),
  });
  if (issues.length > 0) {
    throw new Error(
      ['API image manifest validation failed.', ...issues.map((issue) => `- ${issue}`)].join('\n'),
    );
  }

  const selection = buildImageCandidateSelection(manifest);
  if (envFile) {
    writeFileSync(
      envFile,
      [
        `CANDIDATE_REPOSITORY=${selection.repository}`,
        `CANDIDATE_WORKFLOW=${selection.workflow}`,
        `CANDIDATE_RUN_ID=${selection.runId}`,
        `CANDIDATE_RUN_ATTEMPT=${selection.runAttempt}`,
        `CANDIDATE_RUN_URL=${selection.runUrl}`,
        `CANDIDATE_GIT_REF=${selection.gitRef}`,
        `CANDIDATE_COMMIT_SHA=${selection.commitSha}`,
        `CANDIDATE_IMAGE_NAME=${selection.imageName}`,
        `CANDIDATE_IMAGE_SHA=${selection.imageDigest}`,
        `CANDIDATE_IMAGE_REFERENCE=${selection.imageReference}`,
        `CANDIDATE_IMAGE_TAGS=${selection.imageTags.join(',')}`,
      ].join('\n') + '\n',
      'utf8',
    );
  }

  console.log(JSON.stringify(selection, null, 2));
}

function readRequiredEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readRequiredFlag(argv, flag) {
  const value = readFlag(argv, flag);
  if (!value) {
    throw new Error(`${flag} is required.`);
  }

  return value;
}

function readFlag(argv, flag) {
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage:
  node ./scripts/api-image-manifest.mjs generate [--output-dir <path>]
  node ./scripts/api-image-manifest.mjs resolve --manifest <path> [--expected-repository <repo>] [--expected-commit-sha <sha>] [--expected-run-id <run-id>] [--write-env <path>]

Generate: writes manifest.json and manifest.md for the CI-published API image.
Resolve: validates a downloaded manifest and prints the selected candidate metadata as JSON.`);
}
