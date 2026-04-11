import { Wallet } from 'ethers';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/deployed-journeys';
import { runAuthenticatedLaunchCandidateFlow } from '../../../flows/launch-candidate-flow';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

test('deployed environment can exercise the exact launch-candidate escrow flow when explicit credentials are provided', async ({
  browser,
  deployedJourneyActorFactory,
  request,
  runId,
}) => {
  test.skip(
    !deployedFlow,
    'Set PLAYWRIGHT_DEPLOYED_FLOW_* secrets to run the full staged launch-candidate flow.',
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

  const clientActor = await deployedJourneyActorFactory('client');
  const contractorActor = await deployedJourneyActorFactory('contractor');
  const operatorActor = await deployedJourneyActorFactory('operator');

  const clientContext = await browser.newContext({
    storageState: clientActor.storageState,
  });
  const contractorContext = await browser.newContext({
    storageState: contractorActor.storageState,
  });
  const operatorContext = await browser.newContext({
    storageState: operatorActor.storageState,
  });
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  await runAuthenticatedLaunchCandidateFlow({
    clientPage,
    contractorPage,
    operatorPage,
    webBaseUrl: deployed.webBaseUrl,
    adminBaseUrl: deployed.adminBaseUrl,
    flow: {
      client: {
        email: clientActor.email,
        otpCode: deployedFlow!.client.otpCode,
        wallet: clientActor.wallet,
      },
      contractor: {
        email: contractorActor.email,
        otpCode: deployedFlow!.contractor.otpCode,
        wallet: contractorActor.wallet,
      },
      operator: {
        email: operatorActor.email,
        otpCode: deployedFlow!.operator.otpCode,
        wallet: operatorActor.wallet,
      },
      currencyAddress: deployedFlow!.currencyAddress,
      jobTitle: `Staged Launch Flow ${runId}`,
      description:
        'Exact staging proof for the narrowed launch candidate covering create, fund, join, deliver, dispute, and operator resolution.',
      deliveryNote: `Staged contractor delivery for run ${runId}.`,
      deliveryEvidenceUrl: `https://example.com/staged-delivery/${runId}`,
      disputeReason: `Client requested operator review for staged launch run ${runId}.`,
      disputeEvidenceUrl: `https://example.com/staged-dispute/${runId}`,
      resolutionAction: 'release',
      resolutionNote: `Operator released the staged disputed milestone for run ${runId}.`,
    },
  });

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
