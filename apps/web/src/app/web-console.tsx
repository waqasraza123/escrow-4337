'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createErrorState,
  createIdleState,
  createSuccessState,
  createWorkingState,
  describeRuntimeAlignment,
  EmptyStateCard,
  formatTimestamp,
  previewHash,
  StatusNotice,
  type AsyncState,
} from '@escrow4334/frontend-core';
import styles from './page.module.css';
import type {
  AuditBundle,
  ContractorJoinReadiness,
  JobView,
  JobsListResponse,
  PublicJobView,
  RuntimeProfile,
  SessionTokens,
  SmartAccountProvisionResponse,
  UserProfile,
  WalletLinkChallenge,
  WalletState,
} from '../lib/api';
import { webApi } from '../lib/api';
import {
  connectInjectedWallet,
  readInjectedWalletSnapshot,
  signMessageWithInjectedWallet,
  subscribeInjectedWallet,
} from '../lib/injected-wallet';
import { useWebI18n } from '../lib/i18n';
import {
  buildJobLifecycleCards,
  buildMilestoneLifecycleCards,
  buildMilestoneTimelineEntries,
  getJobAuditEvents,
  getJobExecutions,
  getMilestoneAuditEvents,
  getMilestoneExecutions,
  pickInitialMilestoneIndex,
  type LifecycleCard,
  type PendingLifecycleAction,
} from './milestone-lifecycle';
import { LanguageSwitcher } from './language-switcher';

type WalletConnectionState = {
  status: 'checking' | 'unavailable' | 'disconnected' | 'connected';
  address: string | null;
  chainId: number | null;
  message?: string;
};

type MilestoneDraft = {
  title: string;
  deliverable: string;
  amount: string;
  dueAt: string;
};

type ComposerStep = 'scope' | 'counterparty' | 'plan';

type JobComposerState = {
  title: string;
  description: string;
  category: string;
  contractorEmail: string;
  workerAddress: string;
  currencyAddress: string;
  settlementAsset: string;
  settlementChain: string;
  payoutStyle: 'milestone-based';
  reviewWindowDays: string;
  disputeModel: 'operator-mediation' | 'mutual-resolution';
  evidenceExpectation: string;
  kickoffNote: string;
};

type CreatedJobResult = {
  jobId: string;
  escrowId: string;
  txHash: string;
};

export type EscrowConsoleView =
  | 'overview'
  | 'sign-in'
  | 'setup'
  | 'new-contract'
  | 'contract'
  | 'deliver'
  | 'dispute';

type EscrowConsoleProps = {
  view?: EscrowConsoleView;
  initialJobId?: string | null;
};

const categoryOptions = [
  'software-development',
  'design',
  'marketing',
  'research',
  'product',
  'operations',
 ] as const;

const composerStepIds: ComposerStep[] = ['scope', 'counterparty', 'plan'];

function createInitialJobComposerState(): JobComposerState {
  return {
    title: '',
    description: '',
    category: 'software-development',
    contractorEmail: '',
    workerAddress: '',
    currencyAddress: '',
    settlementAsset: 'USDC',
    settlementChain: 'base-sepolia',
    payoutStyle: 'milestone-based',
    reviewWindowDays: '3',
    disputeModel: 'operator-mediation',
    evidenceExpectation: 'delivery note plus linked evidence URLs',
    kickoffNote: 'Milestones should be accepted or disputed explicitly at each delivery checkpoint.',
  };
}

function isMilestoneDraftReady(milestone: MilestoneDraft) {
  return Boolean(
    milestone.title.trim() &&
      milestone.deliverable.trim() &&
      milestone.amount.trim(),
  );
}

function sumMilestoneAmounts(milestones: MilestoneDraft[]) {
  return milestones.reduce((total, milestone) => {
    const parsed = Number(milestone.amount);
    return Number.isFinite(parsed) ? total + parsed : total;
  }, 0);
}

function buildJobTermsJson(
  state: JobComposerState,
  milestones: MilestoneDraft[],
): Record<string, unknown> {
  const readyMilestones = milestones
    .filter(isMilestoneDraftReady)
    .map((milestone, index) => ({
      order: index + 1,
      title: milestone.title.trim(),
      deliverable: milestone.deliverable.trim(),
      amount: milestone.amount.trim(),
      dueAt: milestone.dueAt ? Number(milestone.dueAt) : null,
    }));

  return {
    currency: state.settlementAsset,
    chain: state.settlementChain,
    payoutStyle: state.payoutStyle,
    reviewWindowDays: Number(state.reviewWindowDays) || 0,
    disputeModel: state.disputeModel,
    evidenceExpectation: state.evidenceExpectation.trim(),
    kickoffNote: state.kickoffNote.trim(),
    milestones: readyMilestones,
  };
}

const storageKey = 'escrow4337.web.session';

function readSession(): SessionTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
  } catch {
    return null;
  }
}

