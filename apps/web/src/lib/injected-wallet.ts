export type InjectedWalletSnapshot = {
  address: string | null;
  chainId: number | null;
};

export type InjectedWalletUpdate = {
  address?: string | null;
  chainId?: number | null;
};

type RequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type EthereumProviderListener = (...args: unknown[]) => void;

export type InjectedEthereumProvider = {
  isMetaMask?: boolean;
  request(args: RequestArguments): Promise<unknown>;
  on?(event: 'accountsChanged' | 'chainChanged', listener: EthereumProviderListener): void;
  removeListener?(
    event: 'accountsChanged' | 'chainChanged',
    listener: EthereumProviderListener,
  ): void;
};

declare global {
  interface Window {
    ethereum?: InjectedEthereumProvider;
  }
}

function normalizeAddress(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseChainId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, value.startsWith('0x') ? 16 : 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function requireProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error(
      'No injected EVM wallet detected. Install MetaMask or another browser wallet.',
    );
  }

  return window.ethereum;
}

export async function readInjectedWalletSnapshot(): Promise<InjectedWalletSnapshot> {
  const provider = requireProvider();
  const [accounts, chainId] = await Promise.all([
    provider.request({ method: 'eth_accounts' }),
    provider.request({ method: 'eth_chainId' }),
  ]);

  return {
    address: Array.isArray(accounts) ? normalizeAddress(accounts[0]) : null,
    chainId: parseChainId(chainId),
  };
}

export async function connectInjectedWallet(): Promise<InjectedWalletSnapshot> {
  const provider = requireProvider();
  const [accounts, chainId] = await Promise.all([
    provider.request({ method: 'eth_requestAccounts' }),
    provider.request({ method: 'eth_chainId' }),
  ]);

  return {
    address: Array.isArray(accounts) ? normalizeAddress(accounts[0]) : null,
    chainId: parseChainId(chainId),
  };
}

export async function signMessageWithInjectedWallet(
  address: string,
  message: string,
): Promise<string> {
  const provider = requireProvider();
  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, address],
  });

  if (typeof signature !== 'string' || !signature.trim()) {
    throw new Error('Wallet did not return a signature.');
  }

  return signature;
}

export function subscribeInjectedWallet(onChange: (update: InjectedWalletUpdate) => void) {
  if (typeof window === 'undefined' || !window.ethereum) {
    return () => undefined;
  }

  const provider = window.ethereum;

  const handleAccountsChanged = (accounts: unknown) => {
    onChange({
      address: Array.isArray(accounts) ? normalizeAddress(accounts[0]) : null,
    });
  };

  const handleChainChanged = (chainId: unknown) => {
    onChange({
      chainId: parseChainId(chainId),
    });
  };

  provider.on?.('accountsChanged', handleAccountsChanged);
  provider.on?.('chainChanged', handleChainChanged);

  return () => {
    provider.removeListener?.('accountsChanged', handleAccountsChanged);
    provider.removeListener?.('chainChanged', handleChainChanged);
  };
}
