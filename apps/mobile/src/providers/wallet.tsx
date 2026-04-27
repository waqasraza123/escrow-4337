import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';

import {
  AppKit,
  AppKitProvider,
  useAccount,
  useAppKit,
  useProvider,
} from '@reown/appkit-react-native';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { api } from './api';
import { useMobileNetwork } from './network';
import { useSession } from './session';
import {
  getMobileWalletNetworkName,
  isMobileWalletSupportedChain,
  mobileAppKit,
  mobileWalletDefaultChainId,
  mobileWalletMetadata,
  mobileWalletProjectId,
  mobileWalletSupportedChainIds,
} from './wallet-config';

export type MobileWalletPhase =
  | 'unconfigured'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'wrong_chain'
  | 'signing'
  | 'verifying'
  | 'provisioning'
  | 'setting_default'
  | 'success'
  | 'error';

type MobileWalletContextValue = {
  configured: boolean;
  projectId: string | null;
  address: string | null;
  chainId: number | null;
  defaultChainId: number;
  supportedChainIds: number[];
  chainSupported: boolean;
  connectedNetworkName: string;
  defaultNetworkName: string;
  metadataUrl: string;
  redirectNative: string;
  isConnected: boolean;
  phase: MobileWalletPhase;
  message: string;
  openConnector: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  linkConnectedWallet: (label?: string) => Promise<void>;
  provisionSmartAccount: (ownerAddress?: string, label?: string) => Promise<void>;
  setDefaultWallet: (address: string) => Promise<void>;
  clearStatus: () => void;
};

type WalletRequestProvider = {
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown> | object;
  }): Promise<T>;
};

const unconfiguredMessage =
  'Native wallet linking needs EXPO_PUBLIC_REOWN_PROJECT_ID before WalletConnect can open.';

const MobileWalletContext = createContext<MobileWalletContextValue | null>(null);

function normalizeError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const lower = message.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'The wallet request was rejected. You can retry when you are ready.';
  }
  if (lower.includes('cancel')) {
    return 'Wallet connection was cancelled. No wallet was linked.';
  }
  if (lower.includes('expired')) {
    return 'The wallet challenge expired. Request a fresh signature and try again.';
  }
  if (lower.includes('already linked')) {
    return 'That wallet is already linked to another account.';
  }
  if (lower.includes('network') || lower.includes('chain')) {
    return message;
  }
  return message || fallback;
}

