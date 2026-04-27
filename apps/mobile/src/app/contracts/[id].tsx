import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  formatAmount,
  formatTimestamp,
  previewHash,
  splitList,
  type JobMilestone,
  type JobView,
} from '@escrow4334/product-core';
import {
  createMilestoneDraftsFromJob,
  normalizeMilestones,
  sumMilestoneAmounts,
  type MobileMilestoneDraft,
} from '@/features/contracts/contract-drafts';
import { NetworkActionNotice } from '@/features/network/NetworkActionNotice';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  BottomActionBar,
  EmptyState,
  Field,
  HashText,
  Heading,
  MetricRow,
  MilestoneTimeline,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  Textarea,
} from '@/ui/primitives';

export default function ContractDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [fundAmount, setFundAmount] = useState('');

  const jobs = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['jobs'],
    queryFn: () => api.listJobs(accessToken as string),
  });

  const selected = useMemo(
    () => jobs.data?.jobs.find(({ job }) => job.id === id) ?? null,
    [id, jobs.data?.jobs],
  );
  const job = selected?.job ?? null;
  const participantRoles = selected?.participantRoles ?? [];

  const fund = useMutation({
    mutationFn: async () => {
      if (!accessToken || !job) {
        throw new Error('Sign in before funding a contract.');
      }
      if (!fundAmount.trim()) {
        throw new Error('Enter a funding amount.');
      }
      networkGate.requireOnline('Funding a contract');

      return api.fundJob(job.id, fundAmount.trim(), accessToken);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      Alert.alert('Funding submitted', `Transaction ${previewHash(response.txHash)} was recorded.`);
    },
    onError: (error) => {
      Alert.alert(
        'Funding failed',
        error instanceof Error ? error.message : 'The contract could not be funded.',
      );
    },
  });

  if (!accessToken) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Contract"
          title="Sign in required"
          body="Contract detail is only available to authenticated participants."
        />
        <EmptyState
          title="Signed out"
          body="Sign in to view contract authority, funding, and milestones."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  if (jobs.isLoading) {
    return (
      <ScrollScreen>
        <SectionHeader eyebrow="Contract" title="Loading contract" />
        <SurfaceCard animated>
          <BodyText>Loading participant-scoped contract state...</BodyText>
        </SurfaceCard>
      </ScrollScreen>
    );
  }

  if (jobs.isError) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Contract"
          title="Contracts unavailable"
          body="The contracts API could not be reached for this authenticated session."
        />
        <EmptyState
          title="Try again later"
          body="Return to the contracts list once the backend target is reachable."
          action={<PrimaryButton onPress={() => router.replace('/contracts')}>Contracts</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  if (!job) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Contract"
          title="Contract unavailable"
          body="This contract is not visible to the current authenticated session."
        />
        <EmptyState
          title="Not found"
          body="Return to the contracts list and select a contract tied to your current account."
          action={<PrimaryButton onPress={() => router.replace('/contracts')}>Contracts</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  const isClient = participantRoles.includes('client');
  const milestoneTotal = String(sumMilestoneAmounts(createMilestoneDraftsFromJob(job)) || '');

  return (
    <ScrollScreen
      footer={
        isClient ? (
          <BottomActionBar>
            <PrimaryButton
              disabled={networkGate.actionBlocked || fund.isPending || !fundAmount.trim()}
              loading={fund.isPending}
              onPress={() => fund.mutate()}
            >
              Fund contract
            </PrimaryButton>
          </BottomActionBar>
        ) : undefined
      }
    >
      <SectionHeader eyebrow="Contract" title={job.title} body={job.description} />

      <SurfaceCard animated variant="elevated">
        <View style={styles.headerRow}>
          <StatusBadge label={job.status} tone={job.status === 'completed' ? 'success' : 'info'} />
          <StatusBadge label={participantRoles.join(' + ') || 'participant'} tone="muted" />
        </View>
        <MetricRow label="Funded" value={formatAmount(job.fundedAmount)} />
        <MetricRow label="Created" value={formatTimestamp(job.createdAt)} />
        <MetricRow label="Updated" value={formatTimestamp(job.updatedAt)} />
        <MetricRow
          label="Contractor join"
          value={job.contractorParticipation?.status ?? 'not requested'}
        />
      </SurfaceCard>

      <SurfaceCard animated delay={60}>
        <Heading size="section">Onchain authority</Heading>
        <MetricRow label="Escrow id" value={job.onchain.escrowId ?? 'Pending'} />
        <BodyText>Client</BodyText>
        <HashText value={job.onchain.clientAddress} />
        <BodyText>Worker</BodyText>
        <HashText value={job.onchain.workerAddress} />
        <BodyText>Settlement token</BodyText>
        <HashText value={job.onchain.currencyAddress} />
      </SurfaceCard>

      <ContractMilestonesCard job={job} participantRoles={participantRoles} />

      <SurfaceCard animated delay={120}>
        <Heading size="section">Project room</Heading>
        <BodyText>
          Review milestone submissions, revision requests, approvals, artifact metadata, and room
          messages before onchain delivery.
        </BodyText>
        <PrimaryButton
          onPress={() =>
            router.push({
              pathname: '/contracts/[id]/room',
              params: { id: job.id },
            })
          }
        >
          Open project room
        </PrimaryButton>
      </SurfaceCard>

      {isClient ? (
        <SurfaceCard animated delay={160}>
          <Heading size="section">Funding</Heading>
          <BodyText>
            Fund the escrow after the contract and milestone plan are correct. The default value can
            mirror the milestone total, but the API still enforces provider and contract rules.
          </BodyText>
          <Field
            keyboardType="decimal-pad"
            label="Amount"
            onChangeText={setFundAmount}
            placeholder={milestoneTotal || '1000'}
            value={fundAmount}
          />
          {milestoneTotal ? (
            <SecondaryButton onPress={() => setFundAmount(milestoneTotal)}>
              Use milestone total
            </SecondaryButton>
          ) : null}
          <NetworkActionNotice action="Contract funding" />
        </SurfaceCard>
      ) : null}
    </ScrollScreen>
  );
}

type MobileMilestoneActionKind = 'deliver' | 'release' | 'dispute';

type MobileMilestoneAction = {
  key: string;
  kind: MobileMilestoneActionKind;
  milestoneIndex: number;
  milestone: JobMilestone;
  label: string;
};

function buildMobileMilestoneActions(
  job: JobView,
  participantRoles: Array<'client' | 'worker'>,
): MobileMilestoneAction[] {
  return job.milestones.flatMap((milestone, milestoneIndex) => {
    const actions: MobileMilestoneAction[] = [];

    if (participantRoles.includes('worker') && milestone.status === 'pending') {
      actions.push({
        key: `${milestoneIndex}:deliver`,
        kind: 'deliver',
        milestoneIndex,
        milestone,
        label: `Deliver ${milestoneIndex + 1}`,
      });
    }

    if (participantRoles.includes('client') && milestone.status === 'delivered') {
      actions.push(
        {
          key: `${milestoneIndex}:release`,
          kind: 'release',
          milestoneIndex,
          milestone,
          label: `Release ${milestoneIndex + 1}`,
        },
        {
          key: `${milestoneIndex}:dispute`,
          kind: 'dispute',
          milestoneIndex,
          milestone,
          label: `Dispute ${milestoneIndex + 1}`,
        },
      );
    }

    return actions;
  });
}

function getMilestoneActionCopy(kind: MobileMilestoneActionKind) {
  switch (kind) {
    case 'deliver':
      return {
        title: 'Submit delivery',
        body: 'Send the delivery note and evidence URLs for client review. The backend derives worker authority from this authenticated account.',
        button: 'Submit delivery',
      };
    case 'release':
      return {
        title: 'Release milestone',
        body: 'Release is final for this milestone once the escrow transaction is accepted.',
        button: 'Release milestone',
      };
    case 'dispute':
      return {
        title: 'Open dispute',
        body: 'Disputes are client-initiated in this launch flow and should include a concrete reason plus supporting evidence URLs.',
        button: 'Open dispute',
      };
  }
}

function ContractMilestonesCard({
  job,
  participantRoles,
}: {
  job: JobView;
  participantRoles: Array<'client' | 'worker'>;
}) {
  const { accessToken } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<MobileMilestoneDraft[]>(() =>
    createMilestoneDraftsFromJob(job),
  );
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryEvidenceUrls, setDeliveryEvidenceUrls] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidenceUrls, setDisputeEvidenceUrls] = useState('');
  const normalized = useMemo(() => normalizeMilestones(drafts), [drafts]);
  const hasCommittedMilestones = job.milestones.length > 0;
  const milestoneActions = useMemo(
    () => buildMobileMilestoneActions(job, participantRoles),
    [job, participantRoles],
  );
  const [selectedActionKey, setSelectedActionKey] = useState(
    () => milestoneActions[0]?.key ?? '',
  );
  const selectedAction =
    milestoneActions.find((action) => action.key === selectedActionKey) ??
    milestoneActions[0] ??
    null;

  useEffect(() => {
    if (!milestoneActions.length) {
      setSelectedActionKey('');
      return;
    }

    if (!milestoneActions.some((action) => action.key === selectedActionKey)) {
      setSelectedActionKey(milestoneActions[0].key);
    }
  }, [milestoneActions, selectedActionKey]);

  const commit = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before committing milestones.');
      }
      if (!normalized.length) {
        throw new Error('Add at least one ready milestone.');
      }
      networkGate.requireOnline('Committing milestones');

      return api.setMilestones(job.id, normalized, accessToken);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      Alert.alert('Milestones committed', `Transaction ${previewHash(response.txHash)} was recorded.`);
    },
    onError: (error) => {
      Alert.alert(
        'Milestone update failed',
        error instanceof Error ? error.message : 'The milestone plan could not be committed.',
      );
    },
  });

  const executeAction = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before updating a milestone.');
      }
      if (!selectedAction) {
        throw new Error('Select a milestone action.');
      }
      networkGate.requireOnline(getMilestoneActionCopy(selectedAction.kind).title);

      if (selectedAction.kind === 'deliver') {
        if (!deliveryNote.trim()) {
          throw new Error('Add a delivery note before submitting.');
        }

        return api.deliverMilestone(
          job.id,
          selectedAction.milestoneIndex,
          {
            note: deliveryNote.trim(),
            evidenceUrls: splitList(deliveryEvidenceUrls),
          },
          accessToken,
        );
      }

      if (selectedAction.kind === 'dispute') {
        if (!disputeReason.trim()) {
          throw new Error('Add a dispute reason before opening a dispute.');
        }

        return api.disputeMilestone(
          job.id,
          selectedAction.milestoneIndex,
          {
            reason: disputeReason.trim(),
            evidenceUrls: splitList(disputeEvidenceUrls),
          },
          accessToken,
        );
      }

      return api.releaseMilestone(job.id, selectedAction.milestoneIndex, accessToken);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setDeliveryNote('');
      setDeliveryEvidenceUrls('');
      setDisputeReason('');
      setDisputeEvidenceUrls('');
      Alert.alert('Milestone updated', `Transaction ${previewHash(response.txHash)} was recorded.`);
    },
    onError: (error) => {
      Alert.alert(
        'Milestone action failed',
        error instanceof Error ? error.message : 'The milestone action could not be completed.',
      );
    },
  });

  function updateDraft(index: number, field: keyof MobileMilestoneDraft, value: string) {
    setDrafts((current) =>
      current.map((milestone, currentIndex) =>
        currentIndex === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  }

  return (
    <SurfaceCard animated delay={100}>
      <View style={styles.headerRow}>
        <Heading size="section">Milestones</Heading>
        <StatusBadge
          label={hasCommittedMilestones ? 'committed' : 'draft'}
          tone={hasCommittedMilestones ? 'success' : 'warning'}
        />
      </View>

      {hasCommittedMilestones ? (
        <>
          <MilestoneTimeline milestones={job.milestones} />
          {selectedAction ? (
            <View style={styles.actionBlock}>
              <Heading size="section">
                {getMilestoneActionCopy(selectedAction.kind).title}
              </Heading>
              <BodyText>{getMilestoneActionCopy(selectedAction.kind).body}</BodyText>
              {milestoneActions.length > 1 ? (
                <SegmentedControl
                  value={selectedAction.key}
                  onChange={setSelectedActionKey}
                  options={milestoneActions.map((action) => ({
                    label: action.label,
                    value: action.key,
                  }))}
                />
              ) : null}
              <MetricRow label="Milestone" value={selectedAction.milestone.title} />
              <MetricRow
                label="Amount"
                value={formatAmount(selectedAction.milestone.amount)}
              />

              {selectedAction.kind === 'deliver' ? (
                <>
                  <Textarea
                    label="Delivery note"
                    onChangeText={setDeliveryNote}
                    placeholder="What changed, where to review it, and any acceptance notes"
                    value={deliveryNote}
                  />
                  <Textarea
                    autoCapitalize="none"
                    label="Evidence URLs"
                    onChangeText={setDeliveryEvidenceUrls}
                    placeholder="Optional, comma-separated"
                    value={deliveryEvidenceUrls}
                  />
                </>
              ) : null}

              {selectedAction.kind === 'dispute' ? (
                <>
                  <Textarea
                    label="Dispute reason"
                    onChangeText={setDisputeReason}
                    placeholder="What failed acceptance and what outcome you need"
                    value={disputeReason}
                  />
                  <Textarea
                    autoCapitalize="none"
                    label="Evidence URLs"
                    onChangeText={setDisputeEvidenceUrls}
                    placeholder="Optional, comma-separated"
                    value={disputeEvidenceUrls}
                  />
                </>
              ) : null}

              <NetworkActionNotice action={getMilestoneActionCopy(selectedAction.kind).title} />
              <PrimaryButton
                disabled={networkGate.actionBlocked || executeAction.isPending}
                loading={executeAction.isPending}
                onPress={() => executeAction.mutate()}
              >
                {getMilestoneActionCopy(selectedAction.kind).button}
              </PrimaryButton>
            </View>
          ) : (
            <BodyText>
              No milestone actions are available for your current participant role and milestone
              states.
            </BodyText>
          )}
        </>
      ) : (
        <>
          <BodyText>
            Commit the milestone terms that were drafted during creation before funding and delivery
            review.
          </BodyText>
          {drafts.map((milestone, index) => (
            <View key={`${index}-${milestone.title}`} style={styles.milestoneBlock}>
              <Heading size="section">Milestone {index + 1}</Heading>
              <Field
                label="Title"
                onChangeText={(value) => updateDraft(index, 'title', value)}
                value={milestone.title}
              />
              <Textarea
                label="Deliverable"
                onChangeText={(value) => updateDraft(index, 'deliverable', value)}
                value={milestone.deliverable}
              />
              <Field
                keyboardType="decimal-pad"
                label="Amount"
                onChangeText={(value) => updateDraft(index, 'amount', value)}
                value={milestone.amount}
              />
              <Field
                label="Due date"
                onChangeText={(value) => updateDraft(index, 'dueAt', value)}
                placeholder="Optional, for example 2026-05-15"
                value={milestone.dueAt}
              />
            </View>
          ))}
          <SecondaryButton
            onPress={() =>
              setDrafts((current) => [
                ...current,
                { title: '', deliverable: '', amount: '', dueAt: '' },
              ])
            }
          >
            Add milestone
          </SecondaryButton>
          <PrimaryButton
            disabled={networkGate.actionBlocked || commit.isPending || !normalized.length}
            loading={commit.isPending}
            onPress={() => commit.mutate()}
          >
            Commit milestones
          </PrimaryButton>
          <NetworkActionNotice action="Milestone commit" />
        </>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  milestoneBlock: {
    gap: 10,
  },
  actionBlock: {
    gap: 10,
  },
});
