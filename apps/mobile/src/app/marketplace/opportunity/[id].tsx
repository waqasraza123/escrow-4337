import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  canApplyToOpportunity,
  formatTimestamp,
  parseDateMs,
  splitList,
  type MarketplaceOpportunityDetail,
} from '@escrow4334/product-core';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  BottomActionBar,
  ChipWrap,
  EmptyState,
  Field,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SecondaryButton,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
  Textarea,
} from '@/ui/primitives';

export default function OpportunityDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const opportunity = useQuery({
    enabled: Boolean(id),
    queryKey: ['marketplace', 'opportunity', id],
    queryFn: () => api.getMarketplaceOpportunity(id),
  });
  const walletOptions = useMemo(
    () => user?.wallets.map((wallet) => wallet.address) ?? [],
    [user?.wallets],
  );
  const defaultWallet =
    user?.defaultExecutionWalletAddress ?? walletOptions[0] ?? '';
  const canApply = Boolean(accessToken && canApplyToOpportunity(user?.activeWorkspace));
  const apply = useMutation({
    mutationFn: async (input: NativeApplicationInput) => {
      if (!accessToken || !id) {
        throw new Error('Sign in before applying.');
      }
      networkGate.requireOnline('Submitting a marketplace application');

      return api.applyToMarketplaceOpportunity(id, input, accessToken);
    },
    onSuccess: async () => {
      Alert.alert(
        'Application submitted',
        'Your proposal is now in the client review pipeline.',
      );
      setApplyOpen(false);
      await opportunity.refetch();
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'analytics'] });
    },
    onError: (error) => {
      Alert.alert(
        'Application failed',
        error instanceof Error ? error.message : 'The proposal could not be submitted.',
      );
    },
  });

  return (
    <ScrollScreen
      footer={
        opportunity.data ? (
          <BottomActionBar>
            <PrimaryButton
              onPress={() => {
                if (!user) {
                  router.push('/sign-in');
                  return;
                }
                if (!canApply) {
                  Alert.alert(
                    'Freelancer workspace required',
                    'Switch to a freelancer or agency workspace before submitting a proposal.',
                  );
                  return;
                }
                if (!defaultWallet) {
                  Alert.alert(
                    'Wallet required',
                    'Link or provision a wallet before submitting a wallet-bound proposal.',
                  );
                  return;
                }
                try {
                  networkGate.requireOnline('Opening marketplace application');
                } catch (error) {
                  Alert.alert(
                    'Application unavailable',
                    error instanceof Error ? error.message : 'Network state is unavailable.',
                  );
                  return;
                }
                setApplyOpen((current) => !current);
              }}
            >
              {user ? (applyOpen ? 'Review opportunity' : 'Apply now') : 'Sign in to apply'}
            </PrimaryButton>
          </BottomActionBar>
        ) : undefined
      }
    >
      {opportunity.isLoading ? <SkeletonCard /> : null}
      {opportunity.data ? (
        <>
          <SectionHeader
            eyebrow="Opportunity"
            title={opportunity.data.opportunity.title}
            body={opportunity.data.opportunity.summary}
          />
          <ChipWrap values={opportunity.data.opportunity.requiredSkills} />

          <SurfaceCard animated variant="elevated">
            <StatusBadge label={opportunity.data.opportunity.status} tone="info" />
            <BodyText>{opportunity.data.opportunity.description}</BodyText>
            <MetricRow
              label="Budget"
              value={`${opportunity.data.opportunity.budgetMin || 'Open'} to ${
                opportunity.data.opportunity.budgetMax || 'Open'
              }`}
            />
            <MetricRow label="Applications" value={opportunity.data.opportunity.applicationCount} />
            <MetricRow
              label="Engagement"
              value={opportunity.data.opportunity.engagementType.replaceAll('_', ' ')}
            />
            <MetricRow
              label="Desired start"
              value={formatTimestamp(opportunity.data.opportunity.desiredStartAt, {
                fallback: 'Flexible',
              })}
            />
          </SurfaceCard>

          <SurfaceCard animated delay={80}>
            <Heading size="section">Delivery expectations</Heading>
            <ChipWrap values={opportunity.data.opportunity.outcomes.slice(0, 4)} />
            <BodyText>{opportunity.data.opportunity.timeline}</BodyText>
          </SurfaceCard>

          {applyOpen && canApply ? (
            <NativeApplicationForm
              defaultWallet={defaultWallet}
              disabled={networkGate.actionBlocked || apply.isPending}
              onCancel={() => setApplyOpen(false)}
              onSubmit={(input) => apply.mutate(input)}
              opportunity={opportunity.data.opportunity}
              walletOptions={walletOptions}
            />
          ) : null}
        </>
      ) : opportunity.isError ? (
        <EmptyState
          title="Opportunity unavailable"
          body="This opportunity could not be loaded from the API."
        />
      ) : null}
    </ScrollScreen>
  );
}

