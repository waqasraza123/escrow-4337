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
];

const composerSteps: Array<{
  id: ComposerStep;
  label: string;
  description: string;
}> = [
  {
    id: 'scope',
    label: 'Scope',
    description: 'Define the work, category, and expected outcome.',
  },
  {
    id: 'counterparty',
    label: 'Counterparty',
    description: 'Set the worker wallet and settlement posture.',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Review milestones, commercial terms, and launch readiness.',
  },
];

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

function getLifecyclePhaseLabel(phase: LifecycleCard['phase']) {
  switch (phase) {
    case 'ready':
      return 'Ready';
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'failed':
      return 'Failed';
    case 'blocked':
      return 'Blocked';
  }
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

function getRuntimeProfileLabel(profile: RuntimeProfile['profile']) {
  switch (profile) {
    case 'deployment-like':
      return 'Deployment-like';
    case 'local-mock':
      return 'Local mock';
    case 'mixed':
      return 'Mixed';
  }
}

function getConsoleFrame(view: EscrowConsoleView) {
  switch (view) {
    case 'sign-in':
      return {
        eyebrow: 'Sign In',
        title: 'Start a milestone escrow session.',
        copy:
          'Use OTP sign-in first. The app will then restore your escrow access, linked wallets, and contract actions.',
      };
    case 'setup':
      return {
        eyebrow: 'Setup',
        title: 'Link the right wallet before money moves.',
        copy:
          'Clients need a provisioned smart account to create contracts. Contractors need the exact delivery wallet linked before they can join and deliver.',
      };
    case 'new-contract':
      return {
        eyebrow: 'New Contract',
        title: 'Create one milestone-based service contract.',
        copy:
          'Bind the contractor wallet up front, define the milestones in plain language, and review the release and dispute model before funding.',
      };
    case 'contract':
      return {
        eyebrow: 'Contract',
        title: 'Review one contract with the exact actor rules.',
        copy:
          'This shared link can be opened by the client or contractor. Actions unlock only when the signed-in account controls the required wallet.',
      };
    case 'deliver':
      return {
        eyebrow: 'Deliver',
        title: 'Submit milestone delivery with explicit evidence.',
        copy:
          'The contractor joins through the shared contract link, signs in, links the bound wallet, and delivers against the funded milestone.',
      };
    case 'dispute':
      return {
        eyebrow: 'Dispute',
        title: 'Escalate one milestone with a clear evidence trail.',
        copy:
          'Disputes stay milestone-scoped. The client records the issue and supporting links, and the operator resolves from the visible audit trail.',
      };
    case 'overview':
    default:
      return {
        eyebrow: 'Client Console',
        title: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
        copy:
          'This surface is wired to the real API modules already in the repo: auth, SIWE wallet linking, smart-account provisioning, job creation, milestone actions, and public audit review.',
      };
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

export function EscrowConsole({
  view = 'overview',
  initialJobId = null,
}: EscrowConsoleProps) {
  const frame = getConsoleFrame(view);
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
  const controlsSelectedWorkerWallet = Boolean(
    selectedJobView && linkedWalletAddresses.has(selectedJobView.onchain.workerAddress),
  );
  const controlsSelectedClientWallet = Boolean(
    selectedJobView && linkedWalletAddresses.has(selectedJobView.onchain.clientAddress),
  );
  const selectedContractorParticipation = selectedJobView?.contractorParticipation ?? null;
  const pendingContractorEmail =
    selectedJob?.job.contractorParticipation?.contractorEmail?.trim().toLowerCase() ??
    null;
  const currentUserEmail = profile?.email?.trim().toLowerCase() ?? null;
  const currentUserMatchesPendingContractorEmail = Boolean(
    currentUserEmail &&
      pendingContractorEmail &&
      currentUserEmail === pendingContractorEmail,
  );
  const canJoinSelectedContract =
    Boolean(accessToken) &&
    Boolean(selectedJobView) &&
    !isClientForSelectedJob &&
    selectedContractorParticipation?.status === 'pending' &&
    controlsSelectedWorkerWallet;
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

  const [createJobState, setCreateJobState] = useState<JobComposerState>(
    createInitialJobComposerState,
  );

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
  const composerChecklist = useMemo(
    () => [
      {
        label: 'Scope is defined',
        ok: Boolean(
          createJobState.title.trim() &&
            createJobState.description.trim() &&
            createJobState.category.trim(),
        ),
      },
      {
        label: 'Contractor email is set',
        ok: Boolean(createJobState.contractorEmail.trim()),
      },
      {
        label: 'Worker wallet is set',
        ok: Boolean(createJobState.workerAddress.trim()),
      },
      {
        label: 'Settlement token address is set',
        ok: Boolean(createJobState.currencyAddress.trim()),
      },
      {
        label: 'Default execution wallet is a provisioned smart account',
        ok: hasProvisionedDefaultWallet,
      },
      {
        label: 'At least one milestone draft is ready',
        ok: milestoneDraftCount > 0,
      },
    ],
    [createJobState, hasProvisionedDefaultWallet, milestoneDraftCount],
  );
  const canCreateJob = composerChecklist.every((item) => item.ok);
  const jobLifecycleCards = useMemo(
    () =>
      selectedJobView
        ? buildJobLifecycleCards({
            job: selectedJobView,
            executions: jobExecutions,
            pendingAction: pendingLifecycleAction,
          })
        : [],
    [jobExecutions, pendingLifecycleAction, selectedJobView],
  );
  const milestoneLifecycleCards = useMemo(
    () =>
      selectedJobView
        ? buildMilestoneLifecycleCards({
            job: selectedJobView,
            milestoneIndex: selectedMilestoneIndex,
            executions: jobExecutions,
            pendingAction: pendingLifecycleAction,
          })
        : [],
    [
      jobExecutions,
      pendingLifecycleAction,
      selectedJobView,
      selectedMilestoneIndex,
    ],
  );
  const selectedMilestoneTimeline = useMemo(
    () => buildMilestoneTimelineEntries(selectedMilestone),
    [selectedMilestone],
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
  }, [selectedJobId]);

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
    if (!selectedJobView || typeof window === 'undefined') {
      return;
    }

    const joinLink = `${window.location.origin}/app/contracts/${selectedJobView.id}`;
    setJoinLinkState(createWorkingState('Copying contractor join link...'));

    try {
      await window.navigator.clipboard.writeText(joinLink);
      setJoinLinkState(
        createSuccessState(
          'Join link copied. Share it with the contractor so they can sign in and link the bound worker wallet.',
        ),
      );
    } catch (error) {
      setJoinLinkState(
        createErrorState(
          error,
          `Copy failed. Share this link manually: ${joinLink}`,
        ),
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
    if (!accessToken || !selectedJobView) {
      return;
    }

    setJobActionState(createWorkingState('Joining contract...'));

    try {
      await webApi.joinContractor(selectedJobView.id, accessToken);
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
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{frame.eyebrow}</p>
          <h1>{frame.title}</h1>
          <p className={styles.heroCopy}>{frame.copy}</p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>API base URL</span>
            <strong>{webApi.baseUrl}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Backend profile</span>
            <strong>
              {runtimeProfile
                ? getRuntimeProfileLabel(runtimeProfile.profile)
                : 'Loading'}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Session</span>
            <strong>{accessToken ? 'Authenticated' : 'Signed out'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Jobs in view</span>
            <strong>{jobsResponse.jobs.length}</strong>
          </div>
        </div>
      </section>

      {showRuntime ? (
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Runtime</p>
            <h2>Backend profile validation</h2>
          </div>
        </header>
        <div className={styles.summaryGrid}>
          <article>
            <span className={styles.metaLabel}>Profile</span>
            <strong>
              {runtimeProfile
                ? getRuntimeProfileLabel(runtimeProfile.profile)
                : 'Unavailable'}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Providers</span>
            <strong>
              {runtimeProfile
                ? `${runtimeProfile.providers.emailMode}/${runtimeProfile.providers.smartAccountMode}/${runtimeProfile.providers.escrowMode}`
                : 'Unknown'}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Arbitrator wallet</span>
            <strong>
              {previewHash(runtimeProfile?.operator.arbitratorAddress ?? undefined)}
            </strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Frontend origin</span>
            <strong>{runtimeAlignment.currentOrigin}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>CORS readiness</span>
            <strong>{runtimeAlignment.corsLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>API transport</span>
            <strong>{runtimeAlignment.transportLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Persistence</span>
            <strong>{runtimeAlignment.persistenceLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Trust proxy</span>
            <strong>{runtimeAlignment.trustProxyLabel}</strong>
          </article>
          <article>
            <span className={styles.metaLabel}>Allowed origins</span>
            <strong>{runtimeAlignment.corsOriginsLabel}</strong>
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
              <p className={styles.panelEyebrow}>Access</p>
              <h2>Email OTP session</h2>
            </div>
            {refreshToken ? (
              <div className={styles.inlineActions}>
                <button type="button" onClick={handleRefreshSession}>
                  Refresh
                </button>
                <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : null}
          </header>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="client@example.com"
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="button" onClick={handleStartAuth}>
                Send OTP
              </button>
              <p className={styles.stateText}>{startState.message}</p>
            </div>
            <label className={styles.field}>
              <span>Verification code</span>
              <input
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
                placeholder="123456"
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="button" onClick={handleVerifyAuth}>
                Verify session
              </button>
              <p className={styles.stateText}>{verifyState.message}</p>
            </div>
            <p className={styles.stateText}>{sessionState.message}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Profile</p>
              <h2>Account policy and wallet state</h2>
            </div>
          </header>
          {profile ? (
            <div className={styles.stack}>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>User</span>
                  <strong>{profile.email}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Shariah mode</span>
                  <strong>{profile.shariahMode ? 'Enabled' : 'Disabled'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Default execution wallet</span>
                  <strong>{profile.defaultExecutionWalletAddress || 'Not set'}</strong>
                </article>
              </div>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => handleShariahToggle(!profile.shariahMode)}>
                  Toggle Shariah mode
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => void refreshConsole()}>
                  Reload account
                </button>
              </div>
              <div className={styles.walletList}>
                {(walletState?.wallets ?? []).map((wallet) => (
                  <article key={wallet.address} className={styles.walletCard}>
                    <div className={styles.walletTitleRow}>
                      <strong>{wallet.label || wallet.walletKind}</strong>
                      <span>{wallet.walletKind === 'smart_account' ? 'Smart account' : 'EOA'}</span>
                    </div>
                    <code>{wallet.address}</code>
                    <div className={styles.inlineActions}>
                      <button type="button" className={styles.secondaryButton} onClick={() => handleSetDefaultWallet(wallet.address)}>
                        Set default
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className={styles.stateText}>{walletActionState.message}</p>
            </div>
          ) : (
            <p className={styles.muted}>
              Authenticate first. The console will then load your profile, wallets, and jobs.
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
              <p className={styles.panelEyebrow}>Wallet Link</p>
              <h2>Browser wallet onboarding</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <div className={styles.walletConnectionCard}>
              <div className={styles.walletTitleRow}>
                <strong>
                  {walletConnection.status === 'connected'
                    ? 'Injected wallet connected'
                    : walletConnection.status === 'unavailable'
                      ? 'No injected wallet detected'
                      : 'Injected wallet ready to connect'}
                </strong>
                <span>
                  {walletConnection.chainId
                    ? `Chain ${walletConnection.chainId}`
                    : 'Chain unknown'}
                </span>
              </div>
              <code>{walletConnection.address || 'No active account'}</code>
              <p className={styles.stateText}>{walletConnection.message}</p>
              <div className={styles.inlineActions}>
                <button type="button" onClick={handleConnectInjectedWallet}>
                  Connect injected wallet
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleLinkInjectedWallet}
                >
                  Link connected wallet
                </button>
              </div>
            </div>
            <label className={styles.field}>
              <span>EOA address</span>
              <input value={linkAddress} onChange={(event) => setLinkAddress(event.target.value)} placeholder="0x..." />
            </label>
            <label className={styles.field}>
              <span>Label</span>
              <input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Primary signer" />
            </label>
            <label className={styles.field}>
              <span>Chain id</span>
              <input value={linkChainId} onChange={(event) => setLinkChainId(event.target.value)} />
            </label>
            <p className={styles.muted}>
              Use the injected-wallet buttons for the native browser flow. The manual challenge path remains available as a fallback for wallets that do not expose `personal_sign`.
            </p>
            <button type="button" onClick={handleCreateChallenge}>
              Create SIWE challenge
            </button>
            {challenge ? (
              <>
                <label className={styles.field}>
                  <span>Issued message</span>
                  <textarea value={challenge.message} readOnly rows={8} />
                </label>
                <label className={styles.field}>
                  <span>Wallet signature</span>
                  <textarea
                    value={walletSignature}
                    onChange={(event) => setWalletSignature(event.target.value)}
                    placeholder="Paste the 0x-prefixed SIWE signature"
                    rows={4}
                  />
                </label>
                <button type="button" onClick={handleVerifyWallet}>
                  Verify linked wallet
                </button>
              </>
            ) : null}
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Provisioning</p>
              <h2>Smart-account execution wallet</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>Verified owner EOA</span>
              <input
                value={provisionOwnerAddress}
                onChange={(event) => setProvisionOwnerAddress(event.target.value)}
                placeholder="0x..."
              />
            </label>
            <label className={styles.field}>
              <span>Execution label</span>
              <input
                value={provisionLabel}
                onChange={(event) => setProvisionLabel(event.target.value)}
                placeholder="Execution wallet"
              />
            </label>
            <button type="button" onClick={handleProvisionSmartAccount}>
              Provision smart account
            </button>
            <p className={styles.muted}>
              The API requires a SIWE-verified owner wallet before job creation can use a sponsored smart account.
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
              <p className={styles.panelEyebrow}>Compose</p>
              <h2>Guided client job authoring</h2>
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
                    <span className={styles.metaLabel}>Target experience</span>
                    <strong>Productized escrow launch</strong>
                    <p className={styles.muted}>
                      Write the scope in business language first. The API terms will be generated from the structured plan below.
                    </p>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Drafted milestones</span>
                    <strong>{milestoneDraftCount}</strong>
                    <p className={styles.muted}>
                      Total drafted amount: {milestoneDraftTotal || 0}
                    </p>
                  </article>
                </div>
                <label className={styles.field}>
                  <span>Job title</span>
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
                  <span>Project summary</span>
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
                  <span>Category</span>
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
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {composerStep === 'counterparty' ? (
              <div className={styles.composerSection}>
                <label className={styles.field}>
                  <span>Contractor email</span>
                  <input
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
                  <span>Worker wallet</span>
                  <input
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
                  <span>Settlement token address</span>
                  <input
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
                    <span>Settlement asset label</span>
                    <input
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
                    <span>Settlement chain</span>
                    <input
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
                    <span className={styles.metaLabel}>Execution wallet posture</span>
                    <strong>
                      {hasProvisionedDefaultWallet
                        ? 'Ready to create jobs'
                        : 'Smart account required'}
                    </strong>
                    <p className={styles.muted}>
                      Client job creation requires a default smart account execution wallet.
                    </p>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Counterparty check</span>
                    <strong>
                      {createJobState.contractorEmail.trim() &&
                      createJobState.workerAddress.trim()
                        ? 'Contractor identity captured'
                        : 'Contractor identity incomplete'}
                    </strong>
                    <p className={styles.muted}>
                      The contractor must join with this email and this worker wallet.
                    </p>
                  </article>
                </div>
              </div>
            ) : null}

            {composerStep === 'plan' ? (
              <div className={styles.composerSection}>
                <div className={styles.composerSplit}>
                  <label className={styles.field}>
                    <span>Review window in days</span>
                    <input
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
                    <span>Dispute model</span>
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
                  <span>Evidence expectation</span>
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
                  <span>Kickoff note</span>
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
                    <strong>Commercial plan</strong>
                    <span>{milestoneDraftCount} ready milestones</span>
                  </div>
                  <p className={styles.muted}>
                    Contractor join requires {createJobState.contractorEmail || 'the pending contractor email'} and {createJobState.workerAddress || 'the bound worker wallet'} from the shared contract link.
                  </p>
                  <p className={styles.muted}>
                    Total drafted milestone amount: {milestoneDraftTotal || 0}
                  </p>
                  <textarea value={composerTermsPreview} readOnly rows={10} />
                </div>
              </div>
            ) : null}

            <div className={styles.checklist}>
              {composerChecklist.map((item) => (
                <div key={item.label} className={styles.checklistItem}>
                  <strong>{item.ok ? 'Ready' : 'Pending'}</strong>
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
                Back
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
                Next
              </button>
              <button type="button" onClick={handleCreateJob} disabled={!canCreateJob}>
                Create guided job
              </button>
            </div>
            {createdJobResult ? (
              <div className={styles.composerSummaryCard}>
                <div className={styles.walletTitleRow}>
                  <strong>Job created</strong>
                  <span>{previewHash(createdJobResult.txHash)}</span>
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
                    Review selected job
                  </button>
                  <button type="button" onClick={() => void handleCommitMilestones(createdJobResult.jobId)}>
                    Commit drafted milestones
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleUseMilestoneBudget}
                  >
                    Stage funding from milestone total
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
              <p className={styles.panelEyebrow}>Portfolio</p>
              <h2>Your job index</h2>
            </div>
          </header>
          <div className={styles.jobList}>
            {jobsResponse.jobs.length === 0 ? (
              <EmptyStateCard
                title="No jobs available"
                message="No jobs are available yet for the current identity."
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
                    <p>{entry.job.category}</p>
                  </div>
                  <div>
                    <span>{entry.job.status}</span>
                    <small>{entry.participantRoles.join(', ')}</small>
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
            <p className={styles.panelEyebrow}>Selected Job</p>
            <h2>{selectedJobView?.title || 'Select a job to manage lifecycle actions'}</h2>
          </div>
        </header>
        {selectedJobView ? (
          <div className={styles.detailGrid}>
            <div className={styles.stack}>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>Status</span>
                  <strong>{selectedJobView.status}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Funded amount</span>
                  <strong>{selectedJobView.fundedAmount || 'Not funded'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Escrow id</span>
                  <strong>{selectedJobView.onchain.escrowId || 'Pending'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Updated</span>
                  <strong>{formatTimestamp(selectedJobView.updatedAt)}</strong>
                </article>
              </div>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>Client wallet</span>
                  <strong>{previewHash(selectedJobView.onchain.clientAddress)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Contractor wallet</span>
                  <strong>{previewHash(selectedJobView.onchain.workerAddress)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Contractor join</span>
                  <strong>{selectedContractorParticipation?.status || 'legacy'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Review window</span>
                  <strong>
                    {reviewWindowDays !== null ? `${reviewWindowDays} days` : 'Not set'}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Dispute model</span>
                  <strong>{disputeModel || 'operator-mediation'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Evidence expectation</span>
                  <strong>
                    {evidenceExpectation || 'Delivery note plus linked evidence URLs'}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Operator resolution</span>
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
                      {role}
                    </span>
                  ))
                ) : (
                  <span className={styles.roleBadgeMuted}>observer</span>
                )}
              </div>
              <article className={styles.timelineCard}>
                <div className={styles.walletTitleRow}>
                  <strong>Contractor join access</strong>
                  <span>
                    {selectedContractorParticipation?.status === 'joined'
                      ? 'Joined'
                      : canJoinSelectedContract
                        ? 'Ready to join'
                        : controlsSelectedWorkerWallet
                          ? 'Wallet verified'
                          : accessToken
                            ? 'Setup required'
                            : 'Share link ready'}
                  </span>
                </div>
                <p className={styles.muted}>
                  {!accessToken
                    ? 'Share this contract link with the contractor. They must sign in, use the matching email, and link the bound worker wallet before delivery is enabled.'
                    : selectedContractorParticipation?.status === 'joined'
                      ? 'This contract has already been joined by the bound contractor identity.'
                      : pendingContractorEmail && !currentUserMatchesPendingContractorEmail
                        ? 'Use the matching contractor email from contract setup before joining this contract.'
                        : !pendingContractorEmail
                          ? 'Use the contractor email entered during contract setup before joining this contract.'
                        : !controlsSelectedWorkerWallet
                          ? `Link ${selectedJobView.onchain.workerAddress} before joining this contract.`
                          : 'This session controls the bound worker wallet and is ready for contractor join.'}
                </p>
                {selectedJob?.job.contractorParticipation?.contractorEmail ? (
                  <p className={styles.muted}>
                    Pending contractor email:{' '}
                    {selectedJob.job.contractorParticipation.contractorEmail}
                  </p>
                ) : null}
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleCopyJoinLink}
                  >
                    Copy contractor link
                  </button>
                  {selectedContractorParticipation?.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={handleJoinContract}
                      disabled={!canJoinSelectedContract}
                    >
                      Join contract
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
                    <strong>No milestones committed yet</strong>
                    <p className={styles.muted}>
                      Fund the job and commit milestone checkpoints before delivery actions can begin.
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
                        <strong>{`${index + 1}. ${milestone.title}`}</strong>
                        <span
                          className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                            milestone.status,
                          )}`}
                        >
                          {milestone.status}
                        </span>
                      </div>
                      <p>{milestone.deliverable}</p>
                      <div className={styles.milestoneMetaRow}>
                        <small>{milestone.amount} USDC</small>
                        <small>
                          {milestone.dueAt ? `Due ${formatTimestamp(milestone.dueAt)}` : 'No due date'}
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
                        <h3>Client workspace</h3>
                        <p className={styles.muted}>
                          Fund the escrow, commit milestone checkpoints, and release accepted work with explicit receipt posture.
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
                            {getLifecyclePhaseLabel(fundJobCard.phase)}
                          </span>
                        </div>
                        <p className={styles.muted}>{fundJobCard.detail}</p>
                        <label className={styles.field}>
                          <span>Fund amount</span>
                          <input
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
                            Fund selected job
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={handleUseMilestoneBudget}
                          >
                            Use drafted milestone total
                          </button>
                        </div>
                        <div className={styles.lifecycleMeta}>
                          <small>{fundJobCard.timestamp ? formatTimestamp(fundJobCard.timestamp) : 'No receipt yet'}</small>
                          <small>{previewHash(fundJobCard.txHash)}</small>
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
                            {getLifecyclePhaseLabel(commitMilestonesCard.phase)}
                          </span>
                        </div>
                        <p className={styles.muted}>{commitMilestonesCard.detail}</p>
                        <div className={styles.stack}>
                          <h4>Milestone drafting</h4>
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
                              Add milestone
                            </button>
                            <button
                              type="button"
                              onClick={handleSetMilestones}
                              disabled={!isLifecycleActionEnabled(commitMilestonesCard)}
                            >
                              Commit milestones
                            </button>
                          </div>
                        </div>
                        <div className={styles.lifecycleMeta}>
                          <small>
                            {commitMilestonesCard.timestamp
                              ? formatTimestamp(commitMilestonesCard.timestamp)
                              : 'No receipt yet'}
                          </small>
                          <small>{previewHash(commitMilestonesCard.txHash)}</small>
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
                            {getLifecyclePhaseLabel(releaseCard.phase)}
                          </span>
                        </div>
                        <p className={styles.muted}>{releaseCard.detail}</p>
                        <button
                          type="button"
                          onClick={handleReleaseMilestone}
                          disabled={!isLifecycleActionEnabled(releaseCard)}
                        >
                          Release selected milestone
                        </button>
                        <div className={styles.lifecycleMeta}>
                          <small>{releaseCard.timestamp ? formatTimestamp(releaseCard.timestamp) : 'No receipt yet'}</small>
                          <small>{previewHash(releaseCard.txHash)}</small>
                        </div>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {view === 'deliver' && !isWorkerForSelectedJob ? (
                  <EmptyStateCard
                    title="Contractor wallet required"
                    message={
                      accessToken
                        ? `Link ${selectedJobView.onchain.workerAddress} before delivering this milestone.`
                        : 'Sign in and link the exact contractor wallet from the shared contract link before delivery is enabled.'
                    }
                    className={styles.timelineCard}
                    messageClassName={styles.muted}
                  />
                ) : null}

                {showWorkerWorkspace ? (
                  <div className={styles.actionPanel}>
                    <div className={styles.workspaceHead}>
                      <div>
                        <h3>Worker workspace</h3>
                        <p className={styles.muted}>
                          Deliver milestone evidence with explicit pending and confirmation posture.
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
                            {getLifecyclePhaseLabel(deliveryCard.phase)}
                          </span>
                        </div>
                        <p className={styles.muted}>{deliveryCard.detail}</p>
                        <label className={styles.field}>
                          <span>Delivery note</span>
                          <textarea
                            value={deliveryNote}
                            onChange={(event) => setDeliveryNote(event.target.value)}
                            rows={3}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Evidence URLs</span>
                          <textarea
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
                          Deliver selected milestone
                        </button>
                        <div className={styles.lifecycleMeta}>
                          <small>{deliveryCard.timestamp ? formatTimestamp(deliveryCard.timestamp) : 'No receipt yet'}</small>
                          <small>{previewHash(deliveryCard.txHash)}</small>
                        </div>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {view === 'dispute' && !isClientForSelectedJob ? (
                  <EmptyStateCard
                    title="Client wallet required"
                    message={
                      controlsSelectedClientWallet
                        ? 'This session controls the client wallet, but the contract list has not refreshed into a writable client role yet.'
                        : accessToken
                        ? `Link ${selectedJobView.onchain.clientAddress} before opening a milestone dispute.`
                        : 'Sign in and link the exact client wallet from the shared contract link before dispute actions are enabled.'
                    }
                    className={styles.timelineCard}
                    messageClassName={styles.muted}
                  />
                ) : null}

                {showSharedDispute ? (
                <div className={styles.actionPanel}>
                  <div className={styles.workspaceHead}>
                    <div>
                      <h3>Shared dispute posture</h3>
                      <p className={styles.muted}>
                        Both participants should see the same selected milestone, current state, and escalation evidence.
                      </p>
                    </div>
                  </div>
                  <div className={styles.selectedMilestoneHeader}>
                    <div>
                      <span className={styles.metaLabel}>Selected milestone</span>
                      <strong>{selectedMilestone ? `${selectedMilestoneIndex + 1}. ${selectedMilestone.title}` : 'No milestone selected'}</strong>
                    </div>
                    {selectedMilestone ? (
                      <span
                        className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                          selectedMilestone.status,
                        )}`}
                      >
                        {selectedMilestone.status}
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
                          {getLifecyclePhaseLabel(disputeCard.phase)}
                        </span>
                      </div>
                      <p className={styles.muted}>{disputeCard.detail}</p>
                      {!isClientForSelectedJob ? (
                        <p className={styles.muted}>
                          Only the client wallet can open a dispute in this launch flow.
                        </p>
                      ) : null}
                      <label className={styles.field}>
                        <span>Dispute reason</span>
                        <textarea
                          value={disputeReason}
                          onChange={(event) => setDisputeReason(event.target.value)}
                          rows={3}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Dispute evidence URLs</span>
                        <textarea
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
                        Open dispute
                      </button>
                      <div className={styles.lifecycleMeta}>
                        <small>{disputeCard.timestamp ? formatTimestamp(disputeCard.timestamp) : 'No receipt yet'}</small>
                        <small>{previewHash(disputeCard.txHash)}</small>
                      </div>
                    </article>
                  ) : null}
                </div>
                ) : null}

                {showOperatorPosture ? (
                <div className={styles.actionPanel}>
                  <div className={styles.workspaceHead}>
                    <div>
                      <h3>Operator posture</h3>
                      <p className={styles.muted}>
                        Privileged operator workflows are still incomplete. Resolution remains available here only for sessions that already control the configured arbitrator wallet.
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
                          {getLifecyclePhaseLabel(resolveCard.phase)}
                        </span>
                      </div>
                      <p className={styles.muted}>{resolveCard.detail}</p>
                      <label className={styles.field}>
                        <span>Resolution action</span>
                        <select
                          value={resolutionAction}
                          onChange={(event) =>
                            setResolutionAction(event.target.value as 'release' | 'refund')
                          }
                        >
                          <option value="release">Release</option>
                          <option value="refund">Refund</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Resolution note</span>
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
                        Resolve dispute
                      </button>
                      <div className={styles.lifecycleMeta}>
                        <small>{resolveCard.timestamp ? formatTimestamp(resolveCard.timestamp) : 'No receipt yet'}</small>
                        <small>{previewHash(resolveCard.txHash)}</small>
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
                    <h3>Selected milestone</h3>
                    <p className={styles.muted}>
                      Inline context for the checkpoint currently in focus.
                    </p>
                  </div>
                  {selectedMilestone ? (
                    <span
                      className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                        selectedMilestone.status,
                      )}`}
                    >
                      {selectedMilestone.status}
                    </span>
                  ) : null}
                </div>
                {selectedMilestone ? (
                  <div className={styles.stack}>
                    <div className={styles.summaryGrid}>
                      <article>
                        <span className={styles.metaLabel}>Amount</span>
                        <strong>{selectedMilestone.amount} USDC</strong>
                      </article>
                      <article>
                        <span className={styles.metaLabel}>Due</span>
                        <strong>{selectedMilestone.dueAt ? formatTimestamp(selectedMilestone.dueAt) : 'Not set'}</strong>
                      </article>
                    </div>
                    <p>{selectedMilestone.deliverable}</p>
                    {selectedMilestone.deliveryNote ? (
                      <article className={styles.timelineCard}>
                        <strong>Delivery note</strong>
                        <p>{selectedMilestone.deliveryNote}</p>
                      </article>
                    ) : null}
                    {selectedMilestone.deliveryEvidenceUrls?.length ? (
                      <article className={styles.timelineCard}>
                        <strong>Evidence links</strong>
                        <div className={styles.linkList}>
                          {selectedMilestone.deliveryEvidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              {url}
                            </a>
                          ))}
                        </div>
                      </article>
                    ) : null}
                    {selectedMilestone.disputeReason ? (
                      <article className={styles.timelineCard}>
                        <strong>Dispute reason</strong>
                        <p>{selectedMilestone.disputeReason}</p>
                      </article>
                    ) : null}
                    {selectedMilestone.disputeEvidenceUrls?.length ? (
                      <article className={styles.timelineCard}>
                        <strong>Dispute evidence links</strong>
                        <div className={styles.linkList}>
                          {selectedMilestone.disputeEvidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              {url}
                            </a>
                          ))}
                        </div>
                      </article>
                    ) : null}
                    {selectedMilestone.resolutionAction ? (
                      <article className={styles.timelineCard}>
                        <strong>Resolution</strong>
                        <p>
                          {selectedMilestone.resolutionAction}
                          {selectedMilestone.resolutionNote
                            ? `: ${selectedMilestone.resolutionNote}`
                            : ''}
                        </p>
                      </article>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.muted}>
                    Select a committed milestone to inspect delivery evidence and action posture.
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Milestone timeline</h3>
                {selectedMilestoneTimeline.length > 0 ? (
                  selectedMilestoneTimeline.map((entry) => (
                    <article key={`${entry.label}-${entry.at}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{entry.label}</strong>
                        <span>{formatTimestamp(entry.at)}</span>
                      </div>
                      <p>{entry.detail}</p>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    No milestone timeline events recorded yet for the current selection.
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Milestone audit trail</h3>
                {selectedMilestoneAuditEvents.length > 0 ? (
                  selectedMilestoneAuditEvents.map((event, index) => (
                    <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{event.type}</strong>
                        <span>{formatTimestamp(event.at)}</span>
                      </div>
                      <pre>{formatJson(event.payload)}</pre>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    No milestone-specific audit events recorded yet.
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Milestone receipts</h3>
                {selectedMilestoneExecutions.length > 0 ? (
                  selectedMilestoneExecutions.map((execution) => (
                    <article key={execution.id} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{execution.action}</strong>
                        <span>{execution.status}</span>
                      </div>
                      <p>{execution.actorAddress}</p>
                      <small>{formatTimestamp(execution.confirmedAt ?? execution.submittedAt)}</small>
                      <small>{previewHash(execution.txHash)}</small>
                      {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>
                    No milestone-specific execution receipts recorded yet.
                  </p>
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Job launch history</h3>
                {jobLevelAuditEvents.length > 0 ? (
                  jobLevelAuditEvents.map((event, index) => (
                    <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{event.type}</strong>
                        <span>{formatTimestamp(event.at)}</span>
                      </div>
                      <pre>{formatJson(event.payload)}</pre>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>No job-level audit events recorded yet.</p>
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
                      <p>{execution.actorAddress}</p>
                      <small>{formatTimestamp(execution.confirmedAt ?? execution.submittedAt)}</small>
                      <small>{previewHash(execution.txHash)}</small>
                      {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>No job-level execution receipts recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyStateCard
            title="Select a job"
            message="Select a job from the index to view its milestones, audit events, and receipts."
            className={styles.timelineCard}
            messageClassName={styles.muted}
          />
        )}
      </section>
      ) : null}
    </div>
  );
}
