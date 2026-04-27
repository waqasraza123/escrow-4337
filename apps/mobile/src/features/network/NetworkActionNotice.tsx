import { StyleSheet, View } from 'react-native';
import { BodyText, StatusBadge } from '@/ui/primitives';
import { useNetworkActionGate } from './useNetworkActionGate';

export function NetworkActionNotice({ action }: { action: string }) {
  const networkGate = useNetworkActionGate();

  if (!networkGate.actionBlocked) {
    return null;
  }

  return (
    <View style={styles.notice}>
      <StatusBadge label="Action paused" tone="warning" />
      <BodyText>
        {action} is paused. {networkGate.blockedReason} Refresh network state after connectivity
        returns.
      </BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: 8,
  },
});
