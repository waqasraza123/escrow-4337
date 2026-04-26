import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatTimestamp,
  previewHash,
  type ProductStatusTone,
} from '@escrow4334/product-core';
import { useMobileTheme } from '@/providers/theme';

export function Screen({
  children,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const theme = useMobileTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.safeArea,
        { backgroundColor: theme.colors.background },
        style,
      ]}
    >
      <View
        style={[
          styles.screen,
          padded && { paddingHorizontal: theme.spacing.lg },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

export function ScrollScreen({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useMobileTheme();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: footer ? theme.spacing.xl : insets.bottom + 32,
          },
        ]}
      >
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

export function Heading({
  children,
  tone = 'default',
  style,
  ...props
}: TextProps & {
  tone?: 'default' | 'muted' | 'eyebrow';
}) {
  const theme = useMobileTheme();
  const color =
    tone === 'eyebrow'
      ? theme.colors.primary
      : tone === 'muted'
        ? theme.colors.foregroundSoft
        : theme.colors.foreground;

  return (
    <Text
      {...props}
      style={[
        tone === 'eyebrow' ? styles.eyebrow : styles.heading,
        { color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function BodyText({ children, style, ...props }: TextProps) {
  const theme = useMobileTheme();
  return (
    <Text
      {...props}
      style={[styles.bodyText, { color: theme.colors.foregroundSoft }, style]}
    >
      {children}
    </Text>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useMobileTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          shadowColor: theme.colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  children,
  disabled,
  loading,
  style,
  ...props
}: PressableProps & {
  children: React.ReactNode;
  loading?: boolean;
}) {
  const theme = useMobileTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...props}
      style={(state) => [
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.pill,
          opacity: disabled ? 0.5 : state.pressed ? 0.86 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryForeground} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: theme.colors.primaryForeground },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  disabled,
  style,
  ...props
}: PressableProps & {
  children: React.ReactNode;
}) {
  const theme = useMobileTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={(state) => [
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: theme.radii.pill,
          opacity: disabled ? 0.5 : state.pressed ? 0.82 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.colors.foreground }]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & {
  label: string;
}) {
  const theme = useMobileTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.foregroundMuted}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.foreground,
            borderRadius: theme.radii.md,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function Textarea(props: TextInputProps & { label: string }) {
  return (
    <Field
      {...props}
      multiline
      textAlignVertical="top"
      style={[styles.textarea, props.style]}
    />
  );
}

export function StatusBadge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: ProductStatusTone;
}) {
  const theme = useMobileTheme();
  const status = theme.status[tone];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: status.background,
          borderColor: status.border,
          borderRadius: theme.radii.pill,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: status.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

export function TrustPill({ label }: { label: string }) {
  return <StatusBadge label={label} tone="info" />;
}

export function ChipWrap({ values }: { values: string[] }) {
  return (
    <View style={styles.chipWrap}>
      {values.map((value) => (
        <TrustPill key={value} label={value} />
      ))}
    </View>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <SurfaceCard>
      <Heading style={styles.cardHeading}>{title}</Heading>
      <BodyText>{body}</BodyText>
    </SurfaceCard>
  );
}

export function SkeletonCard() {
  const theme = useMobileTheme();
  return (
    <SurfaceCard>
      <View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, width: '52%' },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, width: '86%' },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, width: '68%' },
        ]}
      />
    </SurfaceCard>
  );
}

export function BottomActionBar({ children }: { children: React.ReactNode }) {
  const theme = useMobileTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bottomActionBar,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function ReadinessChecklist({
  items,
}: {
  items: Array<{ label: string; ready: boolean }>;
}) {
  return (
    <View style={styles.stackSmall}>
      {items.map((item) => (
        <View key={item.label} style={styles.checkRow}>
          <StatusBadge
            label={item.ready ? 'Ready' : 'Needed'}
            tone={item.ready ? 'success' : 'warning'}
          />
          <BodyText style={styles.checkCopy}>{item.label}</BodyText>
        </View>
      ))}
    </View>
  );
}

export function MilestoneTimeline({
  milestones,
}: {
  milestones: Array<{
    title: string;
    amount: string;
    status: string;
    dueAt?: number;
  }>;
}) {
  const theme = useMobileTheme();
  return (
    <View style={styles.stackSmall}>
      {milestones.map((milestone, index) => (
        <View key={`${milestone.title}-${index}`} style={styles.timelineRow}>
          <View
            style={[
              styles.timelineDot,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primarySoft,
              },
            ]}
          />
          <View style={styles.timelineCopy}>
            <Text style={[styles.timelineTitle, { color: theme.colors.foreground }]}>
              {milestone.title}
            </Text>
            <BodyText>
              {milestone.amount} · {milestone.status}
              {milestone.dueAt ? ` · ${formatTimestamp(milestone.dueAt)}` : ''}
            </BodyText>
          </View>
        </View>
      ))}
    </View>
  );
}

export function HashText({ value }: { value?: string | null }) {
  const theme = useMobileTheme();
  return (
    <Text style={[styles.hashText, { color: theme.colors.foregroundMuted }]}>
      {previewHash(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingTop: 18,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 18,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: {
    minHeight: 120,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 999,
  },
  bottomActionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stackSmall: {
    gap: 10,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  checkCopy: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    borderWidth: 4,
    borderRadius: 999,
    height: 18,
    marginTop: 3,
    width: 18,
  },
  timelineCopy: {
    flex: 1,
    gap: 3,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hashText: {
    fontFamily: 'Courier',
    fontSize: 12,
  },
});
