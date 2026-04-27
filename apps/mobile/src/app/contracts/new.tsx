import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { formatAmount } from '@escrow4334/product-core';
import {
  buildMobileContractTerms,
  createInitialContractDraft,
  createInitialMilestones,
  getContractSetupReadiness,
  normalizeMilestones,
  sumMilestoneAmounts,
  type MobileContractDraft,
  type MobileMilestoneDraft,
} from '@/features/contracts/contract-drafts';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BottomActionBar,
  EmptyState,
  Field,
  Heading,
  MetricRow,
  PrimaryButton,
  ReadinessChecklist,
  ScrollScreen,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  SurfaceCard,
  Textarea,
} from '@/ui/primitives';

const configuredCurrencyAddress =
  process.env.EXPO_PUBLIC_DEFAULT_CURRENCY_ADDRESS ||
  (Constants.expoConfig?.extra?.defaultCurrencyAddress as string | undefined) ||
  '';

export default function NewContractRoute() {
  const { accessToken, user } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MobileContractDraft>(() =>
    createInitialContractDraft(configuredCurrencyAddress),
  );
  const [milestones, setMilestones] = useState<MobileMilestoneDraft[]>(
    createInitialMilestones,
  );
  const normalizedMilestones = useMemo(
    () => normalizeMilestones(milestones),
    [milestones],
  );
  const totalAmount = useMemo(() => sumMilestoneAmounts(milestones), [milestones]);
  const hasSmartAccountDefault = Boolean(
    user?.defaultExecutionWalletAddress &&
      user.wallets.some(
        (wallet) =>
          wallet.walletKind === 'smart_account' &&
          wallet.address === user.defaultExecutionWalletAddress,
      ),
  );
  const readiness = useMemo(
    () => getContractSetupReadiness(draft, milestones, hasSmartAccountDefault),
    [draft, hasSmartAccountDefault, milestones],
  );
  const ready = readiness.every((item) => item.ready);

  const createContract = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before creating a contract.');
      }
      networkGate.requireOnline('Creating a contract');

      const response = await api.createJob(
        {
          contractorEmail: draft.contractorEmail.trim(),
          workerAddress: draft.workerAddress.trim(),
          currencyAddress: draft.currencyAddress.trim(),
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category.trim(),
          termsJSON: buildMobileContractTerms(draft, milestones),
        },
        accessToken,
      );

      let milestoneCommitFailed = false;
      if (normalizedMilestones.length) {
        try {
          await api.setMilestones(response.jobId, normalizedMilestones, accessToken);
        } catch {
          milestoneCommitFailed = true;
        }
      }

      return { response, milestoneCommitFailed };
    },
    onSuccess: async ({ response, milestoneCommitFailed }) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      Alert.alert(
        'Contract created',
        milestoneCommitFailed
          ? 'The contract exists, but milestone commit needs to be retried from contract detail before funding.'
          : 'The escrow contract is ready for funding and contractor join follow-up.',
      );
      router.replace({
        pathname: '/contracts/[id]',
        params: { id: response.jobId },
      });
    },
    onError: (error) => {
      Alert.alert(
        'Contract creation failed',
        error instanceof Error ? error.message : 'The contract could not be created.',
      );
    },
  });

  function updateDraft<TField extends keyof MobileContractDraft>(
    field: TField,
    value: MobileContractDraft[TField],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateMilestone(
    index: number,
    field: keyof MobileMilestoneDraft,
    value: string,
  ) {
    setMilestones((current) =>
      current.map((milestone, currentIndex) =>
        currentIndex === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  }

  if (!accessToken) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="New contract"
          title="Sign in required"
          body="Contract creation depends on your authenticated client workspace and default smart account."
        />
        <EmptyState
          title="Signed out"
          body="Sign in before creating a milestone-funded escrow contract."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      footer={
        <BottomActionBar>
          <PrimaryButton
            disabled={!ready || networkGate.actionBlocked || createContract.isPending}
            loading={createContract.isPending}
            onPress={() => createContract.mutate()}
          >
            Create contract
          </PrimaryButton>
        </BottomActionBar>
      }
    >
      <SectionHeader
        eyebrow="Client escrow"
        title="New contract"
        body="Create a single-contractor milestone contract from mobile using the same invite and smart-account rules as web."
      />

      <SurfaceCard animated variant="elevated">
        <Heading size="section">Readiness</Heading>
        <ReadinessChecklist items={readiness} />
        <MetricRow label="Milestone total" value={formatAmount(totalAmount, { fallback: '0 USDC' })} />
      </SurfaceCard>

      <SurfaceCard animated delay={60}>
        <Heading size="section">Scope</Heading>
        <Field
          label="Title"
          onChangeText={(value) => updateDraft('title', value)}
          placeholder="Escrow-backed product milestone"
          value={draft.title}
        />
        <Textarea
          label="Description"
          onChangeText={(value) => updateDraft('description', value)}
          placeholder="Scope, constraints, and acceptance posture"
          value={draft.description}
        />
        <Field
          autoCapitalize="none"
          label="Category"
          onChangeText={(value) => updateDraft('category', value)}
          placeholder="software-development"
          value={draft.category}
        />
      </SurfaceCard>

      <SurfaceCard animated delay={100}>
        <Heading size="section">Contractor identity</Heading>
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          label="Contractor email"
          onChangeText={(value) => updateDraft('contractorEmail', value)}
          placeholder="contractor@example.com"
          value={draft.contractorEmail}
        />
        <Field
          autoCapitalize="none"
          label="Worker wallet"
          onChangeText={(value) => updateDraft('workerAddress', value)}
          placeholder="0x..."
          value={draft.workerAddress}
        />
        <Field
          autoCapitalize="none"
          label="Settlement token"
          onChangeText={(value) => updateDraft('currencyAddress', value)}
          placeholder="USDC token address"
          value={draft.currencyAddress}
        />
      </SurfaceCard>

      <SurfaceCard animated delay={140}>
        <View style={styles.cardHeader}>
          <Heading size="section">Milestones</Heading>
          <SecondaryButton
            onPress={() =>
              setMilestones((current) => [
                ...current,
                { title: '', deliverable: '', amount: '', dueAt: '' },
              ])
            }
          >
            Add
          </SecondaryButton>
        </View>
        {milestones.map((milestone, index) => (
          <View key={`${index}-${milestone.title}`} style={styles.milestoneBlock}>
            <Heading size="section">Milestone {index + 1}</Heading>
            <Field
              label="Title"
              onChangeText={(value) => updateMilestone(index, 'title', value)}
              placeholder="Milestone title"
              value={milestone.title}
            />
            <Textarea
              label="Deliverable"
              onChangeText={(value) => updateMilestone(index, 'deliverable', value)}
              placeholder="Evidence and acceptance criteria"
              value={milestone.deliverable}
            />
            <Field
              keyboardType="decimal-pad"
              label="Amount"
              onChangeText={(value) => updateMilestone(index, 'amount', value)}
              placeholder="1000"
              value={milestone.amount}
            />
            <Field
              label="Due date"
              onChangeText={(value) => updateMilestone(index, 'dueAt', value)}
              placeholder="Optional, for example 2026-05-15"
              value={milestone.dueAt}
            />
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard animated delay={180}>
        <Heading size="section">Terms</Heading>
        <SegmentedControl
          value={draft.disputeModel}
          onChange={(value) => updateDraft('disputeModel', value)}
          options={[
            { label: 'Operator', value: 'operator-mediation' },
            { label: 'Mutual', value: 'mutual-resolution' },
          ]}
        />
        <Field
          keyboardType="number-pad"
          label="Review window days"
          onChangeText={(value) => updateDraft('reviewWindowDays', value)}
          value={draft.reviewWindowDays}
        />
        <Textarea
          label="Evidence expectation"
          onChangeText={(value) => updateDraft('evidenceExpectation', value)}
          value={draft.evidenceExpectation}
        />
        <Textarea
          label="Kickoff note"
          onChangeText={(value) => updateDraft('kickoffNote', value)}
          value={draft.kickoffNote}
        />
      </SurfaceCard>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  milestoneBlock: {
    gap: 10,
  },
});
