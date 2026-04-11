export function makeRunId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeTestCurrencyAddress(fill = '5') {
  return `0x${fill.repeat(40)}`;
}

export function makeTestEmail(role: string, runId: string) {
  return `playwright.${role}.${runId}@example.com`;
}
