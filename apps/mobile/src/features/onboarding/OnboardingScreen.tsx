import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AnimatedEntrance,
  BodyText,
  BottomActionBar,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
  SectionHeader,
  SurfaceCard,
  TrustPill,
} from '@/ui/primitives';

const proofPoints = [
  'Milestone-funded work',
  'Wallet-aware contractor join',
  'Delivery, release, and dispute trail',
];

export function OnboardingScreen() {
  return (
    <ScrollScreen
      footer={
        <BottomActionBar>
          <PrimaryButton onPress={() => router.push('/sign-in')}>Sign in with email</PrimaryButton>
          <SecondaryButton onPress={() => router.push('/marketplace')}>
            Browse marketplace
          </SecondaryButton>
        </BottomActionBar>
      }
    >
      <AnimatedEntrance>
        <SurfaceCard variant="elevated" style={styles.heroCard}>
          <View style={styles.hero}>
            <Heading tone="eyebrow">Escrow-backed hiring on Base</Heading>
            <Heading>Hire and deliver through milestone escrow</Heading>
            <BodyText>
              Browse crypto-native talent or opportunities, then close work into one funded contract
              with clear delivery and dispute actions.
            </BodyText>
            <View style={styles.pills}>
              {proofPoints.map((point) => (
                <TrustPill key={point} label={point} />
              ))}
            </View>
          </View>
        </SurfaceCard>
      </AnimatedEntrance>

      <SectionHeader
        eyebrow="Start narrow"
        title="Two focused lanes"
        body="The mobile app keeps the marketplace and escrow actions close to the task at hand."
      />

      <SurfaceCard animated delay={80}>
        <Heading size="section" style={styles.cardHeading}>
          Client path
        </Heading>
        <BodyText>
          Search profiles, publish briefs, review applications, and convert the selected hire into
          the existing escrow flow.
        </BodyText>
        <MetricRow label="Close model" value="One winner, one contract" />
      </SurfaceCard>

      <SurfaceCard animated delay={140}>
        <Heading size="section" style={styles.cardHeading}>
          Freelancer path
        </Heading>
        <BodyText>
          Link a wallet, keep a marketplace profile current, apply to scoped opportunities, and join
          invited escrow contracts.
        </BodyText>
        <MetricRow label="Work mode" value="Milestones, evidence, release" />
      </SurfaceCard>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 14,
  },
  heroCard: {
    paddingVertical: 22,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
});
