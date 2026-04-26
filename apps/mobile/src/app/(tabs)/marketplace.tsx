import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { api } from '@/providers/api';
import {
  EmptyState,
  Field,
  ListCard,
  ScrollScreen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
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
    (tab === 'talent' && talent.isLoading) || (tab === 'opportunities' && opportunities.isLoading);

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Discovery"
        title="Marketplace"
        body="Browse public profiles and scoped opportunities, then move into authenticated apply and workspace actions."
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Talent', value: 'talent' },
          { label: 'Opportunities', value: 'opportunities' },
        ]}
      />

      <Field
        autoCapitalize="none"
        label="Search"
        onChangeText={setQuery}
        placeholder="Skill, category, timezone"
        value={query}
      />

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : null}

      {tab === 'talent'
        ? talent.data?.profiles.map((profile, index) => (
            <ListCard
              key={profile.slug}
              title={profile.displayName}
              body={profile.headline}
              eyebrow={profile.verificationLevel.replaceAll('_', ' ')}
              chips={profile.skills}
              meta={profile.availability}
              actionLabel="View profile"
              delay={index * 45}
              onPress={() =>
                router.push({
                  pathname: '/marketplace/profile/[slug]',
                  params: { slug: profile.slug },
                })
              }
            />
          ))
        : opportunities.data?.opportunities.map((opportunity, index) => (
            <ListCard
              key={opportunity.id}
              title={opportunity.title}
              body={opportunity.summary}
              eyebrow={opportunity.category}
              chips={opportunity.requiredSkills}
              meta={opportunity.status}
              actionLabel="View opportunity"
              delay={index * 45}
              onPress={() =>
                router.push({
                  pathname: '/marketplace/opportunity/[id]',
                  params: { id: opportunity.id },
                })
              }
            />
          ))}

      {(tab === 'talent' && talent.isError) ||
      (tab === 'opportunities' && opportunities.isError) ? (
        <EmptyState
          title="Marketplace unavailable"
          body="The marketplace API could not be reached. Check the backend target and try again."
        />
      ) : null}

      {!loading &&
      ((tab === 'talent' && talent.data?.profiles.length === 0) ||
        (tab === 'opportunities' && opportunities.data?.opportunities.length === 0)) ? (
        <EmptyState title="No matches" body="Try a broader skill, category, or timezone search." />
      ) : null}
    </ScrollScreen>
  );
}
