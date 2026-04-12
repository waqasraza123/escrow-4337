'use client';

import {
  WalkthroughLauncherMenu,
  WalkthroughOverlay,
  activateStoredWalkthroughState,
  completeStoredWalkthroughState,
  readStoredWalkthroughState,
  stopStoredWalkthroughState,
  type StoredWalkthroughState,
} from '@escrow4334/frontend-core/walkthrough';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export const operatorWalkthroughStorageKey = 'escrow4337.walkthrough.v1.operator';

type OperatorWalkthroughProps = {
  view: 'dashboard' | 'case';
  accessToken: string | null;
  controlsArbitratorWallet: boolean;
  hasDisputedMilestone: boolean;
  caseLoaded: boolean;
  currentJobId: string | null;
};

type OperatorWalkthroughStep = {
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

export function startOperatorWalkthrough(route?: string) {
  return activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
    lastStep: 'operator-start',
    lastRoute: route ?? null,
  });
}

function buildOperatorStep(
  stepId: string,
  context: OperatorWalkthroughProps,
  router: ReturnType<typeof useRouter>,
): OperatorWalkthroughStep | null {
  switch (stepId) {
    case 'operator-start':
      if (context.view !== 'case' || !context.hasDisputedMilestone) {
        return null;
      }
      return {
        id: stepId,
        index: 1,
        total: 4,
        title: 'Start on the operator case page',
        body: context.accessToken
          ? 'This is the operator case review for the disputed job.'
          : 'This is the operator case review for the disputed job. Authenticate the operator session first so protected actions are available.',
        targetId: 'operator-session-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'operator-link-wallet':
      if (context.view !== 'case' || !context.accessToken || context.controlsArbitratorWallet) {
        return null;
      }
      return {
        id: stepId,
        index: 2,
        total: 4,
        title: 'Link the configured arbitrator wallet',
        body: 'Resolution stays blocked until this session controls the configured arbitrator wallet.',
        targetId: 'operator-session-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'operator-resolve':
      if (
        context.view !== 'case' ||
        !context.accessToken ||
        !context.controlsArbitratorWallet ||
        !context.hasDisputedMilestone
      ) {
        return null;
      }
      return {
        id: stepId,
        index: 3,
        total: 4,
        title: 'Review and resolve the disputed milestone',
        body: 'Review the disputed milestone and receipts, choose the outcome, explain it in the note, and submit the decision.',
        targetId: 'operator-resolution-panel',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'operator-finish':
      if (context.view !== 'case' || !context.caseLoaded || context.hasDisputedMilestone) {
        return null;
      }
      return {
        id: stepId,
        index: 4,
        total: 4,
        title: 'Resolution confirmed',
        body: 'The active dispute is gone from this case. The client can now verify the final resolved state from the contract page.',
        targetId: 'operator-case-brief',
        actionLabel: 'Finish walkthrough',
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    case 'operator-open-case':
      return {
        id: stepId,
        index: 1,
        total: 1,
        title: 'Open an operator case review',
        body: 'Load a case route with an active dispute so the operator walkthrough can guide the live resolution flow.',
        targetId: 'operator-case-lookup',
        actionLabel: context.currentJobId ? 'Open current case route' : undefined,
        onAction: context.currentJobId
          ? () => {
              router.push(`/cases/${context.currentJobId}`);
            }
          : undefined,
        stopHint: 'You can restart it anytime from Walkthrough or Help.',
      };
    default:
      return null;
  }
}

export function useOperatorLaunchWalkthrough(props: OperatorWalkthroughProps) {
  const router = useRouter();
  const [state, setState] = useState<StoredWalkthroughState>(() =>
    readStoredWalkthroughState(operatorWalkthroughStorageKey),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const currentRoute = readCurrentRoute();

  useEffect(() => {
    if (state.status !== 'idle') {
      return;
    }

    if (props.view === 'case' && props.hasDisputedMilestone) {
      setState(startOperatorWalkthrough(currentRoute));
    }
  }, [currentRoute, props.hasDisputedMilestone, props.view, state.status]);

  const stepIds = useMemo(
    () => [
      'operator-open-case',
      'operator-start',
      'operator-link-wallet',
      'operator-resolve',
      'operator-finish',
    ],
    [],
  );

  const step = useMemo(() => {
    if (state.status !== 'active') {
      return null;
    }

    return buildOperatorStep(state.lastStep ?? stepIds[0], props, router);
  }, [props, router, state.lastStep, state.status, stepIds]);

  useEffect(() => {
    if (state.status !== 'active') {
      return;
    }

    const stepId = state.lastStep ?? stepIds[0];

    if (stepId === 'operator-start' && props.accessToken && !props.controlsArbitratorWallet) {
      setState(
        activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
          lastStep: 'operator-link-wallet',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (
      (stepId === 'operator-start' || stepId === 'operator-link-wallet') &&
      props.accessToken &&
      props.controlsArbitratorWallet &&
      props.hasDisputedMilestone
    ) {
      setState(
        activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
          lastStep: 'operator-resolve',
          lastRoute: currentRoute,
        }),
      );
      return;
    }

    if (stepId === 'operator-resolve' && props.caseLoaded && !props.hasDisputedMilestone) {
      setState(
        activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
          lastStep: 'operator-finish',
          lastRoute: currentRoute,
        }),
      );
    }
  }, [
    currentRoute,
    props.accessToken,
    props.caseLoaded,
    props.controlsArbitratorWallet,
    props.hasDisputedMilestone,
    state.lastStep,
    state.status,
    stepIds,
  ]);

  function stopWalkthrough() {
    setState(
      stopStoredWalkthroughState(operatorWalkthroughStorageKey, {
        lastStep: state.lastStep,
        lastRoute: currentRoute,
      }),
    );
    setNotice('Walkthrough stopped. Restart anytime from Walkthrough or Help.');
  }

  function advanceWalkthrough() {
    const currentStepId = state.lastStep ?? stepIds[0];
    if (currentStepId === 'operator-finish') {
      setState(
        completeStoredWalkthroughState(operatorWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Operator walkthrough completed.');
      return;
    }

    const index = stepIds.indexOf(currentStepId);
    const nextStepId = index >= 0 ? stepIds[index + 1] ?? null : null;
    if (!nextStepId) {
      setState(
        completeStoredWalkthroughState(operatorWalkthroughStorageKey, {
          lastStep: currentStepId,
          lastRoute: currentRoute,
        }),
      );
      setNotice('Operator walkthrough completed.');
      return;
    }

    setState(
      activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
        lastStep: nextStepId,
        lastRoute: currentRoute,
      }),
    );
  }

  const overlay = step ? (
    <WalkthroughOverlay
      visible
      title={step.title}
      body={step.body}
      targetId={step.targetId}
      progressLabel={`Operator walkthrough • ${step.index}/${step.total}`}
      stopLabel="Stop walkthrough"
      stopHint={step.stopHint}
      primaryActionLabel={step.actionLabel ?? 'Next'}
      onPrimaryAction={() => {
        if (step.onAction) {
          step.onAction();
        }
        advanceWalkthrough();
      }}
      onStop={stopWalkthrough}
      tone="dark"
    />
  ) : null;

  const launcher = (
    <WalkthroughLauncherMenu
      label="Walkthrough"
      actions={[
        {
          id: 'operator',
          label: 'Start operator walkthrough',
          description: 'Authenticate, link the arbitrator wallet, and resolve a disputed milestone.',
          onSelect: () => {
            if (props.view === 'case' && props.hasDisputedMilestone) {
              setState(startOperatorWalkthrough(currentRoute));
            } else {
              setState(
                activateStoredWalkthroughState(operatorWalkthroughStorageKey, {
                  lastStep: 'operator-open-case',
                  lastRoute: currentRoute,
                }),
              );
            }
            setNotice(null);
          },
        },
      ]}
    />
  );

  return {
    launcher,
    overlay,
    notice,
  };
}
