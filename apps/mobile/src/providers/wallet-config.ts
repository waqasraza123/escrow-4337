import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  createAppKit,
  type AppKitNetwork,
  type Storage,
} from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';

const appkitStoragePrefix = 'escrow4337.appkit.';
const baseSepoliaChainId = 84532;
const baseMainnetChainId = 8453;
const supportedBaseChainIds = [baseSepoliaChainId, baseMainnetChainId] as const;

function readExtraString(key: string) {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readExtraNumber(key: string) {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const mobileWalletProjectId =
  process.env.EXPO_PUBLIC_REOWN_PROJECT_ID?.trim() || readExtraString('reownProjectId');

export const mobileWalletConfiguredChainId = readPositiveInteger(
  process.env.EXPO_PUBLIC_WALLET_CHAIN_ID,
  readExtraNumber('walletChainId') ?? baseSepoliaChainId,
);

const metadataUrl =
  process.env.EXPO_PUBLIC_WALLETCONNECT_METADATA_URL?.trim() ||
  readExtraString('walletConnectMetadataUrl') ||
  'https://escrow4337.local';

const metadataIcon =
  process.env.EXPO_PUBLIC_WALLETCONNECT_ICON_URL?.trim() ||
  readExtraString('walletConnectIconUrl') ||
  `${metadataUrl.replace(/\/+$/, '')}/icon.png`;

export const mobileWalletRedirectNative = 'escrow4337://';

const baseSepolia: AppKitNetwork = {
  id: baseSepoliaChainId,
  name: 'Base Sepolia',
  chainNamespace: 'eip155',
  caipNetworkId: `eip155:${baseSepoliaChainId}`,
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
};

const baseMainnet: AppKitNetwork = {
  id: baseMainnetChainId,
  name: 'Base',
  chainNamespace: 'eip155',
  caipNetworkId: `eip155:${baseMainnetChainId}`,
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
};

export const mobileWalletNetworks = [baseSepolia, baseMainnet] as const;

export const mobileWalletSupportedChainIds: number[] = [...supportedBaseChainIds];

export const mobileWalletDefaultChainId = mobileWalletSupportedChainIds.includes(
  mobileWalletConfiguredChainId,
)
  ? mobileWalletConfiguredChainId
  : baseSepoliaChainId;

export const mobileWalletDefaultNetwork =
  mobileWalletNetworks.find((network) => Number(network.id) === mobileWalletDefaultChainId) ??
  baseSepolia;

export const mobileWalletMetadata = {
  url: metadataUrl,
  icon: metadataIcon,
  redirectNative: mobileWalletRedirectNative,
};

export function isMobileWalletSupportedChain(chainId: number | null | undefined) {
  return typeof chainId === 'number' && mobileWalletSupportedChainIds.includes(chainId);
}

export function getMobileWalletNetworkName(chainId: number | null | undefined) {
  const network = mobileWalletNetworks.find((candidate) => Number(candidate.id) === chainId);
  return network?.name ?? (chainId ? `Chain ${chainId}` : 'Unknown network');
}

export const appKitStorage: Storage = {
  async getKeys() {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter((key) => key.startsWith(appkitStoragePrefix))
      .map((key) => key.slice(appkitStoragePrefix.length));
  },
  async getEntries<T = unknown>() {
    const keys = await this.getKeys();
    const values = await AsyncStorage.multiGet(
      keys.map((key) => `${appkitStoragePrefix}${key}`),
    );
    return values
      .map(([key, value]) => {
        if (value === null) {
          return null;
        }
        return [key.slice(appkitStoragePrefix.length), JSON.parse(value) as T] as [string, T];
      })
      .filter((entry): entry is [string, T] => entry !== null);
  },
  async getItem<T = unknown>(key: string) {
    const value = await AsyncStorage.getItem(`${appkitStoragePrefix}${key}`);
    return value === null ? undefined : (JSON.parse(value) as T);
  },
  async setItem<T = unknown>(key: string, value: T) {
    await AsyncStorage.setItem(`${appkitStoragePrefix}${key}`, JSON.stringify(value));
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(`${appkitStoragePrefix}${key}`);
  },
};

export const mobileAppKit = mobileWalletProjectId
  ? createAppKit({
      projectId: mobileWalletProjectId,
      metadata: {
        name: 'Milestone Escrow',
        description: 'Escrow-backed hiring and delivery on Base.',
        url: metadataUrl,
        icons: [metadataIcon],
        redirect: {
          native: mobileWalletRedirectNative,
        },
      },
      adapters: [new EthersAdapter()],
      networks: [...mobileWalletNetworks],
      defaultNetwork: mobileWalletDefaultNetwork,
      storage: appKitStorage,
      themeMode: 'light',
      themeVariables: {
        accent: '#0b6b3a',
      },
      features: {
        onramp: false,
        socials: false,
        swaps: false,
      },
    })
  : null;
