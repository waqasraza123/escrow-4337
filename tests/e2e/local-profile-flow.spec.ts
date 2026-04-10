import { expect, test } from '@playwright/test';
import { Wallet } from 'ethers';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  forceOtpCode,
  localArbitratorWallet,
  localOtpCode,
  resetOtpState,
  webBaseUrl,
} from './local-profile';
import {
  makeRunId,
  makeTestCurrencyAddress,
  runLaunchCandidateFlow,
} from './launch-candidate-flow';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('local profile supports the full launch-candidate create, join, deliver, dispute, and resolve flow', async ({
  browser,
}) => {
  test.setTimeout(240_000);

  const runId = makeRunId();
  const clientEmail = `playwright.client.${runId}@example.com`;
  const contractorEmail = `playwright.contractor.${runId}@example.com`;
  const operatorEmail = `playwright.operator.${runId}@example.com`;
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
