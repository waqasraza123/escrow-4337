import { StyleSheet, Text, View } from 'react-native';
import { previewHash, type UserProfile, type UserWallet } from '@escrow4334/product-core';
import { useMobileWallet } from '@/providers/wallet';
import { useMobileNetwork } from '@/providers/network';
import { useMobileTheme } from '@/providers/theme';
import {
  AnimatedReveal,
  BodyText,
  Heading,
  MetricRow,
  PrimaryButton,
  ReadinessChecklist,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

function getLinkedEoa(user: UserProfile | null) {
  return user?.wallets.find(
    (wallet) => wallet.walletKind === 'eoa' && wallet.verificationMethod === 'siwe',
  );
}

function getSmartAccount(user: UserProfile | null, ownerAddress?: string) {
  return user?.wallets.find(
    (wallet) =>
      wallet.walletKind === 'smart_account' &&
      (!ownerAddress || wallet.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()),
  );
}

export function WalletSetupCard({ user }: { user: UserProfile | null }) {
  const theme = useMobileTheme();
  const wallet = useMobileWallet();
  const network = useMobileNetwork();
  const linkedEoa = getLinkedEoa(user);
  const smartAccount = getSmartAccount(user, linkedEoa?.address);
  const hasDefaultSmartAccount = Boolean(
    user?.defaultExecutionWalletAddress &&
      user.wallets.some(
        (candidate) =>
          candidate.walletKind === 'smart_account' &&
          candidate.address === user.defaultExecutionWalletAddress,
      ),
  );

  const busy = [
    'connecting',
    'signing',
    'verifying',
    'provisioning',
    'setting_default',
  ].includes(wallet.phase);
  const actionBlocked = network.offline || network.apiReachability.status === 'unreachable';
  const connectedAddress = wallet.address || linkedEoa?.address || null;
  const connectedOnUnsupportedChain = wallet.isConnected && !wallet.chainSupported;

  const primaryAction = !user
    ? null
    : !wallet.configured
      ? null
      : connectedOnUnsupportedChain
        ? {
            label: 'Open wallet connector',
            onPress: wallet.openConnector,
          }
      : !wallet.isConnected && !linkedEoa
        ? {
            label: 'Connect wallet',
            onPress: wallet.openConnector,
          }
        : !linkedEoa
          ? {
              label: 'Sign and link wallet',
              onPress: () => wallet.linkConnectedWallet('Mobile signer'),
            }
          : !smartAccount
            ? {
                label: 'Provision execution wallet',
                onPress: () => wallet.provisionSmartAccount(linkedEoa.address),
              }
            : !hasDefaultSmartAccount
              ? {
                  label: 'Set smart account default',
                  onPress: () => wallet.setDefaultWallet(smartAccount.address),
                }
              : null;

  return (
    <SurfaceCard animated delay={100} variant="elevated">
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Heading size="section">Wallet setup</Heading>
          <BodyText>
            Prove wallet ownership once, then use that wallet for escrow authority and contractor
            access.
          </BodyText>
        </View>
        <StatusBadge
          label={hasDefaultSmartAccount ? 'Complete' : linkedEoa ? 'Wallet linked' : 'Action needed'}
          tone={hasDefaultSmartAccount ? 'success' : linkedEoa ? 'info' : 'warning'}
        />
      </View>

      <ReadinessChecklist
        items={[
          { label: 'Email session active', ready: Boolean(user) },
          { label: 'Mobile wallet connected', ready: wallet.isConnected || Boolean(linkedEoa) },
          {
            label: `Wallet network is ${wallet.defaultNetworkName}`,
            ready: !wallet.isConnected || wallet.chainSupported,
          },
          { label: 'SIWE wallet linked', ready: Boolean(linkedEoa) },
          { label: 'Default execution wallet ready', ready: hasDefaultSmartAccount },
        ]}
      />

      <AnimatedReveal visible={Boolean(connectedAddress)}>
        <MetricRow
          label={linkedEoa ? 'Linked wallet' : 'Connected wallet'}
          value={previewHash(connectedAddress)}
        />
      </AnimatedReveal>
      <AnimatedReveal visible={Boolean(user?.defaultExecutionWalletAddress)}>
        <MetricRow
          label="Default execution"
          value={previewHash(user?.defaultExecutionWalletAddress)}
        />
      </AnimatedReveal>
      <MetricRow
        label="Target network"
        value={`${wallet.defaultNetworkName} (${wallet.defaultChainId})`}
      />
      <MetricRow label="WalletConnect redirect" value={wallet.redirectNative} />
      <AnimatedReveal visible={wallet.isConnected}>
        <MetricRow
          label="Connected network"
          value={`${wallet.connectedNetworkName}${wallet.chainId ? ` (${wallet.chainId})` : ''}`}
        />
      </AnimatedReveal>
      <AnimatedReveal visible={!wallet.configured}>
        <BodyText style={styles.stateText}>
          Configure `EXPO_PUBLIC_REOWN_PROJECT_ID` before testing native wallet connection on a
          device.
        </BodyText>
      </AnimatedReveal>
      <AnimatedReveal visible={connectedOnUnsupportedChain}>
        <StatusBadge label="Switch to Base before signing" tone="warning" />
      </AnimatedReveal>

      {wallet.message ? (
        <BodyText
          style={[
            styles.stateText,
            wallet.phase === 'error' ? { color: theme.status.danger.foreground } : undefined,
          ]}
        >
          {wallet.message}
        </BodyText>
      ) : null}

      {primaryAction ? (
        <PrimaryButton
          disabled={busy || actionBlocked}
          loading={busy}
          onPress={primaryAction.onPress}
        >
          {primaryAction.label}
        </PrimaryButton>
      ) : hasDefaultSmartAccount ? (
        <StatusBadge label="Ready for escrow actions" tone="success" />
      ) : !wallet.configured ? (
        <StatusBadge label="WalletConnect project ID missing" tone="warning" />
      ) : null}

      <AnimatedReveal visible={wallet.isConnected && !linkedEoa}>
        <SecondaryButton disabled={busy} onPress={wallet.disconnectWallet}>
          Disconnect wallet
        </SecondaryButton>
      </AnimatedReveal>
    </SurfaceCard>
  );
}

export function WalletDiagnosticsCard() {
  const wallet = useMobileWallet();

  return (
    <SurfaceCard animated delay={220}>
      <Heading size="section">Wallet diagnostics</Heading>
      <BodyText>
        Device wallet readiness is derived from the configured WalletConnect project, deep-link
        redirect, target Base network, and the currently connected EVM account.
      </BodyText>
      <MetricRow
        label="Connector"
        value={wallet.configured ? 'WalletConnect configured' : 'Project ID missing'}
      />
      <MetricRow
        label="Project"
        value={wallet.projectId ? previewHash(wallet.projectId) : 'Missing'}
      />
      <MetricRow label="Metadata URL" value={wallet.metadataUrl} />
      <MetricRow label="Native redirect" value={wallet.redirectNative} />
      <MetricRow
        label="Target chain"
        value={`${wallet.defaultNetworkName} (${wallet.defaultChainId})`}
      />
      <MetricRow label="Supported chains" value={wallet.supportedChainIds.join(', ')} />
      <MetricRow
        label="Connected chain"
        value={
          wallet.isConnected
            ? `${wallet.connectedNetworkName}${wallet.chainId ? ` (${wallet.chainId})` : ''}`
            : 'Not connected'
        }
      />
      <StatusBadge
        label={wallet.chainSupported ? 'Chain accepted' : 'Wrong or missing chain'}
        tone={wallet.chainSupported ? 'success' : 'warning'}
      />
    </SurfaceCard>
  );
}

export function WalletListCard({
  user,
  title = 'Linked wallets',
}: {
  user: UserProfile | null;
  title?: string;
}) {
  const theme = useMobileTheme();
  const wallet = useMobileWallet();
  const network = useMobileNetwork();
  const wallets = user?.wallets ?? [];
  const busy = wallet.phase === 'setting_default';
  const actionBlocked = network.offline || network.apiReachability.status === 'unreachable';

  return (
    <SurfaceCard animated delay={160}>
      <Heading size="section">{title}</Heading>
      {wallets.length === 0 ? (
        <BodyText>No wallets are linked to this account yet.</BodyText>
      ) : (
        <View style={styles.walletStack}>
          {wallets.map((item) => (
            <WalletListItem
              key={`${item.walletKind}-${item.address}`}
              defaultAddress={user?.defaultExecutionWalletAddress ?? null}
              disabled={busy || actionBlocked}
              onSetDefault={wallet.setDefaultWallet}
              themeForeground={theme.colors.foreground}
              themePrimary={theme.colors.primary}
              wallet={item}
            />
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

function WalletListItem({
  wallet,
  defaultAddress,
  disabled,
  themeForeground,
  themePrimary,
  onSetDefault,
}: {
  wallet: UserWallet;
  defaultAddress: string | null;
  disabled: boolean;
  themeForeground: string;
  themePrimary: string;
  onSetDefault: (address: string) => Promise<void>;
}) {
  const isDefault = wallet.address === defaultAddress;
  const label =
    wallet.walletKind === 'smart_account'
      ? wallet.label || 'Execution wallet'
      : wallet.label || 'Verified signer';
  const meta =
    wallet.walletKind === 'smart_account'
      ? `Smart account · Chain ${wallet.chainId}`
      : `EOA · Chain ${wallet.verificationChainId ?? 'unknown'}`;

  return (
    <View style={styles.walletItem}>
      <View style={styles.walletItemHeader}>
        <View style={styles.walletItemCopy}>
          <Text style={[styles.walletLabel, { color: themeForeground }]}>{label}</Text>
          <BodyText style={styles.walletMeta}>{meta}</BodyText>
        </View>
        <StatusBadge
          label={isDefault ? 'Default' : wallet.walletKind === 'smart_account' ? 'Ready' : 'Linked'}
          tone={isDefault ? 'success' : wallet.walletKind === 'smart_account' ? 'info' : 'muted'}
        />
      </View>
      <Text selectable style={[styles.walletAddress, { color: themePrimary }]}>
        {previewHash(wallet.address)}
      </Text>
      {!isDefault ? (
        <SecondaryButton disabled={disabled} onPress={() => onSetDefault(wallet.address)}>
          Set as default
        </SecondaryButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    gap: 6,
  },
  stateText: {
    fontSize: 13,
  },
  walletStack: {
    gap: 12,
  },
  walletItem: {
    gap: 10,
  },
  walletItemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  walletItemCopy: {
    flex: 1,
    gap: 2,
  },
  walletLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  walletMeta: {
    fontSize: 13,
  },
  walletAddress: {
    fontFamily: 'Courier',
    fontSize: 13,
    fontWeight: '700',
  },
});
