import { useQueryClient } from '@tanstack/react-query';
import { formatTimestamp } from '@escrow4334/product-core';
import { useMobileNetwork } from '@/providers/network';
import {
  BodyText,
  Heading,
  MetricRow,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export function NetworkStatusCard({
  compact = false,
  delay = 40,
}: {
  compact?: boolean;
  delay?: number;
}) {
  const network = useMobileNetwork();
  const queryClient = useQueryClient();

  const apiUnavailable = network.apiReachability.status === 'unreachable';
  const connectionLabel = network.initialized
    ? network.offline
      ? 'Offline'
      : apiUnavailable
        ? 'API unreachable'
      : 'Online'
    : 'Checking';
  const statusTone = network.initialized
    ? network.offline || apiUnavailable
      ? 'warning'
      : 'success'
    : 'muted';
  const apiStatusLabel =
    network.apiReachability.status === 'unchecked'
      ? 'Not checked'
      : network.apiReachability.status === 'checking'
        ? 'Checking'
        : network.apiReachability.status === 'reachable'
          ? network.apiReachability.latencyMs === null
            ? 'Reachable'
            : `Reachable in ${network.apiReachability.latencyMs}ms`
          : network.apiReachability.status === 'skipped'
            ? 'Skipped while offline'
            : 'Unreachable';

  return (
    <SurfaceCard
      animated
      delay={delay}
      variant={network.offline || apiUnavailable ? 'soft' : 'default'}
    >
      <Heading size="section">Network</Heading>
      <StatusBadge label={connectionLabel} tone={statusTone} />
      {!compact ? (
        <BodyText>
          Mobile queries pause when the device is offline. API reachability is checked separately
          so service outages do not look like local connection problems.
        </BodyText>
      ) : null}
      <MetricRow label="Transport" value={network.connectionType} />
      <MetricRow label="API target" value={network.apiBaseUrl} />
      <MetricRow label="API reachability" value={apiStatusLabel} />
      <MetricRow
        label="Internet"
        value={
          network.isInternetReachable === null
            ? 'Unknown'
            : network.isInternetReachable
              ? 'Reachable'
              : 'Unavailable'
        }
      />
      {!compact ? (
        <>
          <MetricRow
            label="Last network update"
            value={formatTimestamp(network.lastChangedAt, { fallback: 'Not checked' })}
          />
          <MetricRow
            label="Last API check"
            value={formatTimestamp(network.apiReachability.checkedAt, {
              fallback: 'Not checked',
            })}
          />
        </>
      ) : null}
      {apiUnavailable && network.apiReachability.error ? (
        <BodyText>{network.apiReachability.error}</BodyText>
      ) : null}
      <SecondaryButton
        onPress={async () => {
          await network.refresh();
          await queryClient.invalidateQueries({});
        }}
      >
        Refresh network state
      </SecondaryButton>
    </SurfaceCard>
  );
}
