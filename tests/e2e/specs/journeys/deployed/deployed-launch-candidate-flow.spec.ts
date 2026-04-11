import { Wallet } from 'ethers';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/deployed-journeys';
import {
  deliverSelectedMilestone,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from '../../../flows/launch-candidate-flow';
import { seedJoinReadyJobViaApi } from '../../../fixtures/journey-setup';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

test('deployed environment can exercise the staged join-to-resolution flow from API-seeded job state', async ({
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

  const jobTitle = `Staged Launch Flow ${runId}`;
  const deliveryEvidenceUrl = `https://example.com/staged-delivery/${runId}`;
  const disputeReason = `Client requested operator review for staged launch run ${runId}.`;
  const disputeEvidenceUrl = `https://example.com/staged-dispute/${runId}`;
  const resolutionNote = `Operator released the staged disputed milestone for run ${runId}.`;
  const { jobId } = await seedJoinReadyJobViaApi({
    apiBaseUrl: deployed.apiBaseUrl,
    client: {
      session: clientActor.session,
      wallet: clientActor.wallet,
    },
    contractor: {
      email: contractorActor.email,
      wallet: contractorActor.wallet,
      session: contractorActor.session,
    },
    job: {
      title: jobTitle,
      description:
        'Staged canary proving join, delivery, dispute, and operator resolution from API-seeded job setup.',
      currencyAddress: deployedFlow!.currencyAddress,
    },
  });

  await contractorPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}`);
  await expect(contractorPage.getByRole('heading', { name: jobTitle })).toBeVisible();
  await expect(contractorPage.getByText(contractorActor.email)).toBeVisible();
  await contractorPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    contractorPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();

  await contractorPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}/deliver`);
  await deliverSelectedMilestone({
    page: contractorPage,
    note: `Staged contractor delivery for run ${runId}.`,
    evidenceUrl: deliveryEvidenceUrl,
  });

  await clientPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}/dispute`);
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${deployed.adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.')).toBeVisible();
  await expect(operatorPage.getByText(operatorActor.email)).toBeVisible();
  await resolveDisputedMilestone({
    page: operatorPage,
    action: 'release',
    note: resolutionNote,
  });

  await clientPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}`);
  await expect(clientPage.getByText('Resolution')).toBeVisible();
  await expect(
    clientPage.getByText(`release: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();
  await expect(clientPage.getByText(disputeReason, { exact: true })).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: disputeEvidenceUrl }),
  ).toBeVisible();

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
