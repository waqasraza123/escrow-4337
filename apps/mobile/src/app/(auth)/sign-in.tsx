import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
  BodyText,
  Field,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SurfaceCard,
} from '@/ui/primitives';
import { useSession } from '@/providers/session';

export default function SignInRoute() {
  const { requestCode, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestCode = async () => {
    setSubmitting(true);
    try {
      await requestCode(email.trim());
      setCodeSent(true);
    } catch (error) {
      Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Could not request a code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      await signIn(email.trim(), code.trim());
      router.replace('/home');
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Could not verify this code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <ScrollScreen>
        <Heading tone="eyebrow">Secure session</Heading>
        <Heading>Sign in with a one-time code</Heading>
        <BodyText>
          Use the same OTP session API as the web console. Secrets are kept in
          native secure storage after verification.
        </BodyText>

        <SurfaceCard>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />
          {codeSent ? (
            <Field
              autoCapitalize="none"
              keyboardType="number-pad"
              label="Code"
              onChangeText={setCode}
              placeholder="123456"
              value={code}
            />
          ) : null}
          <PrimaryButton
            disabled={!email.trim() || (codeSent && !code.trim())}
            loading={submitting}
            onPress={codeSent ? handleVerify : handleRequestCode}
          >
            {codeSent ? 'Verify code' : 'Send code'}
          </PrimaryButton>
        </SurfaceCard>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
});
