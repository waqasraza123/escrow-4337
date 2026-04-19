import { Wallet } from 'ethers';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/test';
import {
  linkWallet,
  provisionSmartAccount,
  signInWithOtp,
} from '../../../flows/launch-candidate-flow';
import { runAuthenticatedMarketplaceExactFlow } from '../../../flows/marketplace-exact-flow';
import { buildEscrowExportProbes } from '../../../flows/operator-export-flow';
import { writeMarketplaceJourneyEvidence } from '../../../fixtures/marketplace-evidence';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

test('[@exact] deployed environment can exercise the exact marketplace publish-to-export flow through browser auth and setup UI', async ({
  browser,
  request,
  runId,
}) => {
  test.skip(
    !deployedFlow,
    'Set PLAYWRIGHT_DEPLOYED_FLOW_* secrets to run the staged exact marketplace canary.',
  );
  test.setTimeout(360_000);

  const runtimeResponse = await request.get(`${deployed.apiBaseUrl}/operations/runtime-profile`);
  expect(runtimeResponse.ok()).toBeTruthy();
  const runtimeProfile = (await runtimeResponse.json()) as {
    operator: {
      arbitratorAddress: string | null;
      exportSupport: boolean;
    };
  };
  const clientWallet = new Wallet(deployedFlow!.client.privateKey);
  const contractorWallet = new Wallet(deployedFlow!.contractor.privateKey);
  const operatorWallet = new Wallet(deployedFlow!.operator.privateKey);

  expect(runtimeProfile.operator.arbitratorAddress?.toLowerCase()).toBe(
    operatorWallet.address.toLowerCase(),
  );
  expect(runtimeProfile.operator.exportSupport).toBeTruthy();

  const clientContext = await browser.newContext();
  const contractorContext = await browser.newContext();
  const operatorContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  await signInWithOtp({
    page: clientPage,
    url: `${deployed.webBaseUrl}/app/sign-in`,
    email: deployedFlow!.client.email,
    otpCode: deployedFlow!.client.otpCode,
  });
  await clientPage.goto(`${deployed.webBaseUrl}/app/setup`);
  await expect(clientPage.getByText(deployedFlow!.client.email)).toBeVisible();
  await expect(clientPage.getByText('Console state is current.')).toBeVisible();
  await linkWallet({
    page: clientPage,
    wallet: clientWallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });
  await provisionSmartAccount(clientPage, clientWallet.address);

  await signInWithOtp({
    page: contractorPage,
    url: `${deployed.webBaseUrl}/app/sign-in`,
    email: deployedFlow!.contractor.email,
    otpCode: deployedFlow!.contractor.otpCode,
  });
  await contractorPage.goto(`${deployed.webBaseUrl}/app/setup`);
  await expect(contractorPage.getByText(deployedFlow!.contractor.email)).toBeVisible();
  await expect(contractorPage.getByText('Console state is current.')).toBeVisible();
  await linkWallet({
    page: contractorPage,
    wallet: contractorWallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });

  await signInWithOtp({
    page: operatorPage,
    url: deployed.adminBaseUrl,
    email: deployedFlow!.operator.email,
    otpCode: deployedFlow!.operator.otpCode,
  });
  await expect(operatorPage.getByText(deployedFlow!.operator.email)).toBeVisible();
  await expect(operatorPage.getByText('Console state is current.')).toBeVisible();
  await linkWallet({
    page: operatorPage,
    wallet: operatorWallet,
    challengeMessage:
      'Challenge created. Sign the message with the arbitrator wallet, then paste the signature.',
    successMessage:
      'Wallet linked. Arbitrator authority is now available for dispute resolution.',
  });

  const opportunityTitle = `Exact Deployed Marketplace Engineer ${runId}`;
  const opportunitySummary = `Browser-origin marketplace escrow proof ${runId}`;
  const result = await runAuthenticatedMarketplaceExactFlow({
    clientPage,
    contractorPage,
    operatorPage,
    webBaseUrl: deployed.webBaseUrl,
    adminBaseUrl: deployed.adminBaseUrl,
    clientProfile: {
      slug: `deployed-exact-client-${runId}`.slice(0, 40),
      displayName: `Exact Client ${runId}`,
      headline: 'Exact staged client using escrow-backed marketplace hiring',
      bio: 'This browser-auth canary proves marketplace-origin escrow behavior against deployed infrastructure.',
      skills: 'product, react',
      portfolioUrl: `https://example.com/deployed-exact-client/${runId}`,
    },
    contractorProfile: {
      slug: `deployed-exact-talent-${runId}`.slice(0, 40),
      displayName: `Exact Talent ${runId}`,
      headline: 'Exact staged marketplace contractor',
      bio: 'I apply from the public brief and join the resulting escrow contract from the staged browser flow.',
      skills: 'typescript, react',
      portfolioUrl: `https://example.com/deployed-exact-talent/${runId}`,
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description:
        'Exact canary proving browser-auth publish, apply, hire, join, delivery, dispute, release, and export behavior.',
      category: 'software-development',
      currencyAddress: deployedFlow!.currencyAddress,
      requiredSkills: 'typescript, react',
      budgetMin: '2200',
      budgetMax: '4200',
      timeline: `3 weeks ${runId}`,
    },
    contractorDisplayName: `Exact Talent ${runId}`,
    operatorEmail: deployedFlow!.operator.email,
    deliveryNote: `Exact deployed marketplace delivery ${runId}`,
    deliveryEvidenceUrl: `https://example.com/deployed-exact-marketplace-delivery/${runId}`,
    disputeReason: `Exact deployed marketplace dispute ${runId}`,
    disputeEvidenceUrl: `https://example.com/deployed-exact-marketplace-dispute/${runId}`,
    resolutionAction: 'release',
    resolutionNote: `Exact deployed marketplace operator release ${runId}`,
    exportProbeFactory: buildEscrowExportProbes,
  });

  if (result.exportedJobHistoryJson && result.exportedDisputeCaseJson) {
    await writeMarketplaceJourneyEvidence({
      mode: 'exact',
      opportunityId: result.opportunityId,
      jobId: result.jobId,
      contractPath: result.contractPath,
      opportunityTitle,
      jobHistoryExport: result.exportedJobHistoryJson,
      disputeCaseExport: result.exportedDisputeCaseJson,
    });
  }

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
