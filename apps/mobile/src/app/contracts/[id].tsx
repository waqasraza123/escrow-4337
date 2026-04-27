import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  formatAmount,
  formatTimestamp,
  previewHash,
  type JobView,
} from '@escrow4334/product-core';
import {
  createMilestoneDraftsFromJob,
  normalizeMilestones,
  sumMilestoneAmounts,
  type MobileMilestoneDraft,
} from '@/features/contracts/contract-drafts';
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
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  Textarea,
} from '@/ui/primitives';

export default function ContractDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
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
              disabled={fund.isPending || !fundAmount.trim()}
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

      <ContractMilestonesCard job={job} />

      {isClient ? (
        <SurfaceCard animated delay={140}>
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
        </SurfaceCard>
      ) : null}
    </ScrollScreen>
  );
}

function ContractMilestonesCard({ job }: { job: JobView }) {
  const { accessToken } = useSession();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<MobileMilestoneDraft[]>(() =>
    createMilestoneDraftsFromJob(job),
  );
  const normalized = useMemo(() => normalizeMilestones(drafts), [drafts]);
  const hasCommittedMilestones = job.milestones.length > 0;

  const commit = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before committing milestones.');
      }
      if (!normalized.length) {
        throw new Error('Add at least one ready milestone.');
      }

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
        <MilestoneTimeline milestones={job.milestones} />
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
            disabled={commit.isPending || !normalized.length}
            loading={commit.isPending}
            onPress={() => commit.mutate()}
          >
            Commit milestones
          </PrimaryButton>
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
});
