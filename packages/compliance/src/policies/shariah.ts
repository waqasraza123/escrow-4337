export type ShariahPolicy = {
  prohibited_categories: readonly string[];
};

export const shariah = {
  prohibited_categories: [
    'riba',
    'interest',
    'gambling',
    'adult',
    'alcohol',
    'pork',
    'weapons',
    'drugs'
  ]
} as const satisfies ShariahPolicy;

export default shariah;
