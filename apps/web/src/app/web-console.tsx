'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import type {
  AuditBundle,
  JobView,
  JobsListResponse,
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

type AsyncState = {
  kind: 'idle' | 'working' | 'error' | 'success';
  message?: string;
};

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

function formatTime(value?: number | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString();
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

function txHashPreview(txHash?: string) {
  if (!txHash) {
    return 'Pending';
  }

  return `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;
}

export function EscrowConsole() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [jobsResponse, setJobsResponse] = useState<JobsListResponse>({ jobs: [] });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [auditBundle, setAuditBundle] = useState<AuditBundle | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [startState, setStartState] = useState<AsyncState>({ kind: 'idle' });
  const [verifyState, setVerifyState] = useState<AsyncState>({ kind: 'idle' });
  const [sessionState, setSessionState] = useState<AsyncState>({ kind: 'idle' });
  const [walletActionState, setWalletActionState] = useState<AsyncState>({
    kind: 'idle',
  });
  const [jobActionState, setJobActionState] = useState<AsyncState>({
    kind: 'idle',
  });
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
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState('0');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryEvidence, setDeliveryEvidence] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [resolutionAction, setResolutionAction] = useState<'release' | 'refund'>(
    'release',
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [createdJobResult, setCreatedJobResult] = useState<CreatedJobResult | null>(
    null,
  );

  const selectedJob = useMemo(
    () => jobsResponse.jobs.find((entry) => entry.job.id === selectedJobId) ?? null,
    [jobsResponse.jobs, selectedJobId],
  );

  const selectedMilestone = selectedJob?.job.milestones[Number(selectedMilestoneIndex)];

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

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }

    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
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
      return;
    }

    void loadAudit(selectedJobId);
  }, [selectedJobId]);

  async function refreshConsole(token = accessToken) {
    if (!token) {
      return;
    }

    setSessionState({ kind: 'working', message: 'Syncing session state...' });

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
      setSessionState({ kind: 'success', message: 'Console state is current.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session';
      setSessionState({ kind: 'error', message });
    }
  }

  async function loadAudit(jobId: string) {
    try {
      const audit = await webApi.getAudit(jobId);
      setAuditBundle(audit);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to load audit',
      });
    }
  }

  async function handleStartAuth() {
    setStartState({ kind: 'working', message: 'Sending OTP...' });

    try {
      await webApi.startAuth(authEmail);
      setStartState({
        kind: 'success',
        message: 'OTP issued. Check your configured mail inbox or relay logs.',
      });
    } catch (error) {
      setStartState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to start auth',
      });
    }
  }

  async function handleVerifyAuth() {
    setVerifyState({ kind: 'working', message: 'Verifying code...' });

    try {
      const response = await webApi.verifyAuth(authEmail, authCode);
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setProfile(response.user);
      writeSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setVerifyState({
        kind: 'success',
        message: 'Session established. Loading product data...',
      });
    } catch (error) {
      setVerifyState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to verify code',
      });
    }
  }

  async function handleRefreshSession() {
    if (!refreshToken) {
      return;
    }

    setSessionState({ kind: 'working', message: 'Refreshing session...' });

    try {
      const tokens = await webApi.refresh(refreshToken);
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      writeSession(tokens);
      setSessionState({ kind: 'success', message: 'Session refreshed.' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Session refresh failed';
      setSessionState({ kind: 'error', message });
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

  async function handleShariahToggle(nextValue: boolean) {
    if (!accessToken) {
      return;
    }

    setSessionState({ kind: 'working', message: 'Updating policy preference...' });

    try {
      const updated = await webApi.setShariah(nextValue, accessToken);
      setProfile(updated);
      setSessionState({
        kind: 'success',
        message: `Shariah mode ${nextValue ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      setSessionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to update preference',
      });
    }
  }

  async function handleCreateChallenge() {
    if (!accessToken) {
      return;
    }

    setWalletActionState({
      kind: 'working',
      message: 'Issuing SIWE wallet-link challenge...',
    });

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
      setWalletActionState({
        kind: 'success',
        message: 'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
      });
    } catch (error) {
      setWalletActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to issue challenge',
      });
    }
  }

  async function handleConnectInjectedWallet() {
    setWalletActionState({
      kind: 'working',
      message: 'Connecting injected wallet...',
    });

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
      setWalletActionState({
        kind: 'success',
        message: 'Wallet connected. You can now sign a SIWE link challenge directly.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect wallet';
      setWalletConnection((current) => ({
        ...current,
        status:
          current.status === 'connected' ? 'connected' : 'disconnected',
        message,
      }));
      setWalletActionState({
        kind: 'error',
        message,
      });
    }
  }

  async function handleLinkInjectedWallet() {
    if (!accessToken) {
      return;
    }

    setWalletActionState({
      kind: 'working',
      message: 'Connecting wallet, creating SIWE challenge, and requesting signature...',
    });

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
      setWalletActionState({
        kind: 'success',
        message: 'Wallet linked from the browser wallet. Smart-account provisioning is now available.',
      });
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to link injected wallet',
      });
    }
  }

  async function handleVerifyWallet() {
    if (!accessToken || !challenge) {
      return;
    }

    setWalletActionState({
      kind: 'working',
      message: 'Verifying signed wallet challenge...',
    });

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
      setWalletActionState({
        kind: 'success',
        message: 'Wallet linked and ready for smart-account provisioning.',
      });
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to verify wallet',
      });
    }
  }

  async function handleProvisionSmartAccount() {
    if (!accessToken) {
      return;
    }

    setWalletActionState({
      kind: 'working',
      message: 'Provisioning smart account...',
    });

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
      setWalletActionState({
        kind: 'success',
        message: `Smart account ready. Sponsorship policy: ${response.sponsorship.policy}.`,
      });
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to provision smart account',
      });
    }
  }

  async function handleSetDefaultWallet(address: string) {
    if (!accessToken) {
      return;
    }

    setWalletActionState({
      kind: 'working',
      message: 'Updating default execution wallet...',
    });

    try {
      const response = await webApi.setDefaultWallet(address, accessToken);
      setWalletState(response);
      setWalletActionState({
        kind: 'success',
        message: 'Default execution wallet updated.',
      });
      await refreshConsole(accessToken);
    } catch (error) {
      setWalletActionState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to change default wallet',
      });
    }
  }

  async function handleCreateJob() {
    if (!accessToken) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Creating job...' });

    try {
      const termsJSON = buildJobTermsJson(createJobState, milestones);
      const response = await webApi.createJob(
        {
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
      setJobActionState({
        kind: 'success',
        message: `Job created. Escrow id ${response.escrowId} on tx ${txHashPreview(response.txHash)}. Next step: commit milestones or stage funding.`,
      });
      await refreshConsole(accessToken);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to create job',
      });
    }
  }

  async function handleFundJob() {
    if (!accessToken || !selectedJob) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Funding job...' });

    try {
      const response = await webApi.fundJob(selectedJob.job.id, fundAmount, accessToken);
      setJobActionState({
        kind: 'success',
        message: `Funding confirmed via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(selectedJob.job.id);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to fund job',
      });
    }
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

    setJobActionState({ kind: 'working', message: 'Setting milestones...' });

    try {
      const response = await webApi.setMilestones(
        targetJobId,
        milestones.map((milestone) => ({
          title: milestone.title,
          deliverable: milestone.deliverable,
          amount: milestone.amount,
          dueAt: milestone.dueAt ? Number(milestone.dueAt) : undefined,
        })),
        accessToken,
      );
      setJobActionState({
        kind: 'success',
        message: `Milestones committed via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(targetJobId);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to set milestones',
      });
    }
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
    if (!accessToken || !selectedJob) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Submitting milestone delivery...' });

    try {
      const response = await webApi.deliverMilestone(
        selectedJob.job.id,
        Number(selectedMilestoneIndex),
        {
          note: deliveryNote,
          evidenceUrls: splitEvidenceUrls(deliveryEvidence),
        },
        accessToken,
      );
      setJobActionState({
        kind: 'success',
        message: `Delivery recorded via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(selectedJob.job.id);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to deliver milestone',
      });
    }
  }

  async function handleReleaseMilestone() {
    if (!accessToken || !selectedJob) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Releasing milestone...' });

    try {
      const response = await webApi.releaseMilestone(
        selectedJob.job.id,
        Number(selectedMilestoneIndex),
        accessToken,
      );
      setJobActionState({
        kind: 'success',
        message: `Release confirmed via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(selectedJob.job.id);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to release milestone',
      });
    }
  }

  async function handleDisputeMilestone() {
    if (!accessToken || !selectedJob) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Opening dispute...' });

    try {
      const response = await webApi.disputeMilestone(
        selectedJob.job.id,
        Number(selectedMilestoneIndex),
        disputeReason,
        accessToken,
      );
      setJobActionState({
        kind: 'success',
        message: `Dispute opened via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(selectedJob.job.id);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to dispute milestone',
      });
    }
  }

  async function handleResolveMilestone() {
    if (!accessToken || !selectedJob) {
      return;
    }

    setJobActionState({ kind: 'working', message: 'Resolving dispute...' });

    try {
      const response = await webApi.resolveMilestone(
        selectedJob.job.id,
        Number(selectedMilestoneIndex),
        {
          action: resolutionAction,
          note: resolutionNote,
        },
        accessToken,
      );
      setJobActionState({
        kind: 'success',
        message: `Dispute resolved via ${txHashPreview(response.txHash)}.`,
      });
      await refreshConsole(accessToken);
      await loadAudit(selectedJob.job.id);
    } catch (error) {
      setJobActionState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to resolve dispute',
      });
    }
  }

  return (
    <div className={styles.console}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Client Console</p>
          <h1>Operate the escrow lifecycle from OTP login to dispute resolution.</h1>
          <p className={styles.heroCopy}>
            This surface is wired to the real API modules already in the repo:
            auth, SIWE wallet linking, smart-account provisioning, job creation,
            milestone actions, and public audit review.
          </p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>API base URL</span>
            <strong>{webApi.baseUrl}</strong>
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

      <div className={styles.grid}>
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
                      {createJobState.workerAddress.trim()
                        ? 'Worker address captured'
                        : 'Worker address missing'}
                    </strong>
                    <p className={styles.muted}>
                      Keep this aligned with the worker wallet that will deliver milestones.
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
                  <span>{txHashPreview(createdJobResult.txHash)}</span>
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
            <p className={styles.stateText}>{jobActionState.message}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Portfolio</p>
              <h2>Your job index</h2>
            </div>
          </header>
          <div className={styles.jobList}>
            {jobsResponse.jobs.length === 0 ? (
              <p className={styles.muted}>No jobs available yet for the current identity.</p>
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
      </div>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Selected Job</p>
            <h2>{selectedJob?.job.title || 'Select a job to manage lifecycle actions'}</h2>
          </div>
        </header>
        {selectedJob ? (
          <div className={styles.detailGrid}>
            <div className={styles.stack}>
              <div className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>Status</span>
                  <strong>{selectedJob.job.status}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Funded amount</span>
                  <strong>{selectedJob.job.fundedAmount || 'Not funded'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Escrow id</span>
                  <strong>{selectedJob.job.onchain.escrowId || 'Pending'}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Updated</span>
                  <strong>{formatTime(selectedJob.job.updatedAt)}</strong>
                </article>
              </div>
              <div className={styles.actionPanel}>
                <h3>Mutation controls</h3>
                <label className={styles.field}>
                  <span>Fund amount</span>
                  <input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} />
                </label>
                <button type="button" onClick={handleFundJob}>
                  Fund selected job
                </button>

                <div className={styles.stack}>
                  <h4>Milestones</h4>
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
                    <button type="button" onClick={handleSetMilestones}>
                      Commit milestones
                    </button>
                  </div>
                </div>

                <label className={styles.field}>
                  <span>Active milestone index</span>
                  <input
                    value={selectedMilestoneIndex}
                    onChange={(event) => setSelectedMilestoneIndex(event.target.value)}
                  />
                </label>
                <p className={styles.muted}>
                  Current milestone: {selectedMilestone?.title || 'No milestone at this index'}
                </p>
                <label className={styles.field}>
                  <span>Delivery note</span>
                  <textarea value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} rows={3} />
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
                <button type="button" onClick={handleDeliverMilestone}>
                  Deliver milestone
                </button>

                <button type="button" onClick={handleReleaseMilestone}>
                  Release milestone
                </button>

                <label className={styles.field}>
                  <span>Dispute reason</span>
                  <textarea
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    rows={3}
                  />
                </label>
                <button type="button" onClick={handleDisputeMilestone}>
                  Open dispute
                </button>

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
                <button type="button" onClick={handleResolveMilestone}>
                  Resolve dispute
                </button>
              </div>
            </div>

            <div className={styles.stack}>
              <div className={styles.auditPanel}>
                <h3>Milestones</h3>
                {(auditBundle?.bundle.job.milestones ?? selectedJob.job.milestones).map(
                  (milestone, index) => (
                    <article key={`${selectedJob.job.id}-milestone-${index}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>
                          {index}. {milestone.title}
                        </strong>
                        <span>{milestone.status}</span>
                      </div>
                      <p>{milestone.deliverable}</p>
                      <small>{milestone.amount} USDC</small>
                    </article>
                  ),
                )}
              </div>
              <div className={styles.auditPanel}>
                <h3>Audit timeline</h3>
                {(auditBundle?.bundle.audit ?? []).map((event, index) => (
                  <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                    <div className={styles.timelineHead}>
                      <strong>{event.type}</strong>
                      <span>{formatTime(event.at)}</span>
                    </div>
                    <pre>{formatJson(event.payload)}</pre>
                  </article>
                ))}
              </div>
              <div className={styles.auditPanel}>
                <h3>Execution receipts</h3>
                {(auditBundle?.bundle.executions ?? []).map((execution) => (
                  <article key={execution.id} className={styles.timelineCard}>
                    <div className={styles.timelineHead}>
                      <strong>{execution.action}</strong>
                      <span>{execution.status}</span>
                    </div>
                    <p>{execution.actorAddress}</p>
                    <small>{txHashPreview(execution.txHash)}</small>
                    {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.muted}>Select a job from the index to view its milestones, audit events, and receipts.</p>
        )}
      </section>
    </div>
  );
}
