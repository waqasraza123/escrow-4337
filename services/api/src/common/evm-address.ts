export const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export function normalizeEvmAddress(address: string) {
  return address.trim().toLowerCase();
}

export function isEvmAddress(address: string) {
  return evmAddressPattern.test(address.trim());
}
