import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  canJoinContract,
  getJoinReadinessCopy,
  normalizeInviteToken,
} from '@/features/contracts/contractor-join';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Field,
  HashText,
  Heading,
  MetricRow,
  PrimaryButton,
  ReadinessChecklist,
  ScrollScreen,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export default function ContractorJoinRoute() {
  const params = useLocalSearchParams<{
    jobId?: string;
    id?: string;
    invite?: string;
    inviteToken?: string;
  }>();
  const { accessToken } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState(() => normalizeInviteToken(params.jobId ?? params.id));
  const [inviteToken, setInviteToken] = useState(() =>
    normalizeInviteToken(params.inviteToken ?? params.invite),
  );
  const normalizedJobId = jobId.trim();
  const normalizedInviteToken = inviteToken.trim();

  const readiness = useQuery({
    enabled: Boolean(accessToken && normalizedJobId),
    queryKey: ['contractor-join-readiness', normalizedJobId, normalizedInviteToken],
    queryFn: () =>
      api.getContractorJoinReadiness(
        normalizedJobId,
        normalizedInviteToken || null,
        accessToken as string,
      ),
  });
  const copy = getJoinReadinessCopy(readiness.data?.status ?? 'invite_required');
  const status = readiness.data?.status;

  const join = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before joining a contract.');
      }
      if (!normalizedJobId || !normalizedInviteToken) {
        throw new Error('Job id and invite token are required.');
      }
      networkGate.requireOnline('Joining a contract');

      return api.joinContractor(normalizedJobId, normalizedInviteToken, accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({
        queryKey: ['contractor-join-readiness', normalizedJobId],
      });
      Alert.alert(
        'Contract joined',
        'Worker delivery is now enabled for this authenticated contractor account.',
      );
      router.replace({
        pathname: '/contracts/[id]',
        params: { id: normalizedJobId },
      });
    },
    onError: (error) => {
      Alert.alert(
        'Join failed',
        error instanceof Error ? error.message : 'The contractor invite could not be joined.',
      );
    },
  });

  if (!accessToken) {
    return (
      <ScrollScreen>
        <SectionHeader
          eyebrow="Contractor invite"
          title="Sign in required"
          body="The contractor email and worker wallet checks run against your authenticated account."
        />
        <EmptyState
          title="Signed out"
          body="Sign in with the invited contractor email, then return to this invite."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Contractor invite"
        title="Join contract"
        body="Confirm the invite token, email, and worker wallet before locking the contractor seat."
      />

      <SurfaceCard animated variant="elevated">
        <Heading size="section">Invite details</Heading>
        <Field
          autoCapitalize="none"
          label="Job id"
          onChangeText={setJobId}
          placeholder="Paste job id"
          value={jobId}
        />
        <Field
          autoCapitalize="none"
          label="Invite token"
          onChangeText={setInviteToken}
          placeholder="Paste invite token"
          value={inviteToken}
        />
        <PrimaryButton
          disabled={!normalizedJobId || networkGate.actionBlocked || readiness.isFetching}
          loading={readiness.isFetching}
          onPress={() => {
            try {
              networkGate.requireOnline('Checking contractor readiness');
              void readiness.refetch();
            } catch (error) {
              Alert.alert(
                'Readiness unavailable',
                error instanceof Error ? error.message : 'Network state is unavailable.',
              );
            }
          }}
        >
          Check readiness
        </PrimaryButton>
      </SurfaceCard>

      {readiness.isError ? (
        <EmptyState
          title="Readiness unavailable"
          body="The invite could not be checked. Confirm the job id, token, and signed-in account."
        />
      ) : null}

      {readiness.data ? (
        <SurfaceCard animated delay={80}>
          <View style={styles.headerRow}>
            <Heading size="section">{copy.title}</Heading>
            <StatusBadge label={readiness.data.status.replaceAll('_', ' ')} tone={copy.tone} />
          </View>
          <BodyText>{copy.body}</BodyText>
          <MetricRow
            label="Contractor email"
            value={readiness.data.contractorEmailHint ?? 'Hidden until invite is valid'}
          />
          <BodyText>Required worker wallet</BodyText>
          <HashText value={readiness.data.workerAddress} />
          <ReadinessChecklist
            items={[
              {
                label: 'Invite token accepted',
                ready: !['invite_required', 'invite_invalid'].includes(readiness.data.status),
              },
              {
                label: 'Contractor email matches signed-in account',
                ready: !['wrong_email', 'invite_required', 'invite_invalid'].includes(
                  readiness.data.status,
                ),
              },
              {
                label: 'Required worker wallet is linked',
                ready: !['wallet_not_linked', 'wrong_wallet'].includes(readiness.data.status),
              },
              {
                label: 'Contractor seat is available',
                ready: readiness.data.status !== 'claimed_by_other',
              },
            ]}
          />
          {readiness.data.linkedWalletAddresses.length ? (
            <>
              <BodyText>Linked wallets</BodyText>
              {readiness.data.linkedWalletAddresses.slice(0, 3).map((address) => (
                <HashText key={address} value={address} />
              ))}
            </>
          ) : null}
          {canJoinContract(status) ? (
            <PrimaryButton
              disabled={networkGate.actionBlocked || join.isPending}
              loading={join.isPending}
              onPress={() => join.mutate()}
            >
              {copy.action}
            </PrimaryButton>
          ) : status === 'joined' ? (
            <PrimaryButton
              onPress={() =>
                router.replace({
                  pathname: '/contracts/[id]',
                  params: { id: normalizedJobId },
                })
              }
            >
              {copy.action}
            </PrimaryButton>
          ) : status === 'wallet_not_linked' || status === 'wrong_wallet' ? (
            <PrimaryButton onPress={() => router.push('/account')}>{copy.action}</PrimaryButton>
          ) : status === 'wrong_email' ? (
            <PrimaryButton onPress={() => router.push('/sign-in')}>{copy.action}</PrimaryButton>
          ) : null}
        </SurfaceCard>
      ) : null}
    </ScrollScreen>
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
});
