import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/providers/api';
import {
  BodyText,
  ChipWrap,
  EmptyState,
  Field,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
  SkeletonCard,
  SurfaceCard,
} from '@/ui/primitives';

type MarketplaceTab = 'talent' | 'opportunities';

export default function MarketplaceRoute() {
  const [tab, setTab] = useState<MarketplaceTab>('talent');
  const [query, setQuery] = useState('');
  const search = useMemo(() => ({ q: query.trim(), limit: 12 }), [query]);

  const talent = useQuery({
    enabled: tab === 'talent',
    queryKey: ['marketplace', 'talent', search],
    queryFn: () => api.listMarketplaceProfiles(search),
  });

  const opportunities = useQuery({
    enabled: tab === 'opportunities',
    queryKey: ['marketplace', 'opportunities', search],
    queryFn: () => api.listMarketplaceOpportunities(search),
  });

  const loading =
    (tab === 'talent' && talent.isLoading) ||
    (tab === 'opportunities' && opportunities.isLoading);

  return (
    <ScrollScreen>
      <Heading tone="eyebrow">Discovery</Heading>
      <Heading>Marketplace</Heading>
      <BodyText>
        Native browse starts with public profiles and opportunities, then
        authenticated apply and workspace actions can build on this route.
      </BodyText>

      <View style={styles.tabs}>
        <SecondaryButton onPress={() => setTab('talent')}>Talent</SecondaryButton>
        <SecondaryButton onPress={() => setTab('opportunities')}>
          Opportunities
        </SecondaryButton>
      </View>

      <Field
        autoCapitalize="none"
        label="Search"
        onChangeText={setQuery}
        placeholder="Skill, category, timezone"
        value={query}
      />

      {loading ? <SkeletonCard /> : null}

      {tab === 'talent'
        ? talent.data?.profiles.map((profile) => (
            <SurfaceCard key={profile.slug}>
              <Heading style={styles.cardHeading}>{profile.displayName}</Heading>
              <BodyText>{profile.headline}</BodyText>
              <ChipWrap values={profile.skills.slice(0, 4)} />
              <PrimaryButton
                onPress={() =>
                  router.push({
                    pathname: '/marketplace/profile/[slug]',
                    params: { slug: profile.slug },
                  })
                }
              >
                View profile
              </PrimaryButton>
            </SurfaceCard>
          ))
        : opportunities.data?.opportunities.map((opportunity) => (
            <SurfaceCard key={opportunity.id}>
              <Heading style={styles.cardHeading}>{opportunity.title}</Heading>
              <BodyText>{opportunity.summary}</BodyText>
              <ChipWrap values={opportunity.requiredSkills.slice(0, 4)} />
              <PrimaryButton
                onPress={() =>
                  router.push({
                    pathname: '/marketplace/opportunity/[id]',
                    params: { id: opportunity.id },
                  })
                }
              >
                View opportunity
              </PrimaryButton>
            </SurfaceCard>
          ))}

      {!loading &&
      ((tab === 'talent' && talent.data?.profiles.length === 0) ||
        (tab === 'opportunities' &&
          opportunities.data?.opportunities.length === 0)) ? (
        <EmptyState
          title="No matches"
          body="Try a broader skill, category, or timezone search."
        />
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 10,
  },
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
});
