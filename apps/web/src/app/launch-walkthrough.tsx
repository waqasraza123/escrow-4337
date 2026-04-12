'use client';

import {
  activateStoredWalkthroughState,
  completeStoredWalkthroughState,
  readStoredWalkthroughState,
  stopStoredWalkthroughState,
  WalkthroughLauncherMenu,
  WalkthroughOverlay,
  type StoredWalkthroughState,
  writeStoredWalkthroughState,
} from '@escrow4334/frontend-core';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export const clientWalkthroughStorageKey = 'escrow4337.walkthrough.v1.client';
export const contractorWalkthroughStorageKey =
  'escrow4337.walkthrough.v1.contractor';

export type EscrowWalkthroughView =
  | 'overview'
  | 'sign-in'
  | 'setup'
  | 'new-contract'
  | 'contract'
  | 'deliver'
  | 'dispute';

type EscrowWalkthroughProps = {
  view: EscrowWalkthroughView;
  accessToken: string | null;
  otpIssued: boolean;
  hasLinkedEoa: boolean;
  hasProvisionedDefaultWallet: boolean;
  composerStep: 'scope' | 'counterparty' | 'plan';
  createdJobId: string | null;
  selectedJobId: string | null;
  isClientForSelectedJob: boolean;
  isWorkerForSelectedJob: boolean;
  contractorInviteWasSent: boolean;
  canManageContractorInvite: boolean;
  inviteTokenPresent: boolean;
  canJoinSelectedContract: boolean;
  contractorJoined: boolean;
  deliverySubmitted: boolean;
  disputeOpened: boolean;
  resolutionPresent: boolean;
};

type WalkthroughStep = {
  id: string;
  index: number;
  total: number;
  title: string;
  body: string;
  targetId: string;
  actionLabel?: string;
  onAction?: () => void;
  stopHint: string;
};

function readCurrentRoute() {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function startClientWalkthrough(route?: string) {
  return activateStoredWalkthroughState(clientWalkthroughStorageKey, {
    lastStep: 'client-sign-in',
    lastRoute: route ?? null,
  });
}

export function startContractorWalkthrough(route?: string) {
  return activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
    lastStep: 'contractor-entry',
    lastRoute: route ?? null,
  });
}

function nextStepId(current: string, orderedStepIds: string[]) {
  const index = orderedStepIds.indexOf(current);
  if (index < 0 || index === orderedStepIds.length - 1) {
    return null;
  }

  return orderedStepIds[index + 1] ?? null;
}

