import { Wallet } from 'ethers';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/test';
import { runLaunchCandidateFlow } from '../../../flows/launch-candidate-flow';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

test('[@exact] deployed environment can exercise the exact launch-candidate escrow flow through browser auth and setup UI', async ({
  browser,
  request,
  runId,
}) => {
  test.skip(
    !deployedFlow,
    'Set PLAYWRIGHT_DEPLOYED_FLOW_* secrets to run the staged exact launch-candidate flow.',
  );
  test.setTimeout(300_000);

  const runtimeResponse = await request.get(`${deployed.apiBaseUrl}/operations/runtime-profile`);
  expect(runtimeResponse.ok()).toBeTruthy();
  const runtimeProfile = (await runtimeResponse.json()) as {
    operator: {
      arbitratorAddress: string | null;
    };
  };
  const operatorWallet = new Wallet(deployedFlow!.operator.privateKey);

  expect(runtimeProfile.operator.arbitratorAddress?.toLowerCase()).toBe(
    operatorWallet.address.toLowerCase(),
  );

  const clientContext = await browser.newContext();
  const contractorContext = await browser.newContext();
  const operatorContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  await runLaunchCandidateFlow({
    clientPage,
    contractorPage,
    operatorPage,
    webBaseUrl: deployed.webBaseUrl,
    adminBaseUrl: deployed.adminBaseUrl,
    flow: {
      client: {
        email: deployedFlow!.client.email,
        otpCode: deployedFlow!.client.otpCode,
        wallet: new Wallet(deployedFlow!.client.privateKey),
      },
      contractor: {
        email: deployedFlow!.contractor.email,
        otpCode: deployedFlow!.contractor.otpCode,
        wallet: new Wallet(deployedFlow!.contractor.privateKey),
      },
      operator: {
        email: deployedFlow!.operator.email,
        otpCode: deployedFlow!.operator.otpCode,
        wallet: operatorWallet,
      },
      currencyAddress: deployedFlow!.currencyAddress,
      jobTitle: `Staged Exact Flow ${runId}`,
      description:
        'Exact staging proof for the narrowed launch candidate covering browser auth, setup, create, fund, join, deliver, dispute, and operator resolution.',
      deliveryNote: `Exact staged contractor delivery for run ${runId}.`,
      deliveryEvidenceUrl: `https://example.com/staged-exact-delivery/${runId}`,
      disputeReason: `Exact staged client review request for run ${runId}.`,
      disputeEvidenceUrl: `https://example.com/staged-exact-dispute/${runId}`,
      resolutionAction: 'release',
      resolutionNote: `Operator released the exact staged disputed milestone for run ${runId}.`,
    },
  });

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
