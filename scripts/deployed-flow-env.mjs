export const requiredDeployedFlowEnvKeys = [
  'PLAYWRIGHT_DEPLOYED_FLOW_CURRENCY_ADDRESS',
  'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_EMAIL',
  'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_OTP_CODE',
  'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_PRIVATE_KEY',
  'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_EMAIL',
  'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_OTP_CODE',
  'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_PRIVATE_KEY',
  'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_EMAIL',
  'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_OTP_CODE',
  'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_PRIVATE_KEY',
];

export function getMissingDeployedFlowEnv(env = process.env) {
  return requiredDeployedFlowEnvKeys.filter((key) => !env[key]?.trim());
}

export function assertRequiredDeployedFlowEnv(env = process.env) {
  const missing = getMissingDeployedFlowEnv(env);
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      'Missing required deployed flow environment variables.',
      ...missing.map((key) => `- ${key}`),
    ].join('\n'),
  );
}
