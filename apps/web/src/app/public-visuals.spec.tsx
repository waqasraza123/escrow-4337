import { screen } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it } from 'vitest';
import {
  EscrowFlowScene,
  MarketplaceDirectoryScene,
  MarketplaceHeroScene,
  TalentCategoryGlyph,
} from './public-visuals';

describe('public visuals', () => {
  it('renders code-native illustration scenes without text fallback', () => {
    renderApp(
      <div>
        <MarketplaceHeroScene />
        <MarketplaceDirectoryScene />
        <EscrowFlowScene />
        <TalentCategoryGlyph kind="engineering" />
      </div>,
    );

    expect(screen.getByTestId('marketplace-hero-scene')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByTestId('marketplace-directory-scene')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByTestId('escrow-flow-scene')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByTestId('category-glyph-engineering')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
