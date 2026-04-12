import { Wallet } from 'ethers';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/test';
import {
  clickWalkthroughAction,
  expectWalkthroughStep,
  stopWalkthrough,
} from '../../../flows/walkthrough';
import {
  commitSelectedJobMilestones,
  copyContractorJoinLink,
  createGuidedJob,
  deliverSelectedMilestone,
  fundSelectedJob,
  linkWallet,
  openMilestoneDispute,
  provisionSmartAccount,
  resolveDisputedMilestone,
  signInWithOtp,
} from '../../../flows/launch-candidate-flow';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

test('[@exact][@walkthrough] deployed environment can exercise the launch walkthrough through the real staged launch flow', async ({
  browser,
  runId,
}) => {
  test.skip(
    !deployedFlow,
    'Set PLAYWRIGHT_DEPLOYED_FLOW_* secrets to run the staged walkthrough acceptance flow.',
  );
  test.setTimeout(300_000);

  const clientContext = await browser.newContext();
  const contractorContext = await browser.newContext();
  const operatorContext = await browser.newContext();
  await Promise.all([
    clientContext.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: deployed.webBaseUrl,
    }),
    contractorContext.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: deployed.webBaseUrl,
    }),
  ]);
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  const clientWallet = new Wallet(deployedFlow!.client.privateKey);
  const contractorWallet = new Wallet(deployedFlow!.contractor.privateKey);
  const operatorWallet = new Wallet(deployedFlow!.operator.privateKey);
  const jobTitle = `Staged Walkthrough Flow ${runId}`;
  const disputeReason = `Staged walkthrough dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/staged-walkthrough-dispute/${runId}`;
  const resolutionNote = `Staged walkthrough operator release ${runId}`;

  await clientPage.goto(`${deployed.webBaseUrl}/app/sign-in`);
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Start with your client session',
    progress: 'Client walkthrough • 1/14',
  });
  await stopWalkthrough({
    page: clientPage,
    title: 'Start with your client session',
  });
  await clientPage.getByRole('link', { name: 'Read the manual' }).click();
  await expect(
    clientPage.getByRole('heading', { name: 'Launch flow manual' }),
  ).toBeVisible();
  await clientPage.getByRole('button', { name: 'Start client walkthrough' }).click();
  await clientPage.waitForURL('**/app/sign-in');
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Start with your client session',
    progress: 'Client walkthrough • 1/14',
  });

  await signInWithOtp({
    page: clientPage,
    url: `${deployed.webBaseUrl}/app/sign-in`,
    email: deployedFlow!.client.email,
    otpCode: deployedFlow!.client.otpCode,
  });

  await clientPage.goto(`${deployed.webBaseUrl}/app/setup`);
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Follow the next blocker',
    progress: 'Client walkthrough • 3/14',
  });
  await clickWalkthroughAction({
    page: clientPage,
    title: 'Follow the next blocker',
    actionLabel: 'Next',
  });
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Link the wallet you control',
    progress: 'Client walkthrough • 4/14',
  });
  await linkWallet({
    page: clientPage,
    wallet: clientWallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Provision the execution wallet',
    progress: 'Client walkthrough • 5/14',
  });
  await provisionSmartAccount(clientPage, clientWallet.address);

  await clientPage.goto(`${deployed.webBaseUrl}/app/new-contract`);
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Define the job scope',
    progress: 'Client walkthrough • 6/14',
  });
  const jobId = await createGuidedJob({
    page: clientPage,
    webBaseUrl: deployed.webBaseUrl,
    jobTitle,
    description:
      'Staged walkthrough-driven exact browser proof for the supported launch-candidate escrow flow.',
    contractorEmail: deployedFlow!.contractor.email,
    workerAddress: contractorWallet.address,
    currencyAddress: deployedFlow!.currencyAddress,
  });
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Move into the live contract',
    progress: 'Client walkthrough • 9/14',
  });
  await clickWalkthroughAction({
    page: clientPage,
    title: 'Move into the live contract',
    actionLabel: 'Open selected job',
  });
  await clientPage.waitForURL(`**/app/contracts/${jobId}`);

  await expectWalkthroughStep({
    page: clientPage,
    title: 'Commit the milestones',
    progress: 'Client walkthrough • 10/14',
  });
  await commitSelectedJobMilestones(clientPage);
  await clickWalkthroughAction({
    page: clientPage,
    title: 'Commit the milestones',
    actionLabel: 'Next',
  });
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Fund the selected job',
    progress: 'Client walkthrough • 11/14',
  });
  await fundSelectedJob(clientPage);
  await clickWalkthroughAction({
    page: clientPage,
    title: 'Fund the selected job',
    actionLabel: 'Next',
  });
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Hand off the join link',
    progress: 'Client walkthrough • 12/14',
  });
  const contractorJoinUrl = await copyContractorJoinLink(clientPage);

  await contractorPage.goto(contractorJoinUrl);
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Start from the invite-linked contract',
    progress: 'Contractor walkthrough • 1/6',
  });
  await clickWalkthroughAction({
    page: contractorPage,
    title: 'Start from the invite-linked contract',
    actionLabel: 'Open sign-in',
  });
  await contractorPage.waitForURL('**/app/sign-in');
  await signInWithOtp({
    page: contractorPage,
    url: `${deployed.webBaseUrl}/app/sign-in`,
    email: deployedFlow!.contractor.email,
    otpCode: deployedFlow!.contractor.otpCode,
  });
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Return to the invite-linked contract',
    progress: 'Contractor walkthrough • 2/6',
  });
  await clickWalkthroughAction({
    page: contractorPage,
    title: 'Return to the invite-linked contract',
    actionLabel: 'Return to contract',
  });
  await contractorPage.waitForURL(`**/app/contracts/${jobId}?invite=*`);
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Wait for join readiness',
    progress: 'Contractor walkthrough • 3/6',
  });
  await linkWallet({
    page: contractorPage,
    wallet: contractorWallet,
    challengeMessage:
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    successMessage: 'Wallet linked and ready for smart-account provisioning.',
  });
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Join the contract',
    progress: 'Contractor walkthrough • 4/6',
  });
  await contractorPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    contractorPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Move into delivery',
    progress: 'Contractor walkthrough • 5/6',
  });
  await clickWalkthroughAction({
    page: contractorPage,
    title: 'Move into delivery',
    actionLabel: 'Open delivery route',
  });
  await contractorPage.waitForURL(`**/app/contracts/${jobId}/deliver`);
  await expectWalkthroughStep({
    page: contractorPage,
    title: 'Submit delivery clearly',
    progress: 'Contractor walkthrough • 6/6',
  });
  await deliverSelectedMilestone({
    page: contractorPage,
    note: `Staged walkthrough delivery ${runId}`,
    evidenceUrl: `https://example.com/staged-walkthrough-delivery/${runId}`,
  });

  await clientPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}/dispute`);
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Escalate only when review fails',
    progress: 'Client walkthrough • 13/14',
  });
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${deployed.adminBaseUrl}/help/operator-case-flow`);
  await expect(
    operatorPage.getByRole('heading', { name: 'Operator case-flow manual' }),
  ).toBeVisible();
  await operatorPage.getByRole('button', { name: 'Start operator walkthrough' }).click();
  await operatorPage.goto(`${deployed.adminBaseUrl}/cases/${jobId}`);
  await expectWalkthroughStep({
    page: operatorPage,
    title: 'Start on the operator case page',
    progress: 'Operator walkthrough • 1/4',
  });
  await signInWithOtp({
    page: operatorPage,
    url: `${deployed.adminBaseUrl}/cases/${jobId}`,
    email: deployedFlow!.operator.email,
    otpCode: deployedFlow!.operator.otpCode,
  });
  await expectWalkthroughStep({
    page: operatorPage,
    title: 'Link the configured arbitrator wallet',
    progress: 'Operator walkthrough • 2/4',
  });
  await linkWallet({
    page: operatorPage,
    wallet: operatorWallet,
    challengeMessage:
      'Challenge created. Sign the message with the arbitrator wallet, then paste the signature.',
    successMessage:
      'Wallet linked. Arbitrator authority is now available for dispute resolution.',
  });
  await expectWalkthroughStep({
    page: operatorPage,
    title: 'Review and resolve the disputed milestone',
    progress: 'Operator walkthrough • 3/4',
  });
  await resolveDisputedMilestone({
    page: operatorPage,
    action: 'release',
    note: resolutionNote,
  });
  await expectWalkthroughStep({
    page: operatorPage,
    title: 'Resolution confirmed',
    progress: 'Operator walkthrough • 4/4',
  });
  await clickWalkthroughAction({
    page: operatorPage,
    title: 'Resolution confirmed',
    actionLabel: 'Finish walkthrough',
  });

  await clientPage.goto(`${deployed.webBaseUrl}/app/contracts/${jobId}`);
  await expectWalkthroughStep({
    page: clientPage,
    title: 'Resolution confirmed',
    progress: 'Client walkthrough • 14/14',
  });
  await clickWalkthroughAction({
    page: clientPage,
    title: 'Resolution confirmed',
    actionLabel: 'Finish walkthrough',
  });
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
