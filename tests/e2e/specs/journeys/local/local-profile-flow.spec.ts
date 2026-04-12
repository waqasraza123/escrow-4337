import { Wallet } from 'ethers';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  forceOtpCode,
  localArbitratorWallet,
  localOtpCode,
  resetOtpState,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/test';
import {
  makeTestCurrencyAddress,
  runLaunchCandidateFlow,
} from '../../../flows/launch-candidate-flow';
import { makeTestEmail } from '../../../data/builders';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('local profile supports the full launch-candidate create, join, deliver, dispute, and resolve flow', async ({
  browser,
  runId,
}) => {
  test.setTimeout(240_000);

  const clientEmail = makeTestEmail('client', runId);
  const contractorEmail = makeTestEmail('contractor', runId);
  const operatorEmail = makeTestEmail('operator', runId);
  const clientWallet = Wallet.createRandom();
  const contractorWallet = Wallet.createRandom();

  await Promise.all([
    resetOtpState(clientEmail),
    resetOtpState(contractorEmail),
    resetOtpState(operatorEmail),
  ]);

  const clientContext = await browser.newContext();
  const contractorContext = await browser.newContext();
  const operatorContext = await browser.newContext();
  await Promise.all([
    clientContext.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: webBaseUrl,
    }),
    contractorContext.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: webBaseUrl,
    }),
  ]);
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  await runLaunchCandidateFlow({
    clientPage,
    contractorPage,
    operatorPage,
    webBaseUrl,
    adminBaseUrl,
    flow: {
      client: {
        email: clientEmail,
        otpCode: localOtpCode,
        wallet: clientWallet,
      },
      contractor: {
        email: contractorEmail,
        otpCode: localOtpCode,
        wallet: contractorWallet,
      },
      operator: {
        email: operatorEmail,
        otpCode: localOtpCode,
        wallet: localArbitratorWallet,
      },
      currencyAddress: makeTestCurrencyAddress(),
      jobTitle: `Playwright Launch Flow ${runId}`,
      description:
        'Full local-profile proof for the narrowed agency and client milestone escrow launch candidate.',
      deliveryNote: 'Contractor delivered the agreed implementation milestone.',
      deliveryEvidenceUrl: `https://example.com/delivery/${runId}`,
      disputeReason: 'Client found one blocked acceptance criterion that requires operator review.',
      disputeEvidenceUrl: `https://example.com/dispute/${runId}`,
      resolutionAction: 'release',
      resolutionNote: 'Operator confirmed delivery quality and released the disputed milestone.',
    },
    onClientOtpIssued: () => forceOtpCode(clientEmail, localOtpCode),
    onContractorOtpIssued: () => forceOtpCode(contractorEmail, localOtpCode),
    onOperatorOtpIssued: () => forceOtpCode(operatorEmail, localOtpCode),
  });

  await expect(
    clientPage.getByText(
      'Operator confirmed delivery quality and released the disputed milestone.',
      { exact: false },
    ),
  ).toBeVisible();

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