function buildClientStep(
  stepId: string,
  context: EscrowWalkthroughProps,
  router: ReturnType<typeof useRouter>,
): WalkthroughStep | null {
  switch (stepId) {
    case 'client-sign-in':
      if (context.view !== 'sign-in' || context.accessToken) {
        return null;
      }
      return {
        id: stepId,
        index: 1,
        total: 14,
        title: 'Start with your client session',
        body: 'Start with the email that will own this escrow job.',
        targetId: 'access-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-verify-session':
      if (context.view !== 'sign-in' || context.accessToken || !context.otpIssued) {
        return null;
      }
      return {
        id: stepId,
        index: 2,
        total: 14,
        title: 'Verify the session',
        body: 'Paste the OTP code. You’re ready when your email appears in Profile.',
        targetId: 'access-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-setup-readiness':
      if (context.view !== 'setup') {
        return null;
      }
      return {
        id: stepId,
        index: 3,
        total: 14,
        title: 'Follow the next blocker',
        body: 'This panel tells you the next blocker. Follow it one step at a time.',
        targetId: 'setup-readiness-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-link-wallet':
      if (context.view !== 'setup' || context.hasLinkedEoa) {
        return null;
      }
      return {
        id: stepId,
        index: 4,
        total: 14,
        title: 'Link the wallet you control',
        body: 'Link the wallet you control in the browser. This proves signing authority.',
        targetId: 'browser-wallet-link-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-provision-smart-account':
      if (context.view !== 'setup' || !context.hasLinkedEoa || context.hasProvisionedDefaultWallet) {
        return null;
      }
      return {
        id: stepId,
        index: 5,
        total: 14,
        title: 'Provision the execution wallet',
        body: 'Provision the smart account that will execute client actions.',
        targetId: 'smart-account-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-scope':
      if (context.view !== 'new-contract' || context.createdJobId || context.composerStep !== 'scope') {
        return null;
      }
      return {
        id: stepId,
        index: 6,
        total: 14,
        title: 'Define the job scope',
        body: 'Define the work clearly before you involve the counterparty.',
        targetId: 'guided-composer-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-counterparty':
      if (
        context.view !== 'new-contract' ||
        context.createdJobId ||
        context.composerStep !== 'counterparty'
      ) {
        return null;
      }
      return {
        id: stepId,
        index: 7,
        total: 14,
        title: 'Lock the counterparty identity',
        body: 'The contractor email and worker wallet must match later during join.',
        targetId: 'guided-composer-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-plan':
      if (context.view !== 'new-contract' || context.createdJobId) {
        return null;
      }
      return {
        id: stepId,
        index: 8,
        total: 14,
        title: 'Create the guided job',
        body: 'When every checklist item is ready, create the job.',
        targetId: 'guided-composer-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-review-selected-job':
      if (context.view !== 'new-contract' || !context.createdJobId) {
        return null;
      }
      return {
        id: stepId,
        index: 9,
        total: 14,
        title: 'Move into the live contract',
        body: 'The job exists now. Open the selected job to finish launch setup.',
        targetId: 'job-created-summary',
        actionLabel: 'Open selected job',
        onAction: () => {
          if (!context.createdJobId) {
            return;
          }
          router.push(`/app/contracts/${context.createdJobId}`);
        },
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-commit-milestones':
      if (context.view !== 'contract' || !context.isClientForSelectedJob) {
        return null;
      }
      return {
        id: stepId,
        index: 10,
        total: 14,
        title: 'Commit the milestones',
        body: 'Commit the milestone structure both sides will work against.',
        targetId: 'commit-milestones-card',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-fund-job':
      if (context.view !== 'contract' || !context.isClientForSelectedJob) {
        return null;
      }
      return {
        id: stepId,
        index: 11,
        total: 14,
        title: 'Fund the selected job',
        body: 'Fund the job so the escrow flow can move forward.',
        targetId: 'fund-job-card',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-invite-contractor':
      if (context.view !== 'contract' || !context.isClientForSelectedJob) {
        return null;
      }
      return {
        id: stepId,
        index: 12,
        total: 14,
        title: 'Hand off the join link',
        body: 'Send or copy the join link so the contractor can enter the flow.',
        targetId: 'contractor-join-access',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-open-dispute':
      if (context.view !== 'dispute' || !context.isClientForSelectedJob || context.disputeOpened) {
        return null;
      }
      return {
        id: stepId,
        index: 13,
        total: 14,
        title: 'Escalate only when review fails',
        body: 'Use the dispute route only when operator mediation is needed. State the issue clearly and attach evidence.',
        targetId: 'shared-dispute-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'client-finish':
      if (context.view !== 'contract' || !context.isClientForSelectedJob || !context.resolutionPresent) {
        return null;
      }
      return {
        id: stepId,
        index: 14,
        total: 14,
        title: 'Resolution confirmed',
        body: 'You’re done when the client contract page shows the final resolution and no active dispute remains.',
        targetId: 'selected-milestone-context',
        actionLabel: 'Finish walkthrough',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    default:
      return null;
  }
}

function buildContractorStep(
  stepId: string,
  context: EscrowWalkthroughProps,
  router: ReturnType<typeof useRouter>,
  contractorState: StoredWalkthroughState,
): WalkthroughStep | null {
  switch (stepId) {
    case 'contractor-entry':
      if (
        context.view !== 'contract' ||
        !context.inviteTokenPresent ||
        context.isClientForSelectedJob
      ) {
        return null;
      }
      if (!context.accessToken) {
        return {
          id: stepId,
          index: 1,
          total: 5,
          title: 'Start from the invite-linked contract',
          body: 'This confirms you are on the right contract. Sign in with the invited email first, then reopen this invite link.',
          targetId: 'contractor-join-access',
          actionLabel: 'Open sign-in',
          onAction: () => {
            router.push('/app/sign-in');
          },
          stopHint: 'You can restart it anytime from Walkthrough or Help.',
        };
      }

      if (!context.contractorJoined && !context.canJoinSelectedContract) {
        return {
          id: stepId,
          index: 2,
          total: 5,
          title: 'Wait for join readiness',
          body: 'You’re ready when this card stops showing blockers and the Join button becomes available.',
          targetId: 'contractor-join-access',
          stopHint: 'You can restart it anytime from Walkthrough or Help.',
        };
      }

      return {
        id: stepId,
        index: 3,
        total: 5,
        title: 'Join the contract',
        body: 'Joining binds this session to the invited contractor identity.',
        targetId: 'contractor-join-access',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'contractor-open-deliver':
      if (context.view !== 'contract' || !context.contractorJoined) {
        return null;
      }
      return {
        id: stepId,
        index: 4,
        total: 5,
        title: 'Move into delivery',
        body: 'Worker delivery is now enabled for this session. Open the delivery route next.',
        targetId: 'worker-workspace-panel',
        actionLabel: 'Open delivery route',
        onAction: () => {
          const jobId = context.selectedJobId;
          if (!jobId) {
            return;
          }
          router.push(`/app/contracts/${jobId}/deliver`);
        },
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'contractor-deliver':
      if (context.view !== 'deliver' || !context.isWorkerForSelectedJob) {
        return null;
      }
      return {
        id: stepId,
        index: 5,
        total: 5,
        title: 'Submit delivery clearly',
        body: 'Submit a clear delivery note and evidence so the client can review confidently.',
        targetId: 'delivery-card',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'contractor-finish':
      if (context.view !== 'deliver' || !context.deliverySubmitted) {
        return null;
      }
      return {
        id: stepId,
        index: 5,
        total: 5,
        title: 'Delivery submitted',
        body: 'Your first contractor actions are complete. The client can now review or dispute this milestone.',
        targetId: 'delivery-card',
        actionLabel: 'Finish walkthrough',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'contractor-return-to-contract':
      if (context.view !== 'sign-in' || !context.accessToken) {
        return null;
      }
      return {
        id: stepId,
        index: 2,
        total: 5,
        title: 'Return to the invite-linked contract',
        body: 'Your session is ready. Reopen the invite-linked contract so the join flow can continue.',
        targetId: 'access-panel',
        actionLabel: 'Return to contract',
        onAction: () => {
          if (!contractorState.lastRoute) {
            return;
          }
          router.push(contractorState.lastRoute);
        },
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    default:
      return null;
  }
}

export function useEscrowLaunchWalkthrough(props: EscrowWalkthroughProps) {
  const router = useRouter();
  const [clientState, setClientState] = useState<StoredWalkthroughState>(() =>
    readStoredWalkthroughState(clientWalkthroughStorageKey),
  );
  const [contractorState, setContractorState] = useState<StoredWalkthroughState>(() =>
    readStoredWalkthroughState(contractorWalkthroughStorageKey),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const currentRoute = readCurrentRoute();

  useEffect(() => {
    if (clientState.status !== 'idle' || contractorState.status !== 'idle') {
      return;
    }

    if (props.view === 'sign-in') {
      setClientState(startClientWalkthrough(currentRoute));
      return;
    }

    if (
      props.view === 'contract' &&
      props.inviteTokenPresent &&
      !props.isClientForSelectedJob
    ) {
      setContractorState(startContractorWalkthrough(currentRoute));
    }
  }, [
    clientState.status,
    contractorState.status,
    currentRoute,
    props.inviteTokenPresent,
    props.isClientForSelectedJob,
    props.view,
  ]);

  const clientStepIds = useMemo(
    () => [
      'client-sign-in',
      'client-verify-session',
      'client-setup-readiness',
      'client-link-wallet',
      'client-provision-smart-account',
      'client-scope',
      'client-counterparty',
      'client-plan',
      'client-review-selected-job',
      'client-commit-milestones',
      'client-fund-job',
      'client-invite-contractor',
      'client-open-dispute',
      'client-finish',
    ],
    [],
  );
  const contractorStepIds = useMemo(
    () => [
      'contractor-entry',
      'contractor-return-to-contract',
      'contractor-open-deliver',
      'contractor-deliver',
      'contractor-finish',
    ],
    [],
  );

  const clientStep = useMemo(() => {
    if (clientState.status !== 'active') {
      return null;
    }

    const stepId = clientState.lastStep ?? clientStepIds[0];
    return buildClientStep(stepId, props, router);
  }, [clientState.lastStep, clientState.status, clientStepIds, props, router]);

  const contractorStep = useMemo(() => {
    if (contractorState.status !== 'active') {
      return null;
    }

    const stepId = contractorState.lastStep ?? contractorStepIds[0];
    return buildContractorStep(stepId, props, router, contractorState);
  }, [
    contractorState,
    contractorStepIds,
    props,
    router,
  ]);

  useEffect(() => {
    if (clientState.status !== 'active') {
      return;
    }

    const stepId = clientState.lastStep ?? clientStepIds[0];
    const routeInput = {
      lastRoute: currentRoute,
      lastStep: stepId,
    };

    if (stepId === 'client-sign-in' && props.otpIssued) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-verify-session',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-verify-session' && props.accessToken) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-setup-readiness',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-link-wallet' && props.hasLinkedEoa) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-provision-smart-account',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-provision-smart-account' && props.hasProvisionedDefaultWallet) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-scope',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-scope' && props.composerStep !== 'scope') {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-counterparty',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-counterparty' && props.composerStep === 'plan') {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-plan',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'client-plan' && props.createdJobId) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-review-selected-job',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (
      stepId === 'client-commit-milestones' &&
      props.view === 'contract' &&
      props.selectedJobId &&
      !props.createdJobId &&
      !props.canManageContractorInvite &&
      !props.inviteTokenPresent
    ) {
      writeStoredWalkthroughState(clientWalkthroughStorageKey, {
        ...clientState,
        ...routeInput,
      });
    }
  }, [
    clientState,
    clientStepIds,
    currentRoute,
    props.accessToken,
    props.canManageContractorInvite,
    props.composerStep,
    props.createdJobId,
    props.hasLinkedEoa,
    props.hasProvisionedDefaultWallet,
    props.inviteTokenPresent,
    props.otpIssued,
    props.selectedJobId,
    props.view,
  ]);

  useEffect(() => {
    if (contractorState.status !== 'active') {
      return;
    }

    const stepId = contractorState.lastStep ?? contractorStepIds[0];

    if (stepId === 'contractor-entry' && !props.accessToken) {
      writeStoredWalkthroughState(contractorWalkthroughStorageKey, {
        ...contractorState,
        lastStep: 'contractor-entry',
        lastRoute: currentRoute,
      });
      return;
    }

    if (stepId === 'contractor-entry' && props.accessToken && props.contractorJoined) {
      setContractorState(
        activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: 'contractor-open-deliver',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (
      stepId === 'contractor-entry' &&
      props.accessToken &&
      !props.contractorJoined &&
      currentRoute.includes('/app/sign-in')
    ) {
      setContractorState(
        activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: 'contractor-return-to-contract',
          lastRoute: contractorState.lastRoute ?? currentRoute,
        }),
      );
      return;
    }

    if (
      stepId === 'contractor-return-to-contract' &&
      props.view === 'contract' &&
      props.contractorJoined
    ) {
      setContractorState(
        activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: 'contractor-open-deliver',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (
      stepId === 'contractor-open-deliver' &&
      props.view === 'deliver' &&
      props.isWorkerForSelectedJob
    ) {
      setContractorState(
        activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: 'contractor-deliver',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'contractor-deliver' && props.deliverySubmitted) {
      setContractorState(
        activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: 'contractor-finish',
          lastRoute: currentRoute,
        }),
      );
    }
  }, [
    contractorState,
    contractorStepIds,
    currentRoute,
    props.accessToken,
    props.contractorJoined,
    props.deliverySubmitted,
    props.isWorkerForSelectedJob,
    props.view,
  ]);

  useEffect(() => {
    if (
      clientState.status === 'active' &&
      clientState.lastStep === 'client-open-dispute' &&
      props.resolutionPresent &&
      props.view === 'contract'
    ) {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-finish',
          lastRoute: currentRoute,
        }),
      );
    }
  }, [clientState.lastStep, clientState.status, currentRoute, props.resolutionPresent, props.view]);

  const activeTrack = contractorStep ? 'contractor' : clientStep ? 'client' : null;
  const activeStep = contractorStep ?? clientStep;

  function stopActiveTrack() {
    if (activeTrack === 'contractor') {
      setContractorState(
        stopStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: contractorState.lastStep,
          lastRoute: currentRoute,
        }),
      );
    } else if (activeTrack === 'client') {
      setClientState(
        stopStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: clientState.lastStep,
          lastRoute: currentRoute,
        }),
      );
    }
    setNotice('Walkthrough stopped. Restart anytime from Walkthrough or Help.');
  }

  function advanceClientManually() {
    const currentStepId = clientState.lastStep ?? clientStepIds[0];

    if (currentStepId === 'client-review-selected-job') {
      setClientState(
        activateStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: 'client-commit-milestones',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (currentStepId === 'client-finish') {
      setClientState(
        completeStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Client walkthrough completed.');
      return;
    }

    const next = nextStepId(currentStepId, clientStepIds);
    if (!next) {
      setClientState(
        completeStoredWalkthroughState(clientWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Client walkthrough completed.');
      return;
    }

    setClientState(
      activateStoredWalkthroughState(clientWalkthroughStorageKey, {
        lastStep: next,
        lastRoute: currentRoute,
      }),
    );
  }

  function advanceContractorManually() {
    const currentStepId = contractorState.lastStep ?? contractorStepIds[0];
    if (currentStepId === 'contractor-finish') {
      setContractorState(
        completeStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Contractor walkthrough completed.');
      return;
    }

    const next = nextStepId(currentStepId, contractorStepIds);
    if (!next) {
      setContractorState(
        completeStoredWalkthroughState(contractorWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Contractor walkthrough completed.');
      return;
    }

    setContractorState(
      activateStoredWalkthroughState(contractorWalkthroughStorageKey, {
        lastStep: next,
        lastRoute: currentRoute,
      }),
    );
  }

  const overlay = activeStep ? (
    <WalkthroughOverlay
      visible
      title={activeStep.title}
      body={activeStep.body}
      targetId={activeStep.targetId}
      progressLabel={`${activeTrack === 'client' ? 'Client' : 'Contractor'} walkthrough • ${activeStep.index}/${activeStep.total}`}
      stopLabel="Stop walkthrough"
      stopHint={activeStep.stopHint}
      primaryActionLabel={
        activeStep.actionLabel ?? (activeTrack ? 'Next' : undefined)
      }
      onPrimaryAction={() => {
        if (activeStep.onAction) {
          activeStep.onAction();
        }
        if (activeTrack === 'client') {
          advanceClientManually();
        } else if (activeTrack === 'contractor') {
          advanceContractorManually();
        }
      }}
      onStop={stopActiveTrack}
    />
  ) : null;

  const launcher = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <WalkthroughLauncherMenu
        label="Walkthrough"
        actions={[
          {
            id: 'client',
            label: 'Start client walkthrough',
            description: 'Sign in, complete setup, create the job, fund it, and send the join link.',
            onSelect: () => {
              setClientState(startClientWalkthrough(currentRoute));
              setNotice(null);
            },
          },
          {
            id: 'contractor',
            label: 'Start contractor walkthrough',
            description: 'Use the invite-linked contract, join, and submit delivery.',
            onSelect: () => {
              setContractorState(startContractorWalkthrough(currentRoute));
              setNotice(null);
            },
          },
        ]}
      />
    </div>
  );

  return {
    launcher,
    overlay,
    notice,
    clearNotice: () => setNotice(null),
  };
}
