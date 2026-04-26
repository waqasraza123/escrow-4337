import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  BodyText,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
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
    <ScrollScreen>
      <View style={styles.hero}>
        <Heading tone="eyebrow">Escrow-backed hiring on Base</Heading>
        <Heading>Hire and deliver through milestone escrow</Heading>
        <BodyText>
          Browse crypto-native talent or opportunities, then close work into
          one funded contract with clear delivery and dispute actions.
        </BodyText>
        <View style={styles.pills}>
          {proofPoints.map((point) => (
            <TrustPill key={point} label={point} />
          ))}
        </View>
      </View>

      <SurfaceCard>
        <Heading style={styles.cardHeading}>Client path</Heading>
        <BodyText>
          Search profiles, publish briefs, review applications, and convert the
          selected hire into the existing escrow flow.
        </BodyText>
      </SurfaceCard>

      <SurfaceCard>
        <Heading style={styles.cardHeading}>Freelancer path</Heading>
        <BodyText>
          Link a wallet, keep a marketplace profile current, apply to scoped
          opportunities, and join invited escrow contracts.
        </BodyText>
      </SurfaceCard>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push('/sign-in')}>
          Sign in with email
        </PrimaryButton>
        <SecondaryButton onPress={() => router.push('/marketplace')}>
          Browse marketplace
        </SecondaryButton>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 14,
    paddingTop: 8,
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
  actions: {
    gap: 10,
    paddingTop: 4,
  },
});
