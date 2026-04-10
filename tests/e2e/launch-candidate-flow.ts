import { expect, type Page } from '@playwright/test';
import { Wallet } from 'ethers';

export type FlowActor = {
  email: string;
  otpCode: string;
  wallet: Wallet;
};

export type LaunchCandidateFlowInput = {
  client: FlowActor;
  contractor: FlowActor;
  operator: FlowActor;
  currencyAddress: string;
  jobTitle: string;
  description: string;
  deliveryNote: string;
  deliveryEvidenceUrl: string;
  disputeReason: string;
  disputeEvidenceUrl: string;
  resolutionAction: 'release' | 'refund';
  resolutionNote: string;
};

export function makeRunId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeTestCurrencyAddress(fill = '5') {
  return `0x${fill.repeat(40)}`;
}

export async function signInWithOtp(input: {
  page: Page;
  url: string;
  email: string;
  otpCode: string;
  afterOtpIssued?: () => Promise<void>;
}) {
  const { afterOtpIssued, email, otpCode, page, url } = input;

  await page.goto(url);
  await page.getByPlaceholder(/@/).fill(email);
  await page.getByRole('button', { name: 'Send OTP' }).click();

  await expect(
    page.getByText('OTP issued. Check your configured mail inbox or relay logs.'),
  ).toBeVisible();

  await afterOtpIssued?.();

  await page.getByPlaceholder('123456').fill(otpCode);
  await page.getByRole('button', { name: 'Verify session' }).click();
  await expect(page.getByText(email)).toBeVisible();
}

export async function linkWallet(input: {
  page: Page;
  wallet: Wallet;
  successMessage: string;
  challengeMessage: string;
}) {
  const { challengeMessage, page, successMessage, wallet } = input;

  await page.getByRole('textbox', { name: 'EOA address' }).fill(wallet.address);
  await page.getByRole('button', { name: 'Create SIWE challenge' }).click();

  await expect(page.getByText(challengeMessage)).toBeVisible();

  const message = await page.getByRole('textbox', { name: 'Issued message' }).inputValue();
  const signature = await wallet.signMessage(message);

  await page.getByRole('textbox', { name: 'Wallet signature' }).fill(signature);
  await page.getByRole('button', { name: 'Verify linked wallet' }).click();

  await expect(page.getByText(successMessage)).toBeVisible();
}

export async function provisionSmartAccount(page: Page, ownerAddress: string) {
  await page.getByRole('textbox', { name: 'Verified owner EOA' }).fill(ownerAddress);
  await page.getByRole('button', { name: 'Provision smart account' }).click();

  await expect(
    page.getByText(/Smart account ready\. Sponsorship policy:/),
  ).toBeVisible();
}

export async function createGuidedJob(input: {
  page: Page;
  webBaseUrl: string;
  jobTitle: string;
  description: string;
  workerAddress: string;
  currencyAddress: string;
}) {
  const { currencyAddress, description, jobTitle, page, webBaseUrl, workerAddress } =
    input;

  const createResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST' && url.pathname === '/jobs';
  });

  await page.goto(`${webBaseUrl}/app/new-contract`);
  await page.getByPlaceholder('Milestone-based product implementation').fill(jobTitle);
  await page
    .getByPlaceholder(
      'Describe the scope, delivery expectations, and what the worker will be paid to complete.',
    )
    .fill(description);
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('textbox', { name: 'Worker wallet' }).fill(workerAddress);
  await page.getByRole('textbox', { name: 'Settlement token address' }).fill(currencyAddress);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Create guided job' }).click();

  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBeTruthy();
  const payload = (await createResponse.json()) as { jobId: string };

  await expect(page.getByText(/^Job created\. Escrow id /).first()).toBeVisible();

  return payload.jobId;
}

export async function commitSelectedJobMilestones(page: Page) {
  await page.getByRole('button', { name: 'Commit milestones' }).click();
  await expect(page.getByText('1. Discovery')).toBeVisible();
  await expect(page.getByText('2. Delivery')).toBeVisible();
}

export async function fundSelectedJob(page: Page) {
  await page.getByRole('button', { name: 'Fund selected job' }).click();
  await expect(page.getByText('Funding confirmed')).toBeVisible();
}

export async function deliverSelectedMilestone(input: {
  page: Page;
  note: string;
  evidenceUrl: string;
}) {
  const { evidenceUrl, note, page } = input;

  await page.getByRole('textbox', { name: 'Delivery note' }).fill(note);
  await page.getByRole('textbox', { name: 'Evidence URLs' }).fill(evidenceUrl);
  await page.getByRole('button', { name: 'Deliver selected milestone' }).click();

  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: evidenceUrl })).toBeVisible();
}

