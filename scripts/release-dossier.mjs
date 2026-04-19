import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildChecksumsText,
  buildReleaseDossier,
  buildReleaseDossierMarkdown,
  buildReleaseDossierMetadata,
  copyReleaseDossierSources,
  listReleaseDossierFiles,
  validateReleaseDossierInputs,
  writeGitHubStepSummary,
} from './release-dossier-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help')) {
  printHelp();
  process.exit(0);
}

try {
  const outputDir = readOptionalFlag(args, '--output-dir')
    ? resolve(repoRoot, readOptionalFlag(args, '--output-dir'))
    : resolve(repoRoot, 'artifacts', 'release-dossier');
  mkdirSync(outputDir, {
    recursive: true,
  });

  const imageManifestDir = resolve(repoRoot, readRequiredFlag(args, '--image-manifest-dir'));
  const deployedSmokeReviewDir = resolve(repoRoot, readRequiredFlag(args, '--deployed-smoke-dir'));
  const launchCandidateReviewDir = resolve(repoRoot, readRequiredFlag(args, '--launch-review-dir'));
  const promotionReviewDir = resolve(repoRoot, readRequiredFlag(args, '--promotion-review-dir'));

  copyReleaseDossierSources({
    outputDir,
    imageManifestDir,
    deployedSmokeReviewDir,
    launchCandidateReviewDir,
    promotionReviewDir,
  });

  const metadata = buildReleaseDossierMetadata(process.env);
  const imageManifest = readJson(resolve(outputDir, 'evidence', 'api-image-manifest', 'manifest.json'));
  const deployedSmokeRecord = readJson(
    resolve(outputDir, 'evidence', 'deployed-smoke-review', 'deployed-smoke-record.json'),
  );
  const launchPromotionRecord = readJson(
    resolve(outputDir, 'evidence', 'launch-candidate-review', 'promotion-record.json'),
  );
  const launchEvidenceManifest = readJson(
    resolve(outputDir, 'evidence', 'launch-candidate-review', 'evidence-manifest.json'),
  );
  const launchEvidencePosture = readJson(
    resolve(outputDir, 'evidence', 'launch-candidate-review', 'launch-evidence-posture.json'),
  );
  const promotionReview = readJson(
    resolve(outputDir, 'evidence', 'promotion-review', 'promotion-review.json'),
  );

  const issues = validateReleaseDossierInputs({
    imageManifest,
    deployedSmokeRecord,
    launchPromotionRecord,
    launchEvidenceManifest,
    launchEvidencePosture,
    promotionReview,
    metadata,
  });
  if (issues.length > 0) {
    throw new Error(
      ['Release dossier generation is blocked.', ...issues.map((issue) => `- ${issue}`)].join('\n'),
    );
  }

  const evidenceFiles = listReleaseDossierFiles(resolve(outputDir, 'evidence'));
  const record = buildReleaseDossier({
    metadata,
    imageManifest,
    deployedSmokeRecord,
    launchPromotionRecord,
    launchEvidenceManifest,
    launchEvidencePosture,
    promotionReview,
    evidenceFiles,
  });
  const markdown = buildReleaseDossierMarkdown(record);
  const checksums = buildChecksumsText(evidenceFiles);

  writeFileSync(resolve(outputDir, 'release-dossier.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  writeFileSync(resolve(outputDir, 'release-dossier.md'), markdown, 'utf8');
  writeFileSync(
    resolve(outputDir, 'release-dossier-checksums.txt'),
    `${checksums}${checksums.endsWith('\n') ? '' : '\n'}`,
    'utf8',
  );
  writeGitHubStepSummary(markdown, process.env);
  console.log(JSON.stringify(record, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
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
  node ./scripts/release-dossier.mjs --image-manifest-dir <path> --deployed-smoke-dir <path> --launch-review-dir <path> --promotion-review-dir <path> [--output-dir <path>]

Copies the reviewed release evidence into one canonical dossier directory, writes
release-dossier.json, release-dossier.md, and release-dossier-checksums.txt, and
fails if the copied evidence is internally inconsistent.`);
}
