import { assertRequiredDeployedFlowEnv } from './deployed-flow-env.mjs';

try {
  assertRequiredDeployedFlowEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
