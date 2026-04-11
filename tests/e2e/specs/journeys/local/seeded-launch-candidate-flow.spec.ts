import { Wallet } from 'ethers';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  localArbitratorWallet,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';
import {
  commitSelectedJobMilestones,
  createGuidedJob,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from '../../../flows/launch-candidate-flow';
import { makeTestCurrencyAddress } from '../../../data/builders';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('seeded local actors can complete the launch-candidate flow without repeating auth UI bootstrap', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const contractorWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `seeded-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const contractorActor = await localSessionFactory({
    role: `seeded-contractor.${runId}`,
    linkedWallet: contractorWallet,
  });
  const operatorActor = await localSessionFactory({
    role: `seeded-operator.${runId}`,
    app: 'admin',
    linkedWallet: localArbitratorWallet,
  });

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

  const jobTitle = `Seeded Launch Flow ${runId}`;
  const disputeReason = `Seeded flow dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/seeded-dispute/${runId}`;
  const resolutionNote = `Seeded operator release ${runId}`;

  await clientPage.goto(`${webBaseUrl}/app/new-contract`);
  await expect(clientPage.getByText(clientActor.email)).toBeVisible();

  const jobId = await createGuidedJob({
    page: clientPage,
    webBaseUrl,
    jobTitle,
    description:
      'Seeded browser journey proving the core escrow business flow can start from authenticated actors.',
    contractorEmail: contractorActor.email,
    workerAddress: contractorWallet.address,
    currencyAddress: makeTestCurrencyAddress(),
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
  await expect(clientPage.getByRole('heading', { name: jobTitle })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await contractorPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
  await expect(contractorPage.getByRole('heading', { name: jobTitle })).toBeVisible();
  await expect(contractorPage.getByText(contractorActor.email)).toBeVisible();
  await contractorPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    contractorPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();

  await contractorPage.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);
  await deliverSelectedMilestone({
    page: contractorPage,
    note: `Seeded delivery note ${runId}`,
    evidenceUrl: `https://example.com/seeded-delivery/${runId}`,
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}/dispute`);
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.')).toBeVisible();
  await expect(operatorPage.getByText(operatorActor.email)).toBeVisible();
  await resolveDisputedMilestone({
    page: operatorPage,
    action: 'release',
    note: resolutionNote,
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
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
