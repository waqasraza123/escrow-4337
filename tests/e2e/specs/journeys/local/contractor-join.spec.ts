import { Wallet } from 'ethers';
import {
  closeLocalProfileDb,
  createJobForSession,
  fundJobForSession,
  provisionSmartAccountForSession,
  setMilestonesForSession,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import {
  expect,
  test,
  type LocalSessionActor,
} from '../../../fixtures/local-journeys';
import { makeTestCurrencyAddress } from '../../../data/builders';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

async function createFundedJoinReadyJob(input: {
  clientActor: LocalSessionActor;
  clientWallet: Wallet;
  contractorEmail: string;
  workerAddress: string;
  title: string;
}) {
  await provisionSmartAccountForSession(input.clientActor.session, input.clientWallet.address);

  const jobId = await createJobForSession(input.clientActor.session, {
    contractorEmail: input.contractorEmail,
    workerAddress: input.workerAddress,
    currencyAddress: makeTestCurrencyAddress(),
    title: input.title,
    description:
      'Deterministic local-browser setup for contractor join gating and delivery unlock coverage.',
  });

  await fundJobForSession(input.clientActor.session, jobId, '100');
  await setMilestonesForSession(input.clientActor.session, jobId, [
    {
      title: 'Discovery',
      deliverable: 'Accepted scope and milestone plan',
      amount: '50',
    },
    {
      title: 'Delivery',
      deliverable: 'Final shipped implementation',
      amount: '50',
    },
  ]);

  return { jobId };
}

test('deliver route stays blocked until the contractor joins', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const clientWallet = Wallet.createRandom();
  const workerWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `deliver-client.${runId}`,
    linkedWallet: clientWallet,
  });
  const contractorActor = await localSessionFactory({
    role: `deliver-contractor.${runId}`,
  });
  const { jobId } = await createFundedJoinReadyJob({
    clientActor,
    clientWallet,
    contractorEmail: contractorActor.email,
    workerAddress: workerWallet.address,
    title: `Blocked delivery ${runId}`,
  });

  const contractorContext = await browser.newContext({
    storageState: contractorActor.storageState,
  });
  const page = await contractorContext.newPage();
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);

  await expect(
    page.getByRole('heading', { name: `Blocked delivery ${runId}` }),
  ).toBeVisible();
  await expect(
    page.getByText(`Link ${workerWallet.address.toLowerCase()} before delivering this milestone.`),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Deliver selected milestone' }),
  ).toHaveCount(0);

  await contractorContext.close();
});

test('contractor join rejects a session whose email does not match the pending contractor email', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const clientWallet = Wallet.createRandom();
  const wrongUserWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `mismatch-client.${runId}`,
    linkedWallet: clientWallet,
  });
  const wrongUserActor = await localSessionFactory({
    role: `wrong-contractor.${runId}`,
    linkedWallet: wrongUserWallet,
  });

  const { jobId } = await createFundedJoinReadyJob({
    clientActor,
    clientWallet,
    contractorEmail: `expected.contractor.${runId}@example.com`,
    workerAddress: wrongUserWallet.address,
    title: `Join mismatch ${runId}`,
  });

  const wrongUserContext = await browser.newContext({
    storageState: wrongUserActor.storageState,
  });
  const page = await wrongUserContext.newPage();
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}`);

  await expect(
    page.getByRole('heading', { name: `Join mismatch ${runId}` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    page.getByText('Authenticated email must match the pending contractor email'),
  ).toBeVisible();
  await expect(
    page.getByText('Contractor join access'),
  ).toBeVisible();

  await wrongUserContext.close();
});

test('eligible contractor can join from the contract route and then reach delivery', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const clientWallet = Wallet.createRandom();
  const contractorWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `join-client.${runId}`,
    linkedWallet: clientWallet,
  });
  const contractorActor = await localSessionFactory({
    role: `join-contractor.${runId}`,
    linkedWallet: contractorWallet,
  });

  const { jobId } = await createFundedJoinReadyJob({
    clientActor,
    clientWallet,
    contractorEmail: contractorActor.email,
    workerAddress: contractorWallet.address,
    title: `Join success ${runId}`,
  });

  const contractorContext = await browser.newContext({
    storageState: contractorActor.storageState,
  });
  const page = await contractorContext.newPage();
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}`);

  await expect(
    page.getByRole('heading', { name: `Join success ${runId}` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    page.getByText('Contract joined. Worker delivery is now enabled for this session.'),
  ).toBeVisible();
  await expect(
    page.getByText('This contract has already been joined by the bound contractor identity.'),
  ).toBeVisible();

  await page.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);
  await expect(
    page.getByRole('button', { name: 'Deliver selected milestone' }),
  ).toBeVisible();

  await contractorContext.close();
});