function writeSession(tokens: SessionTokens | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!tokens) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(tokens));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function splitEvidenceUrls(input: string) {
  return input
    .split(/\s|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function readInviteToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const invite = new URLSearchParams(window.location.search).get('invite');
  return invite?.trim() || null;
}

function getLifecyclePhaseClassName(phase: LifecycleCard['phase']) {
  switch (phase) {
    case 'ready':
      return styles.lifecycleReady;
    case 'pending':
      return styles.lifecyclePending;
    case 'confirmed':
      return styles.lifecycleConfirmed;
    case 'failed':
      return styles.lifecycleFailed;
    case 'blocked':
      return styles.lifecycleBlocked;
  }
}

function getMilestoneStatusClassName(
  status: JobView['milestones'][number]['status'],
) {
  switch (status) {
    case 'pending':
      return styles.milestonePending;
    case 'delivered':
      return styles.milestoneDelivered;
    case 'released':
      return styles.milestoneReleased;
    case 'disputed':
      return styles.milestoneDisputed;
    case 'refunded':
      return styles.milestoneRefunded;
  }
}

function isLifecycleActionEnabled(card: LifecycleCard) {
  return card.canTrigger && (card.phase === 'ready' || card.phase === 'failed');
}

function getConsoleFrame(
  view: EscrowConsoleView,
  messages: ReturnType<typeof useWebI18n>['messages'],
) {
  switch (view) {
    case 'sign-in':
      return messages.console.frames.signIn;
    case 'setup':
      return messages.console.frames.setup;
    case 'new-contract':
      return messages.console.frames.newContract;
    case 'contract':
      return messages.console.frames.contract;
    case 'deliver':
      return messages.console.frames.deliver;
    case 'dispute':
      return messages.console.frames.dispute;
    case 'overview':
    default:
      return messages.console.frames.overview;
  }
}

function getStringTerm(
  job: { termsJSON: Record<string, unknown> } | null,
  key: string,
) {
  const value = job?.termsJSON?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getNumericTerm(
  job: { termsJSON: Record<string, unknown> } | null,
  key: string,
) {
  const value = job?.termsJSON?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getLifecyclePhaseLabel(
  phase: LifecycleCard['phase'],
  messages: ReturnType<typeof useWebI18n>['messages'],
) {
  return messages.console.labels.lifecyclePhase[phase];
}

function getJobStatusLabel(
  status: JobView['status'],
  messages: ReturnType<typeof useWebI18n>['messages'],
) {
  return messages.console.labels.jobStatus[status];
}

function getMilestoneStatusLabel(
  status: JobView['milestones'][number]['status'],
  messages: ReturnType<typeof useWebI18n>['messages'],
) {
  return messages.console.labels.milestoneStatus[status];
}

function getRuntimeProfileText(
  profile: RuntimeProfile['profile'],
  messages: ReturnType<typeof useWebI18n>['messages'],
) {
  return messages.console.labels.runtimeProfile[profile];
}

export function EscrowConsole({
  view = 'overview',
  initialJobId = null,
}: EscrowConsoleProps) {
  const { definition, messages } = useWebI18n();
  const frame = getConsoleFrame(view, messages);
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile | null>(null);
  const [runtimeState, setRuntimeState] = useState<AsyncState>(createIdleState());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [jobsResponse, setJobsResponse] = useState<JobsListResponse>({ jobs: [] });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId);
  const [auditBundle, setAuditBundle] = useState<AuditBundle | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [startState, setStartState] = useState<AsyncState>(createIdleState());
  const [verifyState, setVerifyState] = useState<AsyncState>(createIdleState());
  const [sessionState, setSessionState] = useState<AsyncState>(createIdleState());
  const [walletActionState, setWalletActionState] = useState<AsyncState>(
    createIdleState(),
  );
  const [jobActionState, setJobActionState] = useState<AsyncState>(
    createIdleState(),
  );
  const [auditState, setAuditState] = useState<AsyncState>(createIdleState());
  const [challenge, setChallenge] = useState<WalletLinkChallenge | null>(null);
  const [linkAddress, setLinkAddress] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkChainId, setLinkChainId] = useState('84532');
  const [walletSignature, setWalletSignature] = useState('');
  const [walletConnection, setWalletConnection] = useState<WalletConnectionState>({
    status: 'checking',
    address: null,
    chainId: null,
  });
  const [provisionOwnerAddress, setProvisionOwnerAddress] = useState('');
  const [provisionLabel, setProvisionLabel] = useState('Primary execution wallet');
  const [fundAmount, setFundAmount] = useState('100');
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      title: 'Discovery',
      deliverable: 'Accepted scope and milestone plan',
      amount: '50',
      dueAt: '',
    },
    {
      title: 'Delivery',
      deliverable: 'Final shipped implementation',
      amount: '50',
      dueAt: '',
    },
  ]);
  const [composerStep, setComposerStep] = useState<ComposerStep>('scope');
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryEvidence, setDeliveryEvidence] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [resolutionAction, setResolutionAction] = useState<'release' | 'refund'>(
    'release',
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [createdJobResult, setCreatedJobResult] = useState<CreatedJobResult | null>(
    null,
  );
  const [joinLinkState, setJoinLinkState] = useState<AsyncState>(createIdleState());
  const [joinReadiness, setJoinReadiness] = useState<ContractorJoinReadiness | null>(
    null,
  );
  const [joinReadinessState, setJoinReadinessState] = useState<AsyncState>(
    createIdleState(),
  );
  const [selectedInviteToken, setSelectedInviteToken] = useState<string | null>(null);
  const [contractorEmailDraft, setContractorEmailDraft] = useState('');
  const [pendingLifecycleAction, setPendingLifecycleAction] =
    useState<PendingLifecycleAction | null>(null);

  const selectedJob = useMemo(
    () => jobsResponse.jobs.find((entry) => entry.job.id === selectedJobId) ?? null,
    [jobsResponse.jobs, selectedJobId],
  );

  const selectedJobView = useMemo(() => {
    const listJob = selectedJob?.job ?? null;
    const auditJob = auditBundle?.bundle.job ?? null;

    if (listJob && auditJob && listJob.id === auditJob.id) {
      return {
        ...auditJob,
        contractorParticipation: listJob.contractorParticipation,
      };
    }

    return listJob ?? auditJob;
  }, [auditBundle, selectedJob]);
  const jobAuditEvents = auditBundle?.bundle.audit ?? [];
  const jobExecutions = auditBundle?.bundle.executions ?? [];
  const selectedMilestone = selectedJobView?.milestones[selectedMilestoneIndex];
  const selectedJobRoles = selectedJob?.participantRoles ?? [];
  const isClientForSelectedJob = selectedJobRoles.includes('client');
  const isWorkerForSelectedJob = selectedJobRoles.includes('worker');
  const linkedWalletAddresses = useMemo(
    () => new Set(walletState?.wallets.map((wallet) => wallet.address) ?? []),
    [walletState],
  );
  const controlsSelectedClientWallet = Boolean(
    selectedJobView && linkedWalletAddresses.has(selectedJobView.onchain.clientAddress),
  );
  const selectedContractorParticipation = selectedJobView?.contractorParticipation ?? null;
  const pendingContractorEmail =
    selectedJob?.job.contractorParticipation?.contractorEmail?.trim().toLowerCase() ??
    null;
  const joinRecoveryEmailHint =
    joinReadiness?.contractorEmailHint ?? pendingContractorEmail;
  const canJoinSelectedContract =
    Boolean(accessToken) &&
    Boolean(selectedJobView) &&
    !isClientForSelectedJob &&
    selectedContractorParticipation?.status === 'pending' &&
    selectedInviteToken !== null &&
    joinReadiness?.status === 'ready';
  const canManageContractorInvite =
    Boolean(accessToken) &&
    Boolean(selectedJobView) &&
    isClientForSelectedJob &&
    selectedContractorParticipation?.status === 'pending';
  const contractorInviteWasSent = Boolean(
    selectedJob?.job.contractorParticipation?.inviteLastSentAt,
  );
  const reviewWindowDays = getNumericTerm(selectedJobView, 'reviewWindowDays');
  const disputeModel = getStringTerm(selectedJobView, 'disputeModel');
  const evidenceExpectation = getStringTerm(selectedJobView, 'evidenceExpectation');
  const showRuntime = ['overview', 'sign-in', 'setup', 'new-contract'].includes(view);
  const showAccess = ['overview', 'sign-in', 'setup', 'new-contract'].includes(view);
  const showSetup = ['overview', 'setup', 'new-contract', 'contract', 'deliver', 'dispute'].includes(
    view,
  );
  const showComposer = ['overview', 'new-contract'].includes(view);
  const showJobIndex = ['overview', 'contract', 'deliver', 'dispute'].includes(view);
  const showSelectedJob = ['overview', 'contract', 'deliver', 'dispute'].includes(view);
  const showClientWorkspace =
    isClientForSelectedJob && ['overview', 'contract', 'dispute'].includes(view);
  const showWorkerWorkspace =
    isWorkerForSelectedJob && ['overview', 'contract', 'deliver'].includes(view);
  const showSharedDispute = ['overview', 'contract', 'dispute'].includes(view);
  const showOperatorPosture = ['overview', 'contract', 'dispute'].includes(view);
  const joinAccessStatusLabel =
    selectedContractorParticipation?.status === 'joined'
      ? messages.common.joined
      : canJoinSelectedContract
        ? messages.common.readyToJoin
        : selectedInviteToken
          ? accessToken
            ? messages.common.setupRequired
            : messages.common.shareLinkReady
          : messages.common.pending;
  const joinAccessMessage =
    selectedContractorParticipation?.status === 'joined'
      ? messages.console.messages.joinAccessJoined
      : !selectedInviteToken
        ? messages.console.messages.joinAccessInviteRequired
        : !accessToken
          ? messages.console.messages.joinAccessSignedOut(joinRecoveryEmailHint)
          : joinReadinessState.kind === 'error'
            ? joinReadinessState.message
            : joinReadiness?.status === 'wrong_email'
              ? messages.console.messages.joinAccessWrongEmail(joinRecoveryEmailHint)
              : joinReadiness?.status === 'wallet_not_linked'
                ? messages.console.messages.joinAccessWalletNotLinked(
                    selectedJobView?.onchain.workerAddress ?? '',
                  )
                : joinReadiness?.status === 'wrong_wallet'
                  ? messages.console.messages.joinAccessWrongWallet(
                      selectedJobView?.onchain.workerAddress ?? '',
                    )
                  : joinReadiness?.status === 'invite_invalid'
                    ? messages.console.messages.joinAccessInviteInvalid
                    : joinReadiness?.status === 'claimed_by_other'
                      ? messages.console.messages.joinAccessClaimed
                      : joinReadiness?.status === 'ready'
                        ? messages.console.messages.joinAccessReady
                        : messages.console.messages.joinAccessInviteRequired;

  const [createJobState, setCreateJobState] = useState<JobComposerState>(
    createInitialJobComposerState,
  );
  const formatDate = (value?: number | null, fallback?: string) =>
    formatTimestamp(value, {
      fallback,
      locale: definition.langTag,
    });
  const composerSteps = useMemo(
    () =>
      composerStepIds.map((id) => ({
        id,
        label: messages.console.composer.steps[id].label,
        description: messages.console.composer.steps[id].description,
      })),
    [messages],
  );
  const lifecycleMessages = messages.console.lifecycle;

  const milestoneDraftCount = useMemo(
    () => milestones.filter(isMilestoneDraftReady).length,
    [milestones],
  );
  const milestoneDraftTotal = useMemo(() => sumMilestoneAmounts(milestones), [milestones]);
  const composerTermsPreview = useMemo(
    () => formatJson(buildJobTermsJson(createJobState, milestones)),
    [createJobState, milestones],
  );
  const hasProvisionedDefaultWallet = Boolean(
    profile?.defaultExecutionWalletAddress &&
      walletState?.wallets.some(
        (wallet) =>
          wallet.address === profile.defaultExecutionWalletAddress &&
          wallet.walletKind === 'smart_account',
      ),
  );
  const hasLinkedEoa = Boolean(
    walletState?.wallets.some((wallet) => wallet.walletKind === 'eoa'),
  );
  const hasLinkedWallet = Boolean((walletState?.wallets.length ?? 0) > 0);
  const clientSetupReady = Boolean(accessToken) && hasLinkedEoa && hasProvisionedDefaultWallet;
  const contractorSetupReady = Boolean(accessToken) && hasLinkedWallet;
  const setupNextBlocker = !accessToken
    ? messages.console.setup.blockers.signIn
    : !hasLinkedEoa && walletConnection.status !== 'connected'
      ? messages.console.setup.blockers.connectWallet
      : !hasLinkedEoa
        ? messages.console.setup.blockers.linkWallet
        : !hasProvisionedDefaultWallet
          ? messages.console.setup.blockers.provisionSmartAccount
          : messages.console.setup.blockers.ready;
  const setupTracks = useMemo(
    () => [
      {
        title: messages.console.setup.clientTrackTitle,
        status: clientSetupReady ? messages.common.ready : messages.common.setupRequired,
        body: clientSetupReady
          ? messages.console.setup.clientTrackReady
          : !accessToken
            ? messages.console.setup.clientTrackNeedsSignIn
            : !hasLinkedEoa
              ? messages.console.setup.clientTrackNeedsWalletLink
              : messages.console.setup.clientTrackNeedsSmartAccount,
      },
      {
        title: messages.console.setup.contractorTrackTitle,
        status: contractorSetupReady
          ? messages.common.readyToJoin
          : messages.common.setupRequired,
        body: contractorSetupReady
          ? messages.console.setup.contractorTrackReady
          : !accessToken
            ? messages.console.setup.contractorTrackNeedsSignIn
            : messages.console.setup.contractorTrackNeedsWalletLink,
      },
    ],
    [
      accessToken,
      clientSetupReady,
      contractorSetupReady,
      hasLinkedEoa,
      messages,
      hasProvisionedDefaultWallet,
    ],
  );
  const composerChecklist = useMemo(
    () => [
      {
        label: messages.console.composer.checklist.scopeDefined,
        ok: Boolean(
          createJobState.title.trim() &&
            createJobState.description.trim() &&
            createJobState.category.trim(),
        ),
      },
      {
        label: messages.console.composer.checklist.contractorEmailSet,
        ok: Boolean(createJobState.contractorEmail.trim()),
      },
      {
        label: messages.console.composer.checklist.workerWalletSet,
        ok: Boolean(createJobState.workerAddress.trim()),
      },
      {
        label: messages.console.composer.checklist.settlementTokenSet,
        ok: Boolean(createJobState.currencyAddress.trim()),
      },
      {
        label: messages.console.composer.checklist.defaultWalletReady,
        ok: hasProvisionedDefaultWallet,
      },
      {
        label: messages.console.composer.checklist.milestoneReady,
        ok: milestoneDraftCount > 0,
      },
    ],
    [createJobState, hasProvisionedDefaultWallet, messages, milestoneDraftCount],
  );
  const canCreateJob = composerChecklist.every((item) => item.ok);
  const jobLifecycleCards = useMemo(
    () =>
      selectedJobView
        ? buildJobLifecycleCards({
            copy: lifecycleMessages,
            job: selectedJobView,
            executions: jobExecutions,
            pendingAction: pendingLifecycleAction,
          })
        : [],
    [jobExecutions, lifecycleMessages, pendingLifecycleAction, selectedJobView],
  );
  const milestoneLifecycleCards = useMemo(
    () =>
      selectedJobView
        ? buildMilestoneLifecycleCards({
            copy: lifecycleMessages,
            job: selectedJobView,
            milestoneIndex: selectedMilestoneIndex,
            executions: jobExecutions,
            pendingAction: pendingLifecycleAction,
          })
        : [],
    [
      jobExecutions,
      lifecycleMessages,
      pendingLifecycleAction,
      selectedJobView,
      selectedMilestoneIndex,
    ],
  );
  const selectedMilestoneTimeline = useMemo(
    () => buildMilestoneTimelineEntries(selectedMilestone, lifecycleMessages),
    [lifecycleMessages, selectedMilestone],
  );
  const selectedMilestoneAuditEvents = useMemo(
    () => getMilestoneAuditEvents(jobAuditEvents, selectedMilestoneIndex),
    [jobAuditEvents, selectedMilestoneIndex],
  );
  const selectedMilestoneExecutions = useMemo(
    () => getMilestoneExecutions(jobExecutions, selectedMilestoneIndex),
    [jobExecutions, selectedMilestoneIndex],
  );
  const jobLevelAuditEvents = useMemo(
    () => getJobAuditEvents(jobAuditEvents),
    [jobAuditEvents],
  );
  const jobLevelExecutions = useMemo(
    () => getJobExecutions(jobExecutions),
    [jobExecutions],
  );

  useEffect(() => {
    setSelectedJobId(initialJobId);
  }, [initialJobId]);

  useEffect(() => {
    const routeInviteToken =
      initialJobId && selectedJobId === initialJobId ? readInviteToken() : null;
    setSelectedInviteToken(routeInviteToken);
  }, [initialJobId, selectedJobId, view]);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }

    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
  }, []);

  useEffect(() => {
    void loadRuntimeProfile();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInjectedWallet() {
      try {
        const snapshot = await readInjectedWalletSnapshot();
        if (!active) {
          return;
        }

        setWalletConnection({
          status: snapshot.address ? 'connected' : 'disconnected',
          address: snapshot.address,
          chainId: snapshot.chainId,
          message: snapshot.address
            ? 'Injected wallet detected and ready to sign.'
            : 'Injected wallet detected. Connect it to sign SIWE challenges.',
        });
        if (snapshot.address) {
          setLinkAddress(snapshot.address);
          setProvisionOwnerAddress((current) => current || snapshot.address || '');
        }
        if (snapshot.chainId) {
          setLinkChainId(String(snapshot.chainId));
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setWalletConnection({
          status: 'unavailable',
          address: null,
          chainId: null,
          message:
            error instanceof Error
              ? error.message
              : 'No injected wallet detected.',
        });
      }
    }

    void loadInjectedWallet();

    const unsubscribe = subscribeInjectedWallet((snapshot) => {
      if (!active) {
        return;
      }

      setWalletConnection((current) => {
        const nextAddress =
          snapshot.address !== undefined ? snapshot.address : current.address;
        const nextChainId =
          snapshot.chainId !== undefined ? snapshot.chainId : current.chainId;

        return {
          status: nextAddress ? 'connected' : 'disconnected',
          address: nextAddress,
          chainId: nextChainId,
          message: nextAddress
            ? 'Injected wallet updated.'
            : 'Injected wallet disconnected.',
        };
      });

      if (snapshot.address !== undefined) {
        setLinkAddress(snapshot.address || '');
        setProvisionOwnerAddress((current) => current || snapshot.address || '');
      }

      if (snapshot.chainId !== undefined && snapshot.chainId !== null) {
        setLinkChainId(String(snapshot.chainId));
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void refreshConsole(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!selectedJobId) {
      setAuditBundle(null);
      setAuditState(createIdleState());
      return;
    }

    setAuditBundle(null);
    void loadAudit(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    setDeliveryNote('');
    setDeliveryEvidence('');
    setDisputeReason('');
    setDisputeEvidence('');
    setResolutionAction('release');
    setResolutionNote('');
    setJoinLinkState(createIdleState());
    setJoinReadiness(null);
    setJoinReadinessState(createIdleState());
  }, [selectedJobId]);

  useEffect(() => {
    setContractorEmailDraft(
      selectedJob?.job.contractorParticipation?.contractorEmail ?? '',
    );
  }, [selectedJob?.job.contractorParticipation?.contractorEmail]);

  useEffect(() => {
    if (!selectedJobView) {
      setSelectedMilestoneIndex(0);
      return;
    }

    setSelectedMilestoneIndex((current) => {
      if (
        current >= 0 &&
        current < selectedJobView.milestones.length
      ) {
        return current;
      }

      return pickInitialMilestoneIndex(selectedJobView);
    });
  }, [selectedJobView]);

  useEffect(() => {
    if (
      !accessToken ||
      !selectedJobView ||
      selectedContractorParticipation?.status !== 'pending' ||
      isClientForSelectedJob
    ) {
      setJoinReadiness(null);
      setJoinReadinessState(createIdleState());
      return;
    }

    let active = true;
    setJoinReadinessState(createWorkingState('Checking contractor join readiness...'));

    void webApi
      .getContractorJoinReadiness(selectedJobView.id, selectedInviteToken, accessToken)
      .then((response) => {
        if (!active) {
          return;
        }
        setJoinReadiness(response);
        setJoinReadinessState(createIdleState());
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setJoinReadiness(null);
        setJoinReadinessState(
          createErrorState(error, 'Failed to check contractor join readiness'),
        );
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    isClientForSelectedJob,
    selectedContractorParticipation?.status,
    selectedInviteToken,
    selectedJobView,
  ]);

  async function refreshConsole(token = accessToken) {
    if (!token) {
      return;
    }

    setSessionState(createWorkingState('Syncing session state...'));

    try {
      const [user, wallets, jobs] = await Promise.all([
        webApi.me(token),
        webApi.getWalletState(token),
        webApi.listJobs(token),
      ]);

      setProfile(user);
      setWalletState(wallets);
      setJobsResponse(jobs);
      setProvisionOwnerAddress((current) =>
        current ||
        wallets.wallets.find((wallet) => wallet.walletKind === 'eoa')?.address ||
        '',
      );
      setSelectedJobId((current) => current || jobs.jobs[0]?.job.id || null);
      setSessionState(createSuccessState('Console state is current.'));
    } catch (error) {
      setSessionState(createErrorState(error, 'Failed to load session'));
    }
  }

  async function loadRuntimeProfile() {
    setRuntimeState(createWorkingState('Loading backend runtime profile...'));

    try {
      const nextProfile = await webApi.getRuntimeProfile();
      setRuntimeProfile(nextProfile);
      setRuntimeState(createSuccessState(nextProfile.summary));
    } catch (error) {
      setRuntimeState(createErrorState(error, 'Failed to load backend runtime profile'));
    }
  }

  async function loadAudit(jobId: string) {
    setAuditState(createWorkingState('Loading audit trail...'));

    try {
      const audit = await webApi.getAudit(jobId);
      setAuditBundle(audit);
      setAuditState(createIdleState());
    } catch (error) {
      setAuditState(createErrorState(error, 'Failed to load audit'));
    }
  }

  async function refreshSelectedJobContext(targetJobId: string | null) {
    if (!targetJobId) {
      return;
    }

    if (accessToken) {
      await refreshConsole(accessToken);
    }
    await loadAudit(targetJobId);
  }

  async function runLifecycleMutation<T>(input: {
    jobId: string;
    pendingAction: PendingLifecycleAction;
    workingMessage: string;
    successMessage: (result: T) => string;
    operation: () => Promise<T>;
    onSuccess?: (result: T) => void;
  }) {
    const { jobId, onSuccess, operation, pendingAction, successMessage, workingMessage } =
      input;

    setPendingLifecycleAction(pendingAction);
    setJobActionState(createWorkingState(workingMessage));

    try {
      const result = await operation();
      onSuccess?.(result);
      await refreshSelectedJobContext(jobId);
      setJobActionState(createSuccessState(successMessage(result)));
      return result;
    } catch (error) {
      await refreshSelectedJobContext(jobId);
      setJobActionState(createErrorState(error, 'Lifecycle action failed'));
      return null;
    } finally {
      setPendingLifecycleAction(null);
    }
  }

  async function handleStartAuth() {
    setStartState(createWorkingState('Sending OTP...'));

    try {
      await webApi.startAuth(authEmail);
      setStartState(
        createSuccessState(
          'OTP issued. Check your configured mail inbox or relay logs.',
        ),
      );
    } catch (error) {
      setStartState(createErrorState(error, 'Failed to start auth'));
    }
  }

  async function handleVerifyAuth() {
    setVerifyState(createWorkingState('Verifying code...'));

    try {
      const response = await webApi.verifyAuth(authEmail, authCode);
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setProfile(response.user);
      writeSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setVerifyState(
        createSuccessState('Session established. Loading product data...'),
      );
    } catch (error) {
      setVerifyState(createErrorState(error, 'Failed to verify code'));
    }
  }

  async function handleRefreshSession() {
    if (!refreshToken) {
      return;
    }

    setSessionState(createWorkingState('Refreshing session...'));

    try {
      const tokens = await webApi.refresh(refreshToken);
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      writeSession(tokens);
      setSessionState(createSuccessState('Session refreshed.'));
    } catch (error) {
      setSessionState(createErrorState(error, 'Session refresh failed'));
      clearSession();
    }
  }

  async function handleLogout() {
    try {
      await webApi.logout(refreshToken);
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    setAccessToken(null);
    setRefreshToken(null);
    setProfile(null);
    setWalletState(null);
    setJobsResponse({ jobs: [] });
    setSelectedJobId(null);
    setAuditBundle(null);
    writeSession(null);
  }

  async function handleCopyJoinLink() {
    if (!accessToken || !selectedJobView || typeof window === 'undefined') {
      return;
    }

    setJoinLinkState(createWorkingState('Copying contractor join link...'));

    try {
      const response = await webApi.inviteContractor(
        selectedJobView.id,
        {
          delivery: 'manual',
          frontendOrigin: window.location.origin,
        },
        accessToken,
      );
      const inviteToken = new URL(response.invite.joinUrl).searchParams.get('invite');
      if (inviteToken) {
        setSelectedInviteToken(inviteToken);
      }
      await window.navigator.clipboard.writeText(response.invite.joinUrl);
      await refreshSelectedJobContext(selectedJobView.id);
      setJoinLinkState(
        createSuccessState(
          'Invite link copied. Share it with the contractor so they can sign in with the invited email and link the bound worker wallet.',
        ),
      );
    } catch (error) {
      setJoinLinkState(createErrorState(error, 'Failed to copy contractor invite'));
    }
  }

  async function handleSendInviteEmail(regenerate = false) {
    if (!accessToken || !selectedJobView || typeof window === 'undefined') {
      return;
    }

    setJoinLinkState(
      createWorkingState(
        regenerate ? 'Regenerating and sending contractor invite...' : 'Sending contractor invite...',
      ),
    );

    try {
      const response = await webApi.inviteContractor(
        selectedJobView.id,
        {
          delivery: 'email',
          frontendOrigin: window.location.origin,
          regenerate,
        },
        accessToken,
      );
      const inviteToken = new URL(response.invite.joinUrl).searchParams.get('invite');
      if (inviteToken) {
        setSelectedInviteToken(inviteToken);
      }
      await refreshSelectedJobContext(selectedJobView.id);
      setJoinLinkState(
        createSuccessState(
          regenerate
            ? 'Invite link rotated and the updated contractor invite email was sent.'
            : 'Contractor invite email sent.',
        ),
      );
    } catch (error) {
      setJoinLinkState(createErrorState(error, 'Failed to send contractor invite'));
    }
  }

  async function handleRegenerateJoinLink() {
    if (!accessToken || !selectedJobView || typeof window === 'undefined') {
      return;
    }

    setJoinLinkState(createWorkingState('Regenerating contractor join link...'));

    try {
      const response = await webApi.inviteContractor(
        selectedJobView.id,
        {
          delivery: 'manual',
          frontendOrigin: window.location.origin,
          regenerate: true,
        },
        accessToken,
      );
      const inviteToken = new URL(response.invite.joinUrl).searchParams.get('invite');
      if (inviteToken) {
        setSelectedInviteToken(inviteToken);
      }
      await window.navigator.clipboard.writeText(response.invite.joinUrl);
      await refreshSelectedJobContext(selectedJobView.id);
      setJoinLinkState(
        createSuccessState(
          'Join link regenerated and copied. Older contractor invite links should be treated as replaced.',
        ),
      );
    } catch (error) {
      setJoinLinkState(
        createErrorState(error, 'Failed to regenerate contractor invite link'),
      );
    }
  }

  async function handleUpdateContractorEmail() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    setJoinLinkState(createWorkingState('Updating pending contractor email...'));

    try {
      await webApi.updateContractorEmail(
        selectedJobView.id,
        contractorEmailDraft,
        accessToken,
      );
      await refreshSelectedJobContext(selectedJobView.id);
      setJoinLinkState(
        createSuccessState(
          'Pending contractor email updated. Previous invite links should be considered invalid until you resend or copy the new join link.',
        ),
      );
    } catch (error) {
      setJoinLinkState(
        createErrorState(error, 'Failed to update pending contractor email'),
      );
    }
  }

  async function handleShariahToggle(nextValue: boolean) {
    if (!accessToken) {
      return;
    }

    setSessionState(createWorkingState('Updating policy preference...'));

    try {
      const updated = await webApi.setShariah(nextValue, accessToken);
      setProfile(updated);
      setSessionState(
        createSuccessState(`Shariah mode ${nextValue ? 'enabled' : 'disabled'}.`),
      );
    } catch (error) {
      setSessionState(createErrorState(error, 'Failed to update preference'));
    }
  }

  async function handleCreateChallenge() {
    if (!accessToken) {
      return;
    }

    setWalletActionState(createWorkingState('Issuing SIWE wallet-link challenge...'));

    try {
      const nextChallenge = await webApi.createWalletChallenge(
        {
          address: linkAddress,
          walletKind: 'eoa',
          chainId: Number(linkChainId),
          label: linkLabel || undefined,
        },
        accessToken,
      );
      setChallenge(nextChallenge);
      setWalletActionState(
        createSuccessState(
          'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
        ),
      );
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to issue challenge'));
    }
  }

  async function handleConnectInjectedWallet() {
    setWalletActionState(createWorkingState('Connecting injected wallet...'));

    try {
      const snapshot = await connectInjectedWallet();
      if (!snapshot.address) {
        throw new Error('Wallet did not expose an account.');
      }

      setWalletConnection({
        status: 'connected',
        address: snapshot.address,
        chainId: snapshot.chainId,
        message: 'Injected wallet connected.',
      });
      setLinkAddress(snapshot.address);
      setProvisionOwnerAddress((current) => current || snapshot.address || '');
      if (snapshot.chainId) {
        setLinkChainId(String(snapshot.chainId));
      }
      setWalletActionState(
        createSuccessState(
          'Wallet connected. You can now sign a SIWE link challenge directly.',
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect wallet';
      setWalletConnection((current) => ({
        ...current,
        status:
          current.status === 'connected' ? 'connected' : 'disconnected',
        message,
      }));
      setWalletActionState(createErrorState(new Error(message), message));
    }
  }

  async function handleLinkInjectedWallet() {
    if (!accessToken) {
      return;
    }

    setWalletActionState(
      createWorkingState(
        'Connecting wallet, creating SIWE challenge, and requesting signature...',
      ),
    );

    try {
      const snapshot = await connectInjectedWallet();
      if (!snapshot.address) {
        throw new Error('Wallet did not expose an account.');
      }

      const chainId = snapshot.chainId ?? Number(linkChainId);
      if (!Number.isInteger(chainId) || chainId <= 0) {
        throw new Error('Injected wallet did not expose a valid chain id.');
      }

      const nextChallenge = await webApi.createWalletChallenge(
        {
          address: snapshot.address,
          walletKind: 'eoa',
          chainId,
          label: linkLabel || undefined,
        },
        accessToken,
      );
      const signature = await signMessageWithInjectedWallet(
        snapshot.address,
        nextChallenge.message,
      );
      const nextWalletState = await webApi.verifyWalletChallenge(
        {
          challengeId: nextChallenge.challengeId,
          message: nextChallenge.message,
          signature,
        },
        accessToken,
      );

      setWalletConnection({
        status: 'connected',
        address: snapshot.address,
        chainId,
        message: 'Injected wallet linked successfully.',
      });
      setWalletState(nextWalletState);
      setLinkAddress(snapshot.address);
      setProvisionOwnerAddress((current) => current || snapshot.address || '');
      setLinkChainId(String(chainId));
      setWalletSignature(signature);
      setChallenge(null);
      setWalletActionState(
        createSuccessState(
          'Wallet linked from the browser wallet. Smart-account provisioning is now available.',
        ),
      );
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to link injected wallet'));
    }
  }

  async function handleVerifyWallet() {
    if (!accessToken || !challenge) {
      return;
    }

    setWalletActionState(createWorkingState('Verifying signed wallet challenge...'));

    try {
      const nextWalletState = await webApi.verifyWalletChallenge(
        {
          challengeId: challenge.challengeId,
          message: challenge.message,
          signature: walletSignature,
        },
        accessToken,
      );
      setWalletState(nextWalletState);
      setProvisionOwnerAddress((current) => current || linkAddress);
      setWalletSignature('');
      setChallenge(null);
      setWalletActionState(
        createSuccessState('Wallet linked and ready for smart-account provisioning.'),
      );
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to verify wallet'));
    }
  }

  async function handleProvisionSmartAccount() {
    if (!accessToken) {
      return;
    }

    setWalletActionState(createWorkingState('Provisioning smart account...'));

    try {
      const response: SmartAccountProvisionResponse =
        await webApi.provisionSmartAccount(
          {
            ownerAddress: provisionOwnerAddress,
            label: provisionLabel || undefined,
            setAsDefault: true,
          },
          accessToken,
        );
      setWalletState(response);
      setWalletActionState(
        createSuccessState(
          `Smart account ready. Sponsorship policy: ${response.sponsorship.policy}.`,
        ),
      );
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState(
        createErrorState(error, 'Failed to provision smart account'),
      );
    }
  }

  async function handleSetDefaultWallet(address: string) {
    if (!accessToken) {
      return;
    }

    setWalletActionState(createWorkingState('Updating default execution wallet...'));

    try {
      const response = await webApi.setDefaultWallet(address, accessToken);
      setWalletState(response);
      setWalletActionState(createSuccessState('Default execution wallet updated.'));
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to change default wallet'));
    }
  }

  async function handleCreateJob() {
    if (!accessToken) {
      return;
    }

    setJobActionState(createWorkingState('Creating job...'));

    try {
      const termsJSON = buildJobTermsJson(createJobState, milestones);
      const response = await webApi.createJob(
        {
          contractorEmail: createJobState.contractorEmail,
          workerAddress: createJobState.workerAddress,
          currencyAddress: createJobState.currencyAddress,
          title: createJobState.title,
          description: createJobState.description,
          category: createJobState.category,
          termsJSON,
        },
        accessToken,
      );
      setSelectedJobId(response.jobId);
      setCreatedJobResult({
        jobId: response.jobId,
        escrowId: response.escrowId,
        txHash: response.txHash,
      });
      setJobActionState(
        createSuccessState(
          `Job created. Escrow id ${response.escrowId} on tx ${previewHash(response.txHash)}. Next step: commit milestones or stage funding.`,
        ),
      );
      await refreshSelectedJobContext(response.jobId);
    } catch (error) {
      setJobActionState(createErrorState(error, 'Failed to create job'));
    }
  }

  async function handleJoinContract() {
    if (!accessToken || !selectedJobView || !selectedInviteToken) {
      return;
    }

    setJobActionState(createWorkingState('Joining contract...'));

    try {
      await webApi.joinContractor(
        selectedJobView.id,
        selectedInviteToken,
        accessToken,
      );
      await refreshSelectedJobContext(selectedJobView.id);
      setJobActionState(
        createSuccessState(
          'Contract joined. Worker delivery is now enabled for this session.',
        ),
      );
    } catch (error) {
      await refreshSelectedJobContext(selectedJobView.id);
      setJobActionState(createErrorState(error, 'Failed to join contract'));
    }
  }

  async function handleFundJob() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    await runLifecycleMutation({
      jobId: selectedJobView.id,
      pendingAction: {
        action: 'fund_job',
        startedAt: Date.now(),
        summary: 'Submitting escrow funding. Confirmation will appear once audit receipts refresh.',
      },
      workingMessage: 'Funding job...',
      successMessage: (response: { txHash: string }) =>
        `Funding confirmed via ${previewHash(response.txHash)}.`,
      operation: () => webApi.fundJob(selectedJobView.id, fundAmount, accessToken),
    });
  }

  async function handleSetMilestones() {
    const targetJobId = selectedJob?.job.id ?? createdJobResult?.jobId ?? null;
    await handleCommitMilestones(targetJobId);
  }

  async function handleCommitMilestones(targetJobId: string | null) {
    if (!accessToken || !targetJobId) {
      return;
    }

    if (!selectedJob || selectedJob.job.id !== targetJobId) {
      setSelectedJobId(targetJobId);
    }

    await runLifecycleMutation({
      jobId: targetJobId,
      pendingAction: {
        action: 'set_milestones',
        startedAt: Date.now(),
        summary: 'Committing milestone checkpoints. The timeline will update after audit data refreshes.',
      },
      workingMessage: 'Setting milestones...',
      successMessage: (response: { txHash: string }) =>
        `Milestones committed via ${previewHash(response.txHash)}.`,
      operation: () =>
        webApi.setMilestones(
          targetJobId,
          milestones.map((milestone) => ({
            title: milestone.title,
            deliverable: milestone.deliverable,
            amount: milestone.amount,
            dueAt: milestone.dueAt ? Number(milestone.dueAt) : undefined,
          })),
          accessToken,
        ),
    });
  }

  function handleUseMilestoneBudget() {
    if (milestoneDraftTotal <= 0) {
      return;
    }

    setFundAmount(String(milestoneDraftTotal));
    if (createdJobResult?.jobId) {
      setSelectedJobId(createdJobResult.jobId);
    }
    setJobActionState({
      kind: 'success',
      message: `Funding amount staged at ${milestoneDraftTotal}. Review the selected job and submit funding when ready.`,
    });
  }

  async function handleDeliverMilestone() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    await runLifecycleMutation({
      jobId: selectedJobView.id,
      pendingAction: {
        action: 'deliver_milestone',
        milestoneIndex: selectedMilestoneIndex,
        startedAt: Date.now(),
        summary:
          'Submitting the delivery note and evidence. Confirmation will move this milestone out of pending.',
      },
      workingMessage: 'Submitting milestone delivery...',
      successMessage: (response: { txHash: string }) =>
        `Delivery recorded via ${previewHash(response.txHash)}.`,
      operation: () =>
        webApi.deliverMilestone(
          selectedJobView.id,
          selectedMilestoneIndex,
          {
            note: deliveryNote,
            evidenceUrls: splitEvidenceUrls(deliveryEvidence),
          },
          accessToken,
        ),
    });
  }

  async function handleReleaseMilestone() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    await runLifecycleMutation({
      jobId: selectedJobView.id,
      pendingAction: {
        action: 'release_milestone',
        milestoneIndex: selectedMilestoneIndex,
        startedAt: Date.now(),
        summary: 'Submitting milestone release. The receipt panel will update after refresh.',
      },
      workingMessage: 'Releasing milestone...',
      successMessage: (response: { txHash: string }) =>
        `Release confirmed via ${previewHash(response.txHash)}.`,
      operation: () =>
        webApi.releaseMilestone(
          selectedJobView.id,
          selectedMilestoneIndex,
          accessToken,
        ),
    });
  }

  async function handleDisputeMilestone() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    await runLifecycleMutation({
      jobId: selectedJobView.id,
      pendingAction: {
        action: 'open_dispute',
        milestoneIndex: selectedMilestoneIndex,
        startedAt: Date.now(),
        summary: 'Escalating the selected milestone. Audit history will show the dispute once confirmed.',
      },
      workingMessage: 'Opening dispute...',
      successMessage: (response: { txHash: string }) =>
        `Dispute opened via ${previewHash(response.txHash)}.`,
      operation: () =>
        webApi.disputeMilestone(
          selectedJobView.id,
          selectedMilestoneIndex,
          {
            reason: disputeReason,
            evidenceUrls: splitEvidenceUrls(disputeEvidence),
          },
          accessToken,
        ),
    });
  }

  async function handleResolveMilestone() {
    if (!accessToken || !selectedJobView) {
      return;
    }

    await runLifecycleMutation({
      jobId: selectedJobView.id,
      pendingAction: {
        action: 'resolve_dispute',
        milestoneIndex: selectedMilestoneIndex,
        startedAt: Date.now(),
        summary: 'Submitting dispute resolution. The milestone timeline will refresh with the resolved outcome.',
      },
      workingMessage: 'Resolving dispute...',
      successMessage: (response: { txHash: string }) =>
        `Dispute resolved via ${previewHash(response.txHash)}.`,
      operation: () =>
        webApi.resolveMilestone(
          selectedJobView.id,
          selectedMilestoneIndex,
          {
            action: resolutionAction,
            note: resolutionNote,
          },
          accessToken,
        ),
    });
  }

  const fundJobCard =
    jobLifecycleCards.find((card) => card.action === 'fund_job') ?? null;
  const commitMilestonesCard =
    jobLifecycleCards.find((card) => card.action === 'set_milestones') ?? null;
  const deliveryCard =
    milestoneLifecycleCards.find((card) => card.action === 'deliver_milestone') ?? null;
  const releaseCard =
    milestoneLifecycleCards.find((card) => card.action === 'release_milestone') ?? null;
  const disputeCard =
    milestoneLifecycleCards.find((card) => card.action === 'open_dispute') ?? null;
  const resolveCard =
    milestoneLifecycleCards.find((card) => card.action === 'resolve_dispute') ?? null;
  const runtimeAlignment = describeRuntimeAlignment(
    webApi.baseUrl,
    runtimeProfile,
    typeof window === 'undefined' ? null : window.location.origin,
  );

  return (
    <div className={styles.console}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>{messages.console.topBarLabel}</span>
          <p className={styles.topBarMeta}>{messages.console.topBarMeta}</p>
        </div>
        <LanguageSwitcher
          className={styles.languageSwitcher}
          labelClassName={styles.languageSwitcherLabel}
          optionClassName={styles.languageSwitcherOption}
          optionActiveClassName={styles.languageSwitcherOptionActive}
        />
      </div>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{frame.eyebrow}</p>
          <h1>{frame.title}</h1>
          <p className={styles.heroCopy}>{frame.copy}</p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>{messages.console.runtime.apiBaseUrl}</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {webApi.baseUrl}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>{messages.console.runtime.backendProfile}</span>
            <strong>
              {runtimeProfile
                ? getRuntimeProfileText(runtimeProfile.profile, messages)
                : messages.common.loading}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>{messages.console.runtime.session}</span>
            <strong>
              {accessToken
                ? messages.common.authenticated
                : messages.common.signedOut}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>{messages.console.runtime.jobsInView}</span>
            <strong>{jobsResponse.jobs.length}</strong>
          </div>
        </div>
      </section>

      {showRuntime ? (
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Runtime</p>
            <h2>{messages.console.runtime.title}</h2>
          </div>
        </header>
        <div className={styles.summaryGrid}>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.profile}</span>
            <strong>
              {runtimeProfile
                ? getRuntimeProfileText(runtimeProfile.profile, messages)
                : messages.common.unavailable}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.providers}</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {runtimeProfile
                ? `${runtimeProfile.providers.emailMode}/${runtimeProfile.providers.smartAccountMode}/${runtimeProfile.providers.escrowMode}`
                : messages.common.unknown}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.arbitratorWallet}</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {previewHash(runtimeProfile?.operator.arbitratorAddress ?? undefined)}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.frontendOrigin}</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {runtimeAlignment.currentOrigin}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.corsReadiness}</span>
            <strong>{runtimeAlignment.corsLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.apiTransport}</span>
            <strong>{runtimeAlignment.transportLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.persistence}</span>
            <strong>{runtimeAlignment.persistenceLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.trustProxy}</span>
            <strong>{runtimeAlignment.trustProxyLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>{messages.console.runtime.allowedOrigins}</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {runtimeAlignment.corsOriginsLabel}
            </strong>
          </article>
        </div>
        <div className={styles.stack}>
          <StatusNotice
            message={runtimeProfile?.summary || runtimeState.message}
            messageClassName={styles.stateText}
          />
          <article className={styles.statusBanner}>
            <strong>{runtimeAlignment.corsLabel}</strong>
            <p className={styles.stateText}>{runtimeAlignment.corsMessage}</p>
          </article>
          <article className={styles.statusBanner}>
            <strong>{runtimeAlignment.transportLabel}</strong>
            <p className={styles.stateText}>{runtimeAlignment.transportMessage}</p>
          </article>
        </div>
      </section>
      ) : null}

      {showAccess ? (
      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.common.profile}</p>
              <h2>{messages.console.access.title}</h2>
            </div>
            {refreshToken ? (
              <div className={styles.inlineActions}>
                <button type="button" onClick={handleRefreshSession}>
                  {messages.console.access.refresh}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
                  {messages.console.access.logout}
                </button>
              </div>
            ) : null}
          </header>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{messages.console.access.email}</span>
              <input
                className={styles.ltrValue}
                data-ltr="true"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="client@example.com"
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="button" onClick={handleStartAuth}>
                {messages.console.access.sendOtp}
              </button>
              <p className={styles.stateText}>{startState.message}</p>
            </div>
            <label className={styles.field}>
              <span>{messages.console.access.code}</span>
              <input
                className={styles.ltrValue}
                data-ltr="true"
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
                placeholder="123456"
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="button" onClick={handleVerifyAuth}>
                {messages.console.access.verifySession}
              </button>
              <p className={styles.stateText}>{verifyState.message}</p>
            </div>
            <p className={styles.stateText}>{sessionState.message}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.common.profile}</p>
              <h2>{messages.console.profile.title}</h2>
            </div>
          </header>
          {profile ? (
            <div className={styles.stack}>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>{messages.console.profile.user}</span>
                  <strong>{profile.email}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.profile.shariahMode}</span>
                  <strong>
                    {profile.shariahMode
                      ? messages.common.enabled
                      : messages.common.disabled}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.profile.defaultExecutionWallet}</span>
                  <strong className={styles.ltrValue} data-ltr="true">
                    {profile.defaultExecutionWalletAddress || messages.common.notSet}
                  </strong>
                </article>
              </div>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => handleShariahToggle(!profile.shariahMode)}>
                  {messages.console.profile.toggleShariah}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => void refreshConsole()}>
                  {messages.console.profile.reloadAccount}
                </button>
              </div>
              <div className={styles.walletList}>
                {(walletState?.wallets ?? []).map((wallet) => (
                  <article key={wallet.address} className={styles.walletCard}>
                    <div className={styles.walletTitleRow}>
                      <strong>{wallet.label || wallet.walletKind}</strong>
                      <span>
                        {wallet.walletKind === 'smart_account'
                          ? messages.console.profile.smartAccount
                          : messages.console.profile.eoa}
                      </span>
                    </div>
                    <code className={styles.ltrValue} data-ltr="true">
                      {wallet.address}
                    </code>
                    <div className={styles.inlineActions}>
                      <button type="button" className={styles.secondaryButton} onClick={() => handleSetDefaultWallet(wallet.address)}>
                        {messages.console.profile.setDefault}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.stateText}>{walletActionState.message}</p>
            </div>
          ) : (
            <p className={styles.muted}>
              {messages.console.access.authHint}
            </p>
          )}
        </section>
      </div>
      ) : null}

      {showSetup ? (
      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.console.frames.setup.eyebrow}</p>
              <h2>{messages.console.setup.title}</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <div className={styles.summaryGrid}>
              {setupTracks.map((track) => (
                <article key={track.title}>
                  <span className={styles.metaLabel}>{track.title}</span>
                  <strong>{track.status}</strong>
                  <p className={styles.muted}>{track.body}</p>
                </article>
              ))}
            </div>
            <article className={styles.statusBanner}>
              <strong>{messages.console.setup.nextBlockerTitle}</strong>
              <p className={styles.stateText}>{setupNextBlocker}</p>
            </article>
            <div className={styles.inlineActions}>
              {!accessToken ? null : !hasLinkedEoa && walletConnection.status !== 'connected' ? (
                <button type="button" onClick={handleConnectInjectedWallet}>
                  {messages.console.wallet.connectWallet}
                </button>
              ) : !hasLinkedEoa ? (
                <button type="button" onClick={handleLinkInjectedWallet}>
                  {messages.console.wallet.linkWallet}
                </button>
              ) : !hasProvisionedDefaultWallet ? (
                <button type="button" onClick={handleProvisionSmartAccount}>
                  {messages.console.wallet.provisionSmartAccount}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void refreshConsole()}
                >
                  {messages.console.profile.reloadAccount}
                </button>
              )}
            </div>
          </div>
        </section>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.console.wallet.walletLink}</p>
              <h2>{messages.console.wallet.browserWalletHeading}</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <div className={styles.walletConnectionCard}>
              <div className={styles.walletTitleRow}>
                <strong>
                  {walletConnection.status === 'connected'
                    ? messages.console.wallet.connected
                    : walletConnection.status === 'unavailable'
                      ? messages.console.wallet.unavailable
                      : messages.console.wallet.ready}
                </strong>
                <span>
                  {walletConnection.chainId
                    ? `Chain ${walletConnection.chainId}`
                    : messages.console.wallet.chainUnknown}
                </span>
              </div>
              <code className={styles.ltrValue} data-ltr="true">
                {walletConnection.address || messages.console.wallet.noActiveAccount}
              </code>
              <p className={styles.stateText}>{walletConnection.message}</p>
              <div className={styles.inlineActions}>
                <button type="button" onClick={handleConnectInjectedWallet}>
                  {messages.console.wallet.connectWallet}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleLinkInjectedWallet}
                >
                  {messages.console.wallet.linkWallet}
                </button>
              </div>
            </div>
            <label className={styles.field}>
              <span>{messages.console.wallet.eoaAddress}</span>
              <input className={styles.ltrValue} data-ltr="true" value={linkAddress} onChange={(event) => setLinkAddress(event.target.value)} placeholder="0x..." />
            </label>
            <label className={styles.field}>
              <span>{messages.console.wallet.label}</span>
              <input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Primary signer" />
            </label>
            <label className={styles.field}>
              <span>{messages.console.wallet.chainId}</span>
              <input className={styles.ltrValue} data-ltr="true" value={linkChainId} onChange={(event) => setLinkChainId(event.target.value)} />
            </label>
            <p className={styles.muted}>
              {messages.console.wallet.fallbackHint}
            </p>
            <button type="button" onClick={handleCreateChallenge}>
              {messages.console.wallet.createChallenge}
            </button>
            {challenge ? (
              <>
                <label className={styles.field}>
                  <span>{messages.console.wallet.issuedMessage}</span>
                  <textarea className={styles.ltrValue} data-ltr="true" value={challenge.message} readOnly rows={8} />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.wallet.walletSignature}</span>
                  <textarea
                    className={styles.ltrValue}
                    data-ltr="true"
                    value={walletSignature}
                    onChange={(event) => setWalletSignature(event.target.value)}
                    placeholder="Paste the 0x-prefixed SIWE signature"
                    rows={4}
                  />
                </label>
                <button type="button" onClick={handleVerifyWallet}>
                  {messages.console.wallet.verifyLinkedWallet}
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.console.wallet.provisioning}</p>
              <h2>{messages.console.wallet.smartAccountTitle}</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{messages.console.wallet.verifiedOwnerEoa}</span>
              <input
                className={styles.ltrValue}
                data-ltr="true"
                value={provisionOwnerAddress}
                onChange={(event) => setProvisionOwnerAddress(event.target.value)}
                placeholder="0x..."
              />
            </label>
            <label className={styles.field}>
              <span>{messages.console.wallet.executionLabel}</span>
              <input
                value={provisionLabel}
                onChange={(event) => setProvisionLabel(event.target.value)}
                placeholder="Execution wallet"
              />
            </label>
            <button type="button" onClick={handleProvisionSmartAccount}>
              {messages.console.wallet.provisionSmartAccount}
            </button>
            <p className={styles.muted}>
              {messages.console.wallet.smartAccountHint}
            </p>
          </div>
        </section>
      </div>
      ) : null}

      {showComposer || showJobIndex ? (
      <div className={styles.grid}>
        {showComposer ? (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.console.composer.title}</p>
              <h2>{messages.console.composer.title}</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <div className={styles.composerRail}>
              {composerSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`${styles.composerStep} ${
                    composerStep === step.id ? styles.composerStepActive : ''
                  }`}
                  onClick={() => setComposerStep(step.id)}
                >
                  <span>{`0${index + 1}`}</span>
                  <strong>{step.label}</strong>
                  <small>{step.description}</small>
                </button>
              ))}
            </div>

            {composerStep === 'scope' ? (
              <div className={styles.composerSection}>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>{messages.console.composer.targetExperience}</span>
                    <strong>{messages.console.composer.targetExperienceValue}</strong>
                    <p className={styles.muted}>
                      {messages.console.composer.scopeHint}
                    </p>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>{messages.console.composer.draftedMilestones}</span>
                    <strong>{milestoneDraftCount}</strong>
                    <p className={styles.muted}>
                      {`${messages.console.composer.totalDraftedAmount}: ${milestoneDraftTotal || 0}`}
                    </p>
                  </article>
                </div>
                <label className={styles.field}>
                  <span>{messages.console.composer.jobTitle}</span>
                  <input
                    value={createJobState.title}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Milestone-based product implementation"
                  />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.composer.projectSummary}</span>
                  <textarea
                    value={createJobState.description}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="Describe the scope, delivery expectations, and what the worker will be paid to complete."
                  />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.composer.category}</span>
                  <select
                    value={createJobState.category}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {messages.console.composer.categories[option]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {composerStep === 'counterparty' ? (
              <div className={styles.composerSection}>
                <label className={styles.field}>
                  <span>{messages.console.composer.contractorEmail}</span>
                  <input
                    className={styles.ltrValue}
                    data-ltr="true"
                    value={createJobState.contractorEmail}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        contractorEmail: event.target.value,
                      }))
                    }
                    placeholder="contractor@example.com"
                  />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.composer.workerWallet}</span>
                  <input
                    className={styles.ltrValue}
                    data-ltr="true"
                    value={createJobState.workerAddress}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        workerAddress: event.target.value,
                      }))
                    }
                    placeholder="0x..."
                  />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.composer.settlementTokenAddress}</span>
                  <input
                    className={styles.ltrValue}
                    data-ltr="true"
                    value={createJobState.currencyAddress}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        currencyAddress: event.target.value,
                      }))
                    }
                    placeholder="0x..."
                  />
                </label>
                <div className={styles.composerSplit}>
                  <label className={styles.field}>
                    <span>{messages.console.composer.settlementAssetLabel}</span>
                    <input
                      className={styles.ltrValue}
                      data-ltr="true"
                      value={createJobState.settlementAsset}
                      onChange={(event) =>
                        setCreateJobState((current) => ({
                          ...current,
                          settlementAsset: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{messages.console.composer.settlementChain}</span>
                    <input
                      className={styles.ltrValue}
                      data-ltr="true"
                      value={createJobState.settlementChain}
                      onChange={(event) =>
                        setCreateJobState((current) => ({
                          ...current,
                          settlementChain: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>{messages.console.composer.executionWalletPosture}</span>
                    <strong>
                      {hasProvisionedDefaultWallet
                        ? messages.console.composer.readyToCreateJobs
                        : messages.console.composer.smartAccountRequired}
                    </strong>
                    <p className={styles.muted}>
                      {messages.console.wallet.smartAccountHint}
                    </p>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>{messages.console.composer.counterpartyCheck}</span>
                    <strong>
                      {createJobState.contractorEmail.trim() &&
                      createJobState.workerAddress.trim()
                        ? messages.console.composer.contractorIdentityCaptured
                        : messages.console.composer.contractorIdentityIncomplete}
                    </strong>
                    <p className={styles.muted}>
                      {messages.console.composer.counterpartyHint}
                    </p>
                  </article>
                </div>
              </div>
            ) : null}

            {composerStep === 'plan' ? (
              <div className={styles.composerSection}>
                <div className={styles.composerSplit}>
                  <label className={styles.field}>
                    <span>{messages.console.composer.reviewWindowDays}</span>
                    <input
                      className={styles.ltrValue}
                      data-ltr="true"
                      value={createJobState.reviewWindowDays}
                      onChange={(event) =>
                        setCreateJobState((current) => ({
                          ...current,
                          reviewWindowDays: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{messages.console.composer.disputeModel}</span>
                    <select
                      value={createJobState.disputeModel}
                      onChange={(event) =>
                        setCreateJobState((current) => ({
                          ...current,
                          disputeModel: event.target.value as JobComposerState['disputeModel'],
                        }))
                      }
                    >
                      <option value="operator-mediation">operator-mediation</option>
                      <option value="mutual-resolution">mutual-resolution</option>
                    </select>
                  </label>
                </div>
                <label className={styles.field}>
                  <span>{messages.console.composer.evidenceExpectation}</span>
                  <input
                    value={createJobState.evidenceExpectation}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        evidenceExpectation: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{messages.console.composer.kickoffNote}</span>
                  <textarea
                    value={createJobState.kickoffNote}
                    onChange={(event) =>
                      setCreateJobState((current) => ({
                        ...current,
                        kickoffNote: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </label>
                <div className={styles.composerSummaryCard}>
                  <div className={styles.walletTitleRow}>
                    <strong>{messages.console.composer.commercialPlan}</strong>
                    <span>{messages.console.composer.readyMilestones(milestoneDraftCount)}</span>
                  </div>
                  <p className={styles.muted}>
                    {messages.console.composer.contractorJoinHint(
                      createJobState.contractorEmail,
                      createJobState.workerAddress,
                    )}
                  </p>
                  <p className={styles.muted}>
                    {messages.console.composer.totalDraftedMilestoneAmount(
                      milestoneDraftTotal,
                    )}
                  </p>
                  <textarea className={styles.ltrValue} data-ltr="true" value={composerTermsPreview} readOnly rows={10} />
                </div>
              </div>
            ) : null}

            <div className={styles.checklist}>
              {composerChecklist.map((item) => (
                <div key={item.label} className={styles.checklistItem}>
                  <strong>
                    {item.ok
                      ? messages.console.composer.checklistReady
                      : messages.console.composer.checklistPending}
                  </strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  const index = composerSteps.findIndex((step) => step.id === composerStep);
                  setComposerStep(composerSteps[Math.max(0, index - 1)]?.id ?? 'scope');
                }}
              >
                {messages.console.composer.back}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  const index = composerSteps.findIndex((step) => step.id === composerStep);
                  setComposerStep(
                    composerSteps[Math.min(composerSteps.length - 1, index + 1)]?.id ??
                      'plan',
                  );
                }}
              >
                {messages.console.composer.next}
              </button>
              <button type="button" onClick={handleCreateJob} disabled={!canCreateJob}>
                {messages.console.composer.createGuidedJob}
              </button>
            </div>
            {createdJobResult ? (
              <div className={styles.composerSummaryCard}>
                <div className={styles.walletTitleRow}>
                  <strong>{messages.console.composer.jobCreated}</strong>
                  <span className={styles.ltrValue} data-ltr="true">
                    {previewHash(createdJobResult.txHash)}
                  </span>
                </div>
                <p className={styles.muted}>
                  Escrow id {createdJobResult.escrowId}. Use the drafted milestones and funding amount below to move directly into launch steps.
                </p>
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setSelectedJobId(createdJobResult.jobId)}
                  >
                    {messages.console.composer.reviewSelectedJob}
                  </button>
                  <button type="button" onClick={() => void handleCommitMilestones(createdJobResult.jobId)}>
                    {messages.console.composer.commitDraftedMilestones}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleUseMilestoneBudget}
                  >
                    {messages.console.composer.stageFundingFromMilestoneTotal}
                  </button>
                </div>
              </div>
            ) : null}
            <StatusNotice
              message={jobActionState.message}
              messageClassName={styles.stateText}
            />
          </div>
        </section>
        ) : null}

        {showJobIndex ? (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{messages.console.portfolio.title}</p>
              <h2>{messages.console.portfolio.title}</h2>
            </div>
          </header>
          <div className={styles.jobList}>
            {jobsResponse.jobs.length === 0 ? (
              <EmptyStateCard
                title={messages.console.portfolio.emptyTitle}
                message={messages.console.portfolio.emptyMessage}
                className={styles.timelineCard}
                messageClassName={styles.muted}
              />
            ) : (
              jobsResponse.jobs.map((entry) => (
                <button
                  key={entry.job.id}
                  type="button"
                  className={`${styles.jobRow} ${
                    selectedJobId === entry.job.id ? styles.jobRowActive : ''
                  }`}
                  onClick={() => setSelectedJobId(entry.job.id)}
                  >
                  <div>
                    <strong>{entry.job.title}</strong>
                    <p>{messages.console.composer.categories[entry.job.category as keyof typeof messages.console.composer.categories] ?? entry.job.category}</p>
                  </div>
                  <div>
                    <span>{getJobStatusLabel(entry.job.status, messages)}</span>
                    <small>
                      {entry.participantRoles
                        .map((role) => messages.console.labels.role[role])
                        .join(', ')}
                    </small>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
        ) : null}
      </div>
      ) : null}

      {showSelectedJob ? (
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>{messages.console.selectedJob.title}</p>
            <h2>{selectedJobView?.title || messages.console.selectedJob.placeholder}</h2>
          </div>
        </header>
        {selectedJobView ? (
          <div className={styles.detailGrid}>
            <div className={styles.stack}>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.status}</span>
                  <strong>{getJobStatusLabel(selectedJobView.status, messages)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.fundedAmount}</span>
                  <strong>{selectedJobView.fundedAmount || messages.common.notFunded}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.escrowId}</span>
                  <strong className={styles.ltrValue} data-ltr="true">
                    {selectedJobView.onchain.escrowId || messages.common.pending}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.updated}</span>
                  <strong>{formatDate(selectedJobView.updatedAt)}</strong>
                </article>
              </div>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.clientWallet}</span>
                  <strong className={styles.ltrValue} data-ltr="true">
                    {previewHash(selectedJobView.onchain.clientAddress)}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.contractorWallet}</span>
                  <strong className={styles.ltrValue} data-ltr="true">
                    {previewHash(selectedJobView.onchain.workerAddress)}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.contractorJoin}</span>
                  <strong>
                    {selectedContractorParticipation
                      ? messages.console.labels.contractorParticipation[
                          selectedContractorParticipation.status
                        ]
                      : messages.common.legacy}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.reviewWindow}</span>
                  <strong>
                    {reviewWindowDays !== null
                      ? messages.common.days(reviewWindowDays)
                      : messages.common.notSet}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.disputeModel}</span>
                  <strong>{disputeModel || 'operator-mediation'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.evidenceExpectation}</span>
                  <strong>
                    {evidenceExpectation || 'Delivery note plus linked evidence URLs'}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>{messages.console.selectedJob.operatorResolution}</span>
                  <strong>
                    {runtimeProfile?.operator.arbitratorAddress
                      ? previewHash(runtimeProfile.operator.arbitratorAddress)
                      : 'Configured arbitrator wallet'}
                  </strong>
                </article>
              </div>
              <div className={styles.roleBar}>
                {selectedJobRoles.length > 0 ? (
                  selectedJobRoles.map((role) => (
                    <span key={role} className={styles.roleBadge}>
                      {messages.console.labels.role[role]}
                    </span>
                  ))
                ) : (
                  <span className={styles.roleBadgeMuted}>{messages.common.observer}</span>
                )}
              </div>
              <article className={styles.timelineCard}>
                <div className={styles.walletTitleRow}>
                  <strong>{messages.console.selectedJob.contractorJoinAccess}</strong>
                  <span>{joinAccessStatusLabel}</span>
                </div>
                <p className={styles.muted}>{joinAccessMessage}</p>
                {selectedJob?.job.contractorParticipation?.contractorEmail ? (
                  <p className={styles.muted}>
                    {`${messages.console.selectedJob.pendingContractorEmail}: `}
                    {selectedJob.job.contractorParticipation.contractorEmail}
                  </p>
                ) : null}
                {canManageContractorInvite ? (
                  <div className={styles.stack}>
                    <label className={styles.field}>
                      <span>{messages.console.selectedJob.pendingContractorEmail}</span>
                      <input
                        type="email"
                        value={contractorEmailDraft}
                        onChange={(event) => setContractorEmailDraft(event.target.value)}
                      />
                    </label>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleUpdateContractorEmail}
                        disabled={
                          !contractorEmailDraft.trim() ||
                          contractorEmailDraft.trim().toLowerCase() === pendingContractorEmail
                        }
                      >
                        {messages.console.selectedJob.updateContractorEmail}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSendInviteEmail(false)}
                      >
                        {contractorInviteWasSent
                          ? messages.console.selectedJob.resendContractorInvite
                          : messages.console.selectedJob.sendContractorInvite}
                      </button>
                    </div>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleCopyJoinLink}
                      >
                        {messages.console.selectedJob.copyContractorLink}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handleRegenerateJoinLink}
                      >
                        {messages.console.selectedJob.regenerateContractorLink}
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => void handleSendInviteEmail(true)}
                      >
                        {messages.console.selectedJob.rotateAndResendContractorInvite}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className={styles.inlineActions}>
                  {selectedContractorParticipation?.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={handleJoinContract}
                      disabled={!canJoinSelectedContract}
                    >
                      {messages.console.selectedJob.joinContract}
                    </button>
                  ) : null}
                </div>
                <StatusNotice
                  message={joinLinkState.message}
                  messageClassName={styles.stateText}
                />
              </article>
              {jobActionState.message ||
              (auditState.kind === 'error' && auditState.message) ? (
                <StatusNotice
                  className={styles.statusBanner}
                  messageClassName={styles.stateText}
                  message={jobActionState.message}
                >
                  {auditState.kind === 'error' && auditState.message ? (
                    <p className={styles.stateText}>{auditState.message}</p>
                  ) : null}
                </StatusNotice>
              ) : null}
              <div className={styles.milestoneRail}>
                {selectedJobView.milestones.length === 0 ? (
                  <article className={styles.milestonePickerEmpty}>
                    <strong>{messages.console.selectedJob.noMilestonesTitle}</strong>
                    <p className={styles.muted}>
                      {messages.console.selectedJob.noMilestonesMessage}
                    </p>
                  </article>
                ) : (
                  selectedJobView.milestones.map((milestone, index) => (
                    <button
                      key={`${selectedJobView.id}-milestone-${index}`}
                      type="button"
                      className={`${styles.milestoneTile} ${
                        index === selectedMilestoneIndex ? styles.milestoneTileActive : ''
                      }`}
                      onClick={() => setSelectedMilestoneIndex(index)}
                    >
                      <div className={styles.timelineHead}>
                        <strong>{messages.common.milestoneNumber(index + 1, milestone.title)}</strong>
                        <span
                          className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                            milestone.status,
                          )}`}
                        >
                          {getMilestoneStatusLabel(milestone.status, messages)}
                        </span>
                      </div>
                      <p>{milestone.deliverable}</p>
                      <div className={styles.milestoneMetaRow}>
                        <small>{milestone.amount} USDC</small>
                        <small>
                          {milestone.dueAt
                            ? messages.common.dueAt(formatDate(milestone.dueAt))
                            : messages.common.noDueDate}
                        </small>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className={styles.workspaceStack}>
                {showClientWorkspace ? (
                  <div className={styles.actionPanel}>
                    <div className={styles.workspaceHead}>
                      <div>
                        <h3>{messages.console.selectedJob.clientWorkspace}</h3>
                        <p className={styles.muted}>
                          {messages.console.selectedJob.clientWorkspaceCopy}
                        </p>
                      </div>
                    </div>
                    {fundJobCard ? (
                      <article
                        className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                          fundJobCard.phase,
                        )}`}
                      >
                        <div className={styles.lifecycleHead}>
                          <div>
                            <h4>{fundJobCard.title}</h4>
                            <p>{fundJobCard.summary}</p>
                          </div>
                          <span className={styles.lifecycleState}>
                            {getLifecyclePhaseLabel(fundJobCard.phase, messages)}
                          </span>
                        </div>
                        <p className={styles.muted}>{fundJobCard.detail}</p>
                        <label className={styles.field}>
                          <span>{messages.console.actions.fundAmount}</span>
                          <input
                            className={styles.ltrValue}
                            data-ltr="true"
                            value={fundAmount}
                            onChange={(event) => setFundAmount(event.target.value)}
                          />
                        </label>
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            onClick={handleFundJob}
                            disabled={!isLifecycleActionEnabled(fundJobCard)}
                          >
                            {messages.console.actions.fundSelectedJob}
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={handleUseMilestoneBudget}
                          >
                            {messages.console.composer.useDraftedMilestoneTotal}
                          </button>
                        </div>
                        <div className={styles.lifecycleMeta}>
                          <small>
                            {fundJobCard.timestamp
                              ? formatDate(fundJobCard.timestamp)
                              : messages.common.noReceiptYet}
                          </small>
                          <small className={styles.ltrValue} data-ltr="true">
                            {previewHash(fundJobCard.txHash)}
                          </small>
                        </div>
                      </article>
                    ) : null}

                    {commitMilestonesCard ? (
                      <article
                        className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                          commitMilestonesCard.phase,
                        )}`}
                      >
                        <div className={styles.lifecycleHead}>
                          <div>
                            <h4>{commitMilestonesCard.title}</h4>
                            <p>{commitMilestonesCard.summary}</p>
                          </div>
                          <span className={styles.lifecycleState}>
                            {getLifecyclePhaseLabel(commitMilestonesCard.phase, messages)}
                          </span>
                        </div>
                        <p className={styles.muted}>{commitMilestonesCard.detail}</p>
                        <div className={styles.stack}>
                          <h4>{messages.console.composer.milestoneDrafting}</h4>
                          {milestones.map((milestone, index) => (
                            <div key={`draft-${index}`} className={styles.milestoneEditor}>
                              <input
                                value={milestone.title}
                                onChange={(event) =>
                                  setMilestones((current) =>
                                    current.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, title: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                placeholder="Title"
                              />
                              <input
                                className={styles.ltrValue}
                                data-ltr="true"
                                value={milestone.amount}
                                onChange={(event) =>
                                  setMilestones((current) =>
                                    current.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, amount: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                placeholder="Amount"
                              />
                              <textarea
                                value={milestone.deliverable}
                                onChange={(event) =>
                                  setMilestones((current) =>
                                    current.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, deliverable: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                placeholder="Deliverable"
                                rows={2}
                              />
                            </div>
                          ))}
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                setMilestones((current) => [
                                  ...current,
                                  {
                                    title: '',
                                    deliverable: '',
                                    amount: '',
                                    dueAt: '',
                                  },
                                ])
                              }
                              >
                              {messages.console.composer.addMilestone}
                            </button>
                            <button
                              type="button"
                              onClick={handleSetMilestones}
                              disabled={!isLifecycleActionEnabled(commitMilestonesCard)}
                            >
                              {messages.console.composer.commitMilestones}
                            </button>
                          </div>
                        </div>
                        <div className={styles.lifecycleMeta}>
                          <small>
                            {commitMilestonesCard.timestamp
                              ? formatDate(commitMilestonesCard.timestamp)
                              : messages.common.noReceiptYet}
                          </small>
                          <small className={styles.ltrValue} data-ltr="true">
                            {previewHash(commitMilestonesCard.txHash)}
                          </small>
                        </div>
                      </article>
                    ) : null}

                    {releaseCard ? (
                      <article
                        className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                          releaseCard.phase,
                        )}`}
                      >
                        <div className={styles.lifecycleHead}>
                          <div>
                            <h4>{releaseCard.title}</h4>
                            <p>{releaseCard.summary}</p>
                          </div>
                          <span className={styles.lifecycleState}>
                            {getLifecyclePhaseLabel(releaseCard.phase, messages)}
                          </span>
                        </div>
                        <p className={styles.muted}>{releaseCard.detail}</p>
                        <button
                          type="button"
                          onClick={handleReleaseMilestone}
                          disabled={!isLifecycleActionEnabled(releaseCard)}
                        >
                          {messages.console.actions.releaseSelectedMilestone}
                        </button>
                        <div className={styles.lifecycleMeta}>
                          <small>
                            {releaseCard.timestamp
                              ? formatDate(releaseCard.timestamp)
                              : messages.common.noReceiptYet}
                          </small>
                          <small className={styles.ltrValue} data-ltr="true">
                            {previewHash(releaseCard.txHash)}
                          </small>
                        </div>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {view === 'deliver' && !isWorkerForSelectedJob ? (
                  <EmptyStateCard
                    title={messages.console.emptyStates.contractorWalletRequired}
                    message={
                      accessToken
                        ? messages.console.messages.deliveryRequiresWallet(
                            selectedJobView.onchain.workerAddress,
                          )
                        : messages.console.messages.signInForDelivery
                    }
                    className={styles.timelineCard}
                    messageClassName={styles.muted}
                  />
                ) : null}

                {showWorkerWorkspace ? (
                  <div className={styles.actionPanel}>
                    <div className={styles.workspaceHead}>
                      <div>
                        <h3>{messages.console.selectedJob.workerWorkspace}</h3>
                        <p className={styles.muted}>
                          {messages.console.selectedJob.workerWorkspaceCopy}
                        </p>
                      </div>
                    </div>
                    {deliveryCard ? (
                      <article
                        className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                          deliveryCard.phase,
                        )}`}
                      >
                        <div className={styles.lifecycleHead}>
                          <div>
                            <h4>{deliveryCard.title}</h4>
                            <p>{deliveryCard.summary}</p>
                          </div>
                          <span className={styles.lifecycleState}>
                            {getLifecyclePhaseLabel(deliveryCard.phase, messages)}
                          </span>
                        </div>
                        <p className={styles.muted}>{deliveryCard.detail}</p>
                        <label className={styles.field}>
                          <span>{messages.console.selectedJob.deliveryNote}</span>
                          <textarea
                            value={deliveryNote}
                            onChange={(event) => setDeliveryNote(event.target.value)}
                            rows={3}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{messages.console.actions.evidenceUrls}</span>
                          <textarea
                            className={styles.ltrValue}
                            data-ltr="true"
                            value={deliveryEvidence}
                            onChange={(event) => setDeliveryEvidence(event.target.value)}
                            rows={2}
                            placeholder="https://... https://..."
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleDeliverMilestone}
                          disabled={!isLifecycleActionEnabled(deliveryCard)}
                        >
                          {messages.console.actions.deliverSelectedMilestone}
                        </button>
                        <div className={styles.lifecycleMeta}>
                          <small>
                            {deliveryCard.timestamp
                              ? formatDate(deliveryCard.timestamp)
                              : messages.common.noReceiptYet}
                          </small>
                          <small className={styles.ltrValue} data-ltr="true">
                            {previewHash(deliveryCard.txHash)}
                          </small>
                        </div>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {view === 'dispute' && !isClientForSelectedJob ? (
                  <EmptyStateCard
                    title={messages.console.emptyStates.clientWalletRequired}
                    message={
                      controlsSelectedClientWallet
                        ? messages.console.messages.clientRoleRefresh
                        : accessToken
                          ? messages.console.messages.disputeRequiresWallet(
                              selectedJobView.onchain.clientAddress,
                            )
                          : messages.console.messages.signInForDispute
                    }
                    className={styles.timelineCard}
                    messageClassName={styles.muted}
                  />
                ) : null}

                {showSharedDispute ? (
                <div className={styles.actionPanel}>
                  <div className={styles.workspaceHead}>
                    <div>
                      <h3>{messages.console.selectedJob.sharedDisputePosture}</h3>
                      <p className={styles.muted}>
                        {messages.console.selectedJob.sharedDisputeCopy}
                      </p>
                    </div>
                  </div>
                  <div className={styles.selectedMilestoneHeader}>
                    <div>
                      <span className={styles.metaLabel}>{messages.console.selectedJob.selectedMilestone}</span>
                      <strong>
                        {selectedMilestone
                          ? messages.common.milestoneNumber(
                              selectedMilestoneIndex + 1,
                              selectedMilestone.title,
                            )
                          : messages.console.selectedJob.noMilestoneSelected}
                      </strong>
                    </div>
                    {selectedMilestone ? (
                      <span
                        className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                          selectedMilestone.status,
                        )}`}
                      >
                        {getMilestoneStatusLabel(selectedMilestone.status, messages)}
                      </span>
                    ) : null}
                  </div>
                  {disputeCard ? (
                    <article
                      className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                        disputeCard.phase,
                      )}`}
                    >
                      <div className={styles.lifecycleHead}>
                        <div>
                          <h4>{disputeCard.title}</h4>
                          <p>{disputeCard.summary}</p>
                        </div>
                        <span className={styles.lifecycleState}>
                          {getLifecyclePhaseLabel(disputeCard.phase, messages)}
                        </span>
                      </div>
                      <p className={styles.muted}>{disputeCard.detail}</p>
                      {!isClientForSelectedJob ? (
                        <p className={styles.muted}>
                          {messages.console.messages.onlyClientCanDispute}
                        </p>
                      ) : null}
                      <label className={styles.field}>
                        <span>{messages.console.selectedJob.disputeReason}</span>
                        <textarea
                          value={disputeReason}
                          onChange={(event) => setDisputeReason(event.target.value)}
                          rows={3}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{messages.console.actions.disputeEvidenceUrls}</span>
                        <textarea
                          className={styles.ltrValue}
                          data-ltr="true"
                          value={disputeEvidence}
                          onChange={(event) => setDisputeEvidence(event.target.value)}
                          rows={2}
                          placeholder="https://... https://..."
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDisputeMilestone}
                        disabled={
                          !isClientForSelectedJob ||
                          !isLifecycleActionEnabled(disputeCard)
                        }
                      >
                        {messages.console.actions.openDispute}
                      </button>
                      <div className={styles.lifecycleMeta}>
                        <small>
                          {disputeCard.timestamp
                            ? formatDate(disputeCard.timestamp)
                            : messages.common.noReceiptYet}
                        </small>
                        <small className={styles.ltrValue} data-ltr="true">
                          {previewHash(disputeCard.txHash)}
                        </small>
                      </div>
                    </article>
                  ) : null}
                </div>
                ) : null}

                {showOperatorPosture ? (
                <div className={styles.actionPanel}>
                  <div className={styles.workspaceHead}>
                    <div>
                      <h3>{messages.console.selectedJob.operatorPosture}</h3>
                      <p className={styles.muted}>
                        {messages.console.selectedJob.operatorPostureCopy}
                      </p>
                    </div>
                  </div>
                  {resolveCard ? (
                    <article
                      className={`${styles.lifecycleCard} ${getLifecyclePhaseClassName(
                        resolveCard.phase,
                      )}`}
                    >
                      <div className={styles.lifecycleHead}>
                        <div>
                          <h4>{resolveCard.title}</h4>
                          <p>{resolveCard.summary}</p>
                        </div>
                        <span className={styles.lifecycleState}>
                          {getLifecyclePhaseLabel(resolveCard.phase, messages)}
                        </span>
                      </div>
                      <p className={styles.muted}>{resolveCard.detail}</p>
                      <label className={styles.field}>
                        <span>{messages.console.actions.resolutionAction}</span>
                        <select
                          value={resolutionAction}
                          onChange={(event) =>
                            setResolutionAction(event.target.value as 'release' | 'refund')
                          }
                        >
                          <option value="release">
                            {messages.console.labels.resolutionAction.release}
                          </option>
                          <option value="refund">
                            {messages.console.labels.resolutionAction.refund}
                          </option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>{messages.console.actions.resolutionNote}</span>
                        <textarea
                          value={resolutionNote}
                          onChange={(event) => setResolutionNote(event.target.value)}
                          rows={3}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleResolveMilestone}
                        disabled={!isLifecycleActionEnabled(resolveCard)}
                      >
                        {messages.console.actions.resolveDispute}
                      </button>
                      <div className={styles.lifecycleMeta}>
                        <small>
                          {resolveCard.timestamp
                            ? formatDate(resolveCard.timestamp)
                            : messages.common.noReceiptYet}
                        </small>
                        <small className={styles.ltrValue} data-ltr="true">
                          {previewHash(resolveCard.txHash)}
                        </small>
                      </div>
                    </article>
                  ) : null}
                </div>
                ) : null}
              </div>
            </div>

            <div className={styles.stack}>
              <div className={styles.auditPanel}>
                <div className={styles.lifecycleHead}>
                  <div>
                    <h3>{messages.console.selectedJob.selectedMilestone}</h3>
                    <p className={styles.muted}>
                      {messages.console.selectedJob.selectedMilestoneContext}
                    </p>
                  </div>
                  {selectedMilestone ? (
                    <span
                      className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                        selectedMilestone.status,
                      )}`}
                    >
                      {getMilestoneStatusLabel(selectedMilestone.status, messages)}
                    </span>
                  ) : null}
                </div>
                {selectedMilestone ? (
                  <div className={styles.stack}>
                    <div className={styles.summaryGrid}>
                      <article>
                        <span className={styles.metaLabel}>{messages.console.selectedJob.amount}</span>
                        <strong>{selectedMilestone.amount} USDC</strong>
                      </article>
                      <article>
                        <span className={styles.metaLabel}>{messages.console.selectedJob.due}</span>
                        <strong>
                          {selectedMilestone.dueAt
                            ? formatDate(selectedMilestone.dueAt)
                            : messages.common.notSet}
                        </strong>
                      </article>
                    </div>
                    <p>{selectedMilestone.deliverable}</p>
                    {selectedMilestone.deliveryNote ? (
                      <article className={styles.timelineCard}>
                        <strong>{messages.console.selectedJob.deliveryNote}</strong>
                        <p>{selectedMilestone.deliveryNote}</p>
                      </article>
                    ) : null}
                    {selectedMilestone.deliveryEvidenceUrls?.length ? (
                      <article className={styles.timelineCard}>
                        <strong>{messages.console.selectedJob.evidenceLinks}</strong>
                        <div className={styles.linkList}>
                          {selectedMilestone.deliveryEvidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" data-ltr="true">
                              {url}
                            </a>
                          ))}
                        </div>
                      </article>
                    ) : null}
                    {selectedMilestone.disputeReason ? (
                      <article className={styles.timelineCard}>
                        <strong>{messages.console.selectedJob.disputeReason}</strong>
                        <p>{selectedMilestone.disputeReason}</p>
                      </article>
                    ) : null}
                    {selectedMilestone.disputeEvidenceUrls?.length ? (
                      <article className={styles.timelineCard}>
                        <strong>{messages.console.selectedJob.disputeEvidenceLinks}</strong>
                        <div className={styles.linkList}>
                          {selectedMilestone.disputeEvidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" data-ltr="true">
                              {url}
                            </a>
                          ))}
                        </div>
                      </article>
                    ) : null}
                    {selectedMilestone.resolutionAction ? (
                      <article className={styles.timelineCard}>
                        <strong>{messages.console.selectedJob.resolution}</strong>
                        <p>
                          {
                            messages.console.labels.resolutionAction[
                              selectedMilestone.resolutionAction
                            ]
                          }
                          {selectedMilestone.resolutionNote
                            ? `: ${selectedMilestone.resolutionNote}`
                            : ''}
                        </p>
                      </article>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.muted}>
                    {messages.console.selectedJob.noMilestoneContext}
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>{messages.console.selectedJob.milestoneTimeline}</h3>
                {selectedMilestoneTimeline.length > 0 ? (
                  selectedMilestoneTimeline.map((entry) => (
                    <article key={`${entry.label}-${entry.at}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{entry.label}</strong>
                        <span>{formatDate(entry.at)}</span>
                      </div>
                      <p>{entry.detail}</p>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    {messages.console.selectedJob.noMilestoneTimeline}
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>{messages.console.selectedJob.milestoneAuditTrail}</h3>
                {selectedMilestoneAuditEvents.length > 0 ? (
                  selectedMilestoneAuditEvents.map((event, index) => (
                    <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{event.type}</strong>
                        <span>{formatDate(event.at)}</span>
                      </div>
                      <pre className={styles.ltrValue} data-ltr="true">
                        {formatJson(event.payload)}
                      </pre>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    {messages.console.selectedJob.noMilestoneAudit}
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>{messages.console.selectedJob.milestoneReceipts}</h3>
                {selectedMilestoneExecutions.length > 0 ? (
                  selectedMilestoneExecutions.map((execution) => (
                    <article key={execution.id} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{execution.action}</strong>
                        <span>{execution.status}</span>
                      </div>
                      <p className={styles.ltrValue} data-ltr="true">
                        {execution.actorAddress}
                      </p>
                      <small>{formatDate(execution.confirmedAt ?? execution.submittedAt)}</small>
                      <small className={styles.ltrValue} data-ltr="true">
                        {previewHash(execution.txHash)}
                      </small>
                      {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    {messages.console.selectedJob.noMilestoneReceipts}
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>{messages.console.selectedJob.jobLaunchHistory}</h3>
                {jobLevelAuditEvents.length > 0 ? (
                  jobLevelAuditEvents.map((event, index) => (
                    <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{event.type}</strong>
                        <span>{formatDate(event.at)}</span>
                      </div>
                      <pre className={styles.ltrValue} data-ltr="true">
                        {formatJson(event.payload)}
                      </pre>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>{messages.console.selectedJob.noJobAudit}</p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Job launch receipts</h3>
                {jobLevelExecutions.length > 0 ? (
                  jobLevelExecutions.map((execution) => (
                    <article key={execution.id} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{execution.action}</strong>
                        <span>{execution.status}</span>
                      </div>
                      <p className={styles.ltrValue} data-ltr="true">
                        {execution.actorAddress}
                      </p>
                      <small>{formatDate(execution.confirmedAt ?? execution.submittedAt)}</small>
                      <small className={styles.ltrValue} data-ltr="true">
                        {previewHash(execution.txHash)}
                      </small>
                      {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>{messages.console.selectedJob.noJobReceipts}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyStateCard
            title={messages.console.selectedJob.placeholder}
            message={messages.console.selectedJob.selectJobMessage}
            className={styles.timelineCard}
            messageClassName={styles.muted}
          />
        )}
      </section>
      ) : null}
    </div>
  );
}
