import shariah from '../../../../../packages/compliance/src/policies/shariah';
import { Injectable } from '@nestjs/common';

type ProhibitedCategory = (typeof shariah.prohibited_categories)[number];

const prohibitedSet: ReadonlySet<ProhibitedCategory> = new Set(
  shariah.prohibited_categories,
);

function isProhibitedCategory(x: string): x is ProhibitedCategory {
  return prohibitedSet.has(x as ProhibitedCategory);
}

@Injectable()
export class PolicyService {
  shariahEnabledFor(user: { shariah_mode?: boolean }) {
    return !!user?.shariah_mode;
  }

  isCategoryAllowed(cat: string, shariahMode: boolean) {
    if (!shariahMode) return true;
    const c = cat.trim().toLowerCase();

    return !isProhibitedCategory(c);
  }
}
