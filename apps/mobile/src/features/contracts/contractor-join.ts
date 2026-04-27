import type { ContractorJoinReadiness } from '@escrow4334/product-core';

export function normalizeInviteToken(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? '';
  }

  return value?.trim() ?? '';
}

export function getJoinReadinessCopy(status: ContractorJoinReadiness['status']) {
  switch (status) {
    case 'ready':
      return {
        title: 'Ready to join',
        body: 'This signed-in account matches the pending contractor email and has the required worker wallet linked.',
        action: 'Join contract',
        tone: 'success' as const,
      };
    case 'joined':
      return {
        title: 'Already joined',
        body: 'The contractor identity is locked for this contract. Worker actions can continue from the contract detail screen.',
        action: 'Open contract',
        tone: 'success' as const,
      };
    case 'wrong_email':
      return {
        title: 'Wrong signed-in email',
        body: 'Sign in with the pending contractor email from the invite before joining this contract.',
        action: 'Switch account',
        tone: 'warning' as const,
      };
    case 'wallet_not_linked':
      return {
        title: 'Worker wallet not linked',
        body: 'Link the exact worker wallet requested by the client before joining.',
        action: 'Open account',
        tone: 'warning' as const,
      };
    case 'wrong_wallet':
      return {
        title: 'Wrong wallet linked',
        body: 'The invite is valid, but this account does not control the worker wallet bound to the contract.',
        action: 'Open account',
        tone: 'warning' as const,
      };
    case 'invite_invalid':
      return {
        title: 'Invite invalid',
        body: 'Ask the client to regenerate or resend the contractor invite before trying again.',
        action: 'Check invite',
        tone: 'danger' as const,
      };
    case 'claimed_by_other':
      return {
        title: 'Already claimed',
        body: 'Another account has already joined this contractor seat.',
        action: 'Check contract',
        tone: 'danger' as const,
      };
    case 'invite_required':
    default:
      return {
        title: 'Invite token required',
        body: 'Paste the invite token from the client handoff before checking join readiness.',
        action: 'Check readiness',
        tone: 'warning' as const,
      };
  }
}

export function canJoinContract(status?: ContractorJoinReadiness['status']) {
  return status === 'ready';
}
