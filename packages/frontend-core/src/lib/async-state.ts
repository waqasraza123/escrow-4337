export type AsyncState = {
  kind: 'idle' | 'working' | 'error' | 'success';
  message?: string;
};

export function createIdleState(message?: string): AsyncState {
  return { kind: 'idle', message };
}

export function createWorkingState(message?: string): AsyncState {
  return { kind: 'working', message };
}

export function createSuccessState(message?: string): AsyncState {
  return { kind: 'success', message };
}

export function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function createErrorState(
  error: unknown,
  fallback: string,
): AsyncState {
  return {
    kind: 'error',
    message: toErrorMessage(error, fallback),
  };
}