export async function openMilestoneDispute(input: {
  page: Page;
  reason: string;
  evidenceUrl: string;
}) {
  const { evidenceUrl, page, reason } = input;

  await page.getByRole('textbox', { name: 'Dispute reason' }).fill(reason);
  await page.getByRole('textbox', { name: 'Dispute evidence URLs' }).fill(evidenceUrl);
  await page.getByRole('button', { name: 'Open dispute' }).click();

  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: evidenceUrl })).toBeVisible();
}

export async function resolveDisputedMilestone(input: {
  page: Page;
  action: 'release' | 'refund';
  note: string;
}) {
  const { action, note, page } = input;

  await page.getByRole('combobox', { name: 'Resolution action' }).selectOption(action);
  await page.getByRole('textbox', { name: 'Resolution note' }).fill(note);
  await page.getByRole('button', { name: 'Resolve disputed milestone' }).click();

  await expect(page.getByText('No active disputes')).toBeVisible();
}

export async function runLaunchCandidateFlow(input: {
  clientPage: Page;
  contractorPage: Page;
  operatorPage: Page;
  webBaseUrl: string;
  adminBaseUrl: string;
  flow: LaunchCandidateFlowInput;
  onClientOtpIssued?: () => Promise<void>;
  onContractorOtpIssued?: () => Promise<void>;
  onOperatorOtpIssued?: () => Promise<void>;
}) {
  const {
    adminBaseUrl,
    clientPage,
    contractorPage,
    flow,
    onClientOtpIssued,
    onContractorOtpIssued,
    onOperatorOtpIssued,
    operatorPage,
    webBaseUrl,
  } = input;

  await signInWithOtp({
    page: clientPage,
    url: `${webBaseUrl}/app/sign-in`,
    email: flow.client.email,
    otpCode: flow.client.otpCode,
    afterOtpIssued: onClientOtpIssued,
  });
  await clientPage.goto(`${webBaseUrl}/app/setup`);
  await linkWallet({
    page: clientPage,
    wallet: flow.client.wallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });
  await provisionSmartAccount(clientPage, flow.client.wallet.address);

  const jobId = await createGuidedJob({
    page: clientPage,
    webBaseUrl,
    jobTitle: flow.jobTitle,
    description: flow.description,
    workerAddress: flow.contractor.wallet.address,
    currencyAddress: flow.currencyAddress,
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
  await expect(clientPage.getByRole('heading', { name: flow.jobTitle })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await signInWithOtp({
    page: contractorPage,
    url: `${webBaseUrl}/app/sign-in`,
    email: flow.contractor.email,
    otpCode: flow.contractor.otpCode,
    afterOtpIssued: onContractorOtpIssued,
  });
  await contractorPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
  await expect(contractorPage.getByRole('heading', { name: flow.jobTitle })).toBeVisible();
  await linkWallet({
    page: contractorPage,
    wallet: flow.contractor.wallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });
  await expect(contractorPage.getByText('Wallet verified')).toBeVisible();

  await contractorPage.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);
  await expect(contractorPage.getByRole('heading', { name: flow.jobTitle })).toBeVisible();
  await deliverSelectedMilestone({
    page: contractorPage,
    note: flow.deliveryNote,
    evidenceUrl: flow.deliveryEvidenceUrl,
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}/dispute`);
  await expect(clientPage.getByRole('heading', { name: flow.jobTitle })).toBeVisible();
  await openMilestoneDispute({
    page: clientPage,
    reason: flow.disputeReason,
    evidenceUrl: flow.disputeEvidenceUrl,
  });

  await operatorPage.goto(`${adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.')).toBeVisible();
  await signInWithOtp({
    page: operatorPage,
    url: `${adminBaseUrl}/cases/${jobId}`,
    email: flow.operator.email,
    otpCode: flow.operator.otpCode,
    afterOtpIssued: onOperatorOtpIssued,
  });
  await linkWallet({
    page: operatorPage,
    wallet: flow.operator.wallet,
    challengeMessage:
      'Challenge created. Sign the message with the arbitrator wallet, then paste the signature.',
    successMessage: 'Wallet linked. Arbitrator authority is now available for dispute resolution.',
  });
  await resolveDisputedMilestone({
    page: operatorPage,
    action: flow.resolutionAction,
    note: flow.resolutionNote,
  });

  await clientPage.goto(`${webBaseUrl}/app/contracts/${jobId}`);
  await expect(clientPage.getByText('Resolution')).toBeVisible();
  await expect(
    clientPage.getByText(
      `${flow.resolutionAction}: ${flow.resolutionNote}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    clientPage.getByText(flow.disputeReason, { exact: true }),
  ).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: flow.disputeEvidenceUrl }),
  ).toBeVisible();

  return { jobId };
}
