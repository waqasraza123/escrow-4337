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

  const connectionLabel = network.initialized
    ? network.offline
      ? 'Offline'
      : 'Online'
    : 'Checking';

  return (
    <SurfaceCard animated delay={delay} variant={network.offline ? 'soft' : 'default'}>
      <Heading size="section">Network</Heading>
      <StatusBadge
        label={connectionLabel}
        tone={
          network.initialized
            ? network.offline
              ? 'warning'
              : 'success'
            : 'muted'
        }
      />
      {!compact ? (
        <BodyText>
          Mobile queries pause when the device is offline. Mutating actions should be retried after
          connectivity returns.
        </BodyText>
      ) : null}
      <MetricRow label="Transport" value={network.connectionType} />
      <MetricRow label="API target" value={network.apiBaseUrl} />
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
        <MetricRow
          label="Last update"
          value={formatTimestamp(network.lastChangedAt, { fallback: 'Not checked' })}
        />
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
