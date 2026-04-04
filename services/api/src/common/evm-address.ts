export const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export function normalizeEvmAddress(address: string) {
  const normalized = address.trim().toLowerCase();
  if (!evmAddressPattern.test(normalized)) {
    throw new Error('Invalid EVM address');
  }
  return normalized;
}

export function isEvmAddress(address: string) {
  return evmAddressPattern.test(address.trim());
}
