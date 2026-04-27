import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
  AnimatedReveal,
  BodyText,
  BottomActionBar,
  Field,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SurfaceCard,
} from '@/ui/primitives';
import { useSession } from '@/providers/session';
import { useMobileNetwork } from '@/providers/network';
import { NetworkStatusCard } from '@/features/network/NetworkStatusCard';

export default function SignInRoute() {
  const { requestCode, signIn } = useSession();
  const network = useMobileNetwork();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestCode = async () => {
    setSubmitting(true);
    try {
      network.requireOnline('Requesting a sign-in code');
      await requestCode(email.trim());
      setCodeSent(true);
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Could not request a code.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      network.requireOnline('Verifying a sign-in code');
      await signIn(email.trim(), code.trim());
      router.replace('/home');
    } catch (error) {
      Alert.alert(
        'Verification failed',
        error instanceof Error ? error.message : 'Could not verify this code.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <ScrollScreen
        footer={
          <BottomActionBar>
            <PrimaryButton
              disabled={network.offline || !email.trim() || (codeSent && !code.trim())}
              loading={submitting}
              onPress={codeSent ? handleVerify : handleRequestCode}
            >
              {codeSent ? 'Verify code' : 'Send code'}
            </PrimaryButton>
          </BottomActionBar>
        }
      >
        <SectionHeader
          eyebrow="Secure session"
          title="Sign in with a one-time code"
          body="Use the same OTP session API as the web console. Tokens are kept in native secure storage after verification."
        />

        <NetworkStatusCard compact />

        <SurfaceCard animated>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            enterKeyHint="next"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="name@example.com"
            textContentType="emailAddress"
            value={email}
          />
          <AnimatedReveal visible={codeSent}>
            <Field
              autoCapitalize="none"
              enterKeyHint="done"
              keyboardType="number-pad"
              label="Code"
              onChangeText={setCode}
              placeholder="123456"
              textContentType="oneTimeCode"
              value={code}
            />
          </AnimatedReveal>
          <BodyText style={styles.helper}>
            {codeSent
              ? 'Enter the code from your email to restore the mobile session.'
              : 'We will send a short-lived code to this email address.'}
          </BodyText>
        </SurfaceCard>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  helper: {
    fontSize: 13,
  },
});