function parseChainId(value: string | undefined) {
  if (!value) {
    return null;
  }
  const cleaned = value.includes(':') ? value.split(':').at(-1) : value;
  const parsed = Number.parseInt(cleaned ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function StaticMobileWalletProvider({ children }: { children: ReactNode }) {
  const value = useMemo<MobileWalletContextValue>(
    () => ({
      configured: false,
      projectId: null,
      address: null,
      chainId: null,
      defaultChainId: mobileWalletDefaultChainId,
      supportedChainIds: mobileWalletSupportedChainIds,
      chainSupported: false,
      connectedNetworkName: 'Not connected',
      defaultNetworkName: getMobileWalletNetworkName(mobileWalletDefaultChainId),
      metadataUrl: mobileWalletMetadata.url,
      redirectNative: mobileWalletMetadata.redirectNative,
      isConnected: false,
      phase: 'unconfigured',
      message: unconfiguredMessage,
      openConnector: async () => undefined,
      disconnectWallet: async () => undefined,
      linkConnectedWallet: async () => undefined,
      provisionSmartAccount: async () => undefined,
      setDefaultWallet: async () => undefined,
      clearStatus: () => undefined,
    }),
    [],
  );

  return <MobileWalletContext.Provider value={value}>{children}</MobileWalletContext.Provider>;
}

function MobileWalletRuntime({ children }: { children: ReactNode }) {
  const { accessToken, setUser } = useSession();
  const network = useMobileNetwork();
  const { open, disconnect } = useAppKit();
  const account = useAccount();
  const { provider, providerType } = useProvider();
  const [phase, setPhase] = useState<MobileWalletPhase>('idle');
  const [message, setMessage] = useState('Connect a mobile wallet to finish setup.');

  const chainId = parseChainId(account.chainId);
  const address = account.address ?? null;
  const chainSupported = !account.isConnected || isMobileWalletSupportedChain(chainId);
  const connectedNetworkName = account.isConnected
    ? getMobileWalletNetworkName(chainId)
    : 'Not connected';
  const defaultNetworkName = getMobileWalletNetworkName(mobileWalletDefaultChainId);
  const evmProvider =
    providerType === 'eip155' ? (provider as WalletRequestProvider | undefined) : undefined;

  const refreshUser = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const profile = await api.me(accessToken);
    setUser(profile);
  }, [accessToken, setUser]);

  const openConnector = useCallback(async () => {
    try {
      network.requireOnline('Opening the wallet connector');
    } catch (error) {
      setPhase('error');
      setMessage(error instanceof Error ? error.message : 'Reconnect before opening a wallet.');
      return;
    }

    try {
      setPhase('connecting');
      setMessage('Choose your wallet and approve the connection request.');
      await open({ view: 'Connect' });
    } catch (error) {
      setPhase('error');
      setMessage(normalizeError(error, 'Could not open the wallet connector.'));
    }
  }, [network, open]);

  const disconnectWallet = useCallback(async () => {
    await disconnect('eip155');
    setPhase('idle');
    setMessage('Wallet disconnected from this device.');
  }, [disconnect]);

  const linkConnectedWallet = useCallback(
    async (label?: string) => {
      if (!accessToken) {
        setPhase('error');
        setMessage('Sign in before linking a wallet.');
        return;
      }
      try {
        network.requireOnline('Linking a wallet');
      } catch (error) {
        setPhase('error');
        setMessage(error instanceof Error ? error.message : 'Reconnect before linking a wallet.');
        return;
      }
      if (!address || !evmProvider) {
        setPhase('error');
        setMessage('Connect an EVM wallet before requesting a SIWE signature.');
        return;
      }
      if (!chainSupported) {
        setPhase('wrong_chain');
        setMessage(
          `Switch the connected wallet to ${defaultNetworkName} before linking. Connected network: ${connectedNetworkName}.`,
        );
        return;
      }

      const resolvedChainId = chainId ?? mobileWalletDefaultChainId;

      try {
        setPhase('signing');
        setMessage('Creating a wallet ownership challenge...');
        const challenge = await api.createWalletChallenge(
          {
            address,
            walletKind: 'eoa',
            chainId: resolvedChainId,
            label: label?.trim() || 'Mobile wallet',
          },
          accessToken,
        );

        setMessage('Approve the signature request in your wallet.');
        const signature = await evmProvider.request<string>({
          method: 'personal_sign',
          params: [challenge.message, address],
        });

        setPhase('verifying');
        setMessage('Verifying wallet ownership with the escrow API...');
        await api.verifyWalletChallenge(
          {
            challengeId: challenge.challengeId,
            message: challenge.message,
            signature,
          },
          accessToken,
        );
        await refreshUser();
        setPhase('success');
        setMessage('Wallet linked. Setup readiness has been updated.');
      } catch (error) {
        setPhase('error');
        setMessage(normalizeError(error, 'Failed to link wallet.'));
      }
    },
    [
      accessToken,
      address,
      chainId,
      chainSupported,
      connectedNetworkName,
      defaultNetworkName,
      evmProvider,
      network,
      refreshUser,
    ],
  );

  const provisionSmartAccount = useCallback(
    async (ownerAddress?: string, label?: string) => {
      if (!accessToken) {
        setPhase('error');
        setMessage('Sign in before provisioning a smart account.');
        return;
      }
      try {
        network.requireOnline('Provisioning a smart account');
      } catch (error) {
        setPhase('error');
        setMessage(
          error instanceof Error ? error.message : 'Reconnect before provisioning a smart account.',
        );
        return;
      }
      const resolvedOwnerAddress = ownerAddress || address;
      if (!resolvedOwnerAddress) {
        setPhase('error');
        setMessage('Link an owner wallet before provisioning a smart account.');
        return;
      }

      try {
        setPhase('provisioning');
        setMessage('Provisioning the execution wallet through the escrow API...');
        const response = await api.provisionSmartAccount(
          {
            ownerAddress: resolvedOwnerAddress,
            label: label?.trim() || 'Mobile execution wallet',
            setAsDefault: true,
          },
          accessToken,
        );
        await refreshUser();
        setPhase('success');
        setMessage(`Smart account ready. Sponsorship policy: ${response.sponsorship.policy}.`);
      } catch (error) {
        setPhase('error');
        setMessage(normalizeError(error, 'Failed to provision smart account.'));
      }
    },
    [accessToken, address, network, refreshUser],
  );

  const setDefaultWallet = useCallback(
    async (walletAddress: string) => {
      if (!accessToken) {
        setPhase('error');
        setMessage('Sign in before changing the default wallet.');
        return;
      }
      try {
        network.requireOnline('Changing the default wallet');
      } catch (error) {
        setPhase('error');
        setMessage(
          error instanceof Error ? error.message : 'Reconnect before changing the default wallet.',
        );
        return;
      }
      try {
        setPhase('setting_default');
        setMessage('Updating default execution wallet...');
        await api.setDefaultWallet(walletAddress, accessToken);
        await refreshUser();
        setPhase('success');
        setMessage('Default execution wallet updated.');
      } catch (error) {
        setPhase('error');
        setMessage(normalizeError(error, 'Failed to update default wallet.'));
      }
    },
    [accessToken, network, refreshUser],
  );

  const clearStatus = useCallback(() => {
    setPhase(account.isConnected ? 'connected' : 'idle');
    setMessage(
      account.isConnected
        ? 'Wallet connected. Sign once to link it to this account.'
        : 'Connect a mobile wallet to finish setup.',
    );
  }, [account.isConnected]);

  const value = useMemo<MobileWalletContextValue>(
    () => ({
      configured: true,
      projectId: mobileWalletProjectId,
      address,
      chainId,
      defaultChainId: mobileWalletDefaultChainId,
      supportedChainIds: mobileWalletSupportedChainIds,
      chainSupported,
      connectedNetworkName,
      defaultNetworkName,
      metadataUrl: mobileWalletMetadata.url,
      redirectNative: mobileWalletMetadata.redirectNative,
      isConnected: account.isConnected,
      phase:
        account.isConnected && !chainSupported
          ? 'wrong_chain'
          : account.isConnected && phase === 'connecting'
            ? 'connected'
            : phase,
      message:
        account.isConnected && !chainSupported
          ? `Switch to ${defaultNetworkName} before signing. Connected network: ${connectedNetworkName}.`
          : account.isConnected && phase === 'connecting'
            ? 'Wallet connected. Sign once to link it to this account.'
            : message,
      openConnector,
      disconnectWallet,
      linkConnectedWallet,
      provisionSmartAccount,
      setDefaultWallet,
      clearStatus,
    }),
    [
      account.isConnected,
      address,
      chainId,
      chainSupported,
      clearStatus,
      connectedNetworkName,
      defaultNetworkName,
      disconnectWallet,
      linkConnectedWallet,
      message,
      openConnector,
      phase,
      provisionSmartAccount,
      setDefaultWallet,
    ],
  );

  return (
    <MobileWalletContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.appKitHost}>
        <AppKit />
      </View>
    </MobileWalletContext.Provider>
  );
}

export function MobileWalletProvider({ children }: { children: ReactNode }) {
  if (!mobileAppKit) {
    return <StaticMobileWalletProvider>{children}</StaticMobileWalletProvider>;
  }

  return (
    <AppKitProvider instance={mobileAppKit}>
      <MobileWalletRuntime>{children}</MobileWalletRuntime>
    </AppKitProvider>
  );
}

export function useMobileWallet() {
  const value = useContext(MobileWalletContext);
  if (!value) {
    throw new Error('useMobileWallet must be used inside MobileWalletProvider.');
  }
  return value;
}

const styles = {
  appKitHost: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
} as const;
