import { Wallet } from 'ethers';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  localArbitratorWallet,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';
import {
  runAuthenticatedLaunchCandidateFlow,
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

  const resolutionNote = `Seeded operator release ${runId}`;
  await runAuthenticatedLaunchCandidateFlow({
    clientPage,
    contractorPage,
    operatorPage,
    webBaseUrl,
    adminBaseUrl,
    flow: {
      client: {
        email: clientActor.email,
        otpCode: '',
        wallet: clientWallet,
      },
      contractor: {
        email: contractorActor.email,
        otpCode: '',
        wallet: contractorWallet,
      },
      operator: {
        email: operatorActor.email,
        otpCode: '',
        wallet: localArbitratorWallet,
      },
      currencyAddress: makeTestCurrencyAddress(),
      jobTitle: `Seeded Launch Flow ${runId}`,
      description:
        'Seeded browser journey proving the core escrow business flow can start from authenticated actors.',
      deliveryNote: `Seeded delivery note ${runId}`,
      deliveryEvidenceUrl: `https://example.com/seeded-delivery/${runId}`,
      disputeReason: `Seeded flow dispute ${runId}`,
      disputeEvidenceUrl: `https://example.com/seeded-dispute/${runId}`,
      resolutionAction: 'release',
      resolutionNote,
    },
    actorSetup: {
      client: {
        linkWallet: false,
        provisionSmartAccount: false,
      },
      contractor: {
        linkWallet: false,
      },
      operator: {
        linkWallet: false,
      },
    },
  });

  await expect(
    clientPage.getByText(`release: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
