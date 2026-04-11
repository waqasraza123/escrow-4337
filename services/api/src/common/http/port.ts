const maxTcpPort = 65_535;

function parseConfiguredPort(value: string, envName: 'NEST_API_PORT' | 'PORT') {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxTcpPort) {
    throw new Error(`${envName} must be a valid TCP port between 1 and ${maxTcpPort}`);
  }

  return parsed;
}

export function readApiPort() {
  const configuredPort = process.env.NEST_API_PORT?.trim();
  if (configuredPort) {
    return parseConfiguredPort(configuredPort, 'NEST_API_PORT');
  }

  const platformPort = process.env.PORT?.trim();
  if (platformPort) {
    return parseConfiguredPort(platformPort, 'PORT');
  }

  throw new Error('NEST_API_PORT or PORT must be set before starting the API');
}