type NativeApplicationInput = Parameters<
  typeof api.applyToMarketplaceOpportunity
>[1];

function NativeApplicationForm({
  defaultWallet,
  disabled,
  onCancel,
  onSubmit,
  opportunity,
  walletOptions,
}: {
  defaultWallet: string;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (input: NativeApplicationInput) => void;
  opportunity: MarketplaceOpportunityDetail;
  walletOptions: string[];
}) {
  const [coverNote, setCoverNote] = useState('');
  const [deliveryApproach, setDeliveryApproach] = useState('');
  const [milestonePlanSummary, setMilestonePlanSummary] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [selectedWalletAddress, setSelectedWalletAddress] = useState(defaultWallet);
  const [estimatedStart, setEstimatedStart] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function submit() {
    const missingRequiredAnswer = opportunity.screeningQuestions.find(
      (question) => question.required && !answers[question.id]?.trim(),
    );

    if (!coverNote.trim() || !deliveryApproach.trim() || !milestonePlanSummary.trim()) {
      Alert.alert(
        'Proposal incomplete',
        'Add a cover note, delivery approach, and milestone plan before submitting.',
      );
      return;
    }

    if (missingRequiredAnswer) {
      Alert.alert('Screening answer required', missingRequiredAnswer.prompt);
      return;
    }

    if (!selectedWalletAddress.trim()) {
      Alert.alert('Wallet required', 'Select the wallet that should be bound to the proposal.');
      return;
    }

    onSubmit({
      coverNote: coverNote.trim(),
      deliveryApproach: deliveryApproach.trim(),
      estimatedStartAt: parseDateMs(estimatedStart),
      milestonePlanSummary: milestonePlanSummary.trim(),
      portfolioUrls: splitList(portfolioUrls),
      proposedRate: proposedRate.trim() || null,
      relevantProofArtifacts: [],
      screeningAnswers: opportunity.screeningQuestions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id]?.trim() ?? '',
      })),
      selectedWalletAddress: selectedWalletAddress.trim(),
    });
  }

  return (
    <SurfaceCard animated delay={120} variant="elevated">
      <Heading size="section">Native proposal</Heading>
      <BodyText>
        Submit a structured proposal from the active freelancer or agency workspace. The selected
        wallet is the execution identity for the downstream escrow invite.
      </BodyText>

      <Textarea
        editable={!disabled}
        label="Cover note"
        onChangeText={setCoverNote}
        placeholder="Why this scope, why you, and what the client gets first"
        value={coverNote}
      />
      <Textarea
        editable={!disabled}
        label="Delivery approach"
        onChangeText={setDeliveryApproach}
        placeholder="How you will validate requirements and deliver the first milestone"
        value={deliveryApproach}
      />
      <Textarea
        editable={!disabled}
        label="Milestone plan"
        onChangeText={setMilestonePlanSummary}
        placeholder="Milestone names, review points, and escrow release posture"
        value={milestonePlanSummary}
      />

      {opportunity.screeningQuestions.map((question) => (
        <Textarea
          editable={!disabled}
          key={question.id}
          label={question.required ? `${question.prompt} *` : question.prompt}
          onChangeText={(answer) =>
            setAnswers((current) => ({ ...current, [question.id]: answer }))
          }
          placeholder="Answer for the client review board"
          value={answers[question.id] ?? ''}
        />
      ))}

      <Field
        editable={!disabled}
        label="Proposed rate"
        onChangeText={setProposedRate}
        placeholder="Optional"
        value={proposedRate}
      />
      <Field
        autoCapitalize="none"
        editable={!disabled}
        label="Selected wallet"
        onChangeText={setSelectedWalletAddress}
        placeholder={walletOptions.length ? 'Wallet address' : 'Link a wallet first'}
        value={selectedWalletAddress}
      />
      <Field
        editable={!disabled}
        label="Estimated start"
        onChangeText={setEstimatedStart}
        placeholder="Optional date, for example 2026-05-15"
        value={estimatedStart}
      />
      <Textarea
        autoCapitalize="none"
        editable={!disabled}
        label="Portfolio URLs"
        onChangeText={setPortfolioUrls}
        placeholder="Optional, comma-separated"
        value={portfolioUrls}
      />

      <PrimaryButton disabled={disabled} loading={disabled} onPress={submit}>
        Submit application
      </PrimaryButton>
      <SecondaryButton disabled={disabled} onPress={onCancel}>
        Cancel
      </SecondaryButton>
    </SurfaceCard>
  );
}
