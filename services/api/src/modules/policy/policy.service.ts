import { shariah } from '@escrow4334/compliance';
import { Injectable } from '@nestjs/common';

type ProhibitedCategory = (typeof shariah.prohibited_categories)[number];
type PolicyUser = {
  shariahMode?: boolean;
  shariah_mode?: boolean;
};

const prohibitedSet: ReadonlySet<ProhibitedCategory> = new Set(
  shariah.prohibited_categories,
);

function isProhibitedCategory(x: string): x is ProhibitedCategory {
  return prohibitedSet.has(x as ProhibitedCategory);
}

@Injectable()
export class PolicyService {
  shariahEnabledFor(user: PolicyUser | null | undefined) {
    return Boolean(user?.shariahMode ?? user?.shariah_mode);
  }

  isCategoryAllowed(cat: string, shariahMode: boolean) {
    if (!shariahMode) return true;
    const c = cat.trim().toLowerCase();

    return !isProhibitedCategory(c);
  }
}
