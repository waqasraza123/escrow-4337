export const JobTerms = {
  JobTerms: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'currency', type: 'address' },
    { name: 'budget', type: 'uint256' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const;

export const Offer = {
  Offer: [
    { name: 'jobId', type: 'uint256' },
    { name: 'worker', type: 'address' },
    { name: 'rate', type: 'uint256' },
    { name: 'milestones', type: 'bytes32' },
  ],
} as const;

export const MilestoneReceipt = {
  MilestoneReceipt: [
    { name: 'jobId', type: 'uint256' },
    { name: 'milestoneId', type: 'uint256' },
    { name: 'deliverableHash', type: 'bytes32' },
  ],
} as const;
