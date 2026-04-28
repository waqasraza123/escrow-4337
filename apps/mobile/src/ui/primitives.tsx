import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import * as React from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatTimestamp, previewHash, type ProductStatusTone } from '@escrow4334/product-core';
import { useMobileTheme } from '@/providers/theme';
import { AnimatedEntrance, PressableScale, usePulseAnimation } from './motion';

export { AnimatedEntrance, AnimatedReveal } from './motion';

export function useAdaptiveMetrics() {
  const { width } = useWindowDimensions();
  const tiny = width < 360;
  const compact = width < 390;
  const expanded = width >= 700;

  return {
    tiny,
    compact,
    expanded,
    horizontal: tiny ? 12 : compact ? 14 : 18,
    screenGap: tiny ? 10 : compact ? 12 : 16,
    cardPadding: tiny ? 13 : compact ? 14 : 18,
    contentMaxWidth: expanded ? 660 : undefined,
    headingSize: tiny ? 24 : compact ? 26 : 30,
    displaySize: tiny ? 30 : compact ? 32 : 38,
    titleSize: tiny ? 19 : compact ? 20 : 22,
    bodySize: compact ? 14 : 15,
    buttonHeight: compact ? 48 : 52,
    footerClearance: compact ? 112 : 124,
  };
}

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
  const metrics = useAdaptiveMetrics();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }, style]}
    >
      <View style={[styles.screen, padded && { paddingHorizontal: metrics.horizontal }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function ScrollScreen({
  children,
  footer,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useMobileTheme();
  const insets = useSafeAreaInsets();
  const metrics = useAdaptiveMetrics();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: footer ? metrics.footerClearance : insets.bottom }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            gap: metrics.screenGap,
            paddingHorizontal: metrics.horizontal,
            paddingBottom: footer ? insets.bottom + metrics.footerClearance : insets.bottom + 34,
            paddingTop: metrics.tiny ? 10 : metrics.compact ? 12 : 18,
          },
          contentContainerStyle,
        ]}
      >
        <View
          style={[
            styles.contentRail,
            {
              gap: metrics.screenGap,
              maxWidth: metrics.contentMaxWidth,
            },
          ]}
        >
          {children}
        </View>
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

export function Heading({
  children,
  size = 'display',
  tone = 'default',
  style,
  ...props
}: TextProps & {
  size?: 'display' | 'title' | 'section';
  tone?: 'default' | 'muted' | 'eyebrow';
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const color =
    tone === 'eyebrow'
      ? theme.colors.primary
      : tone === 'muted'
        ? theme.colors.foregroundSoft
        : theme.colors.foreground;

  const headingStyle =
    size === 'title'
      ? {
          fontSize: metrics.titleSize,
          lineHeight: metrics.titleSize + 6,
        }
      : size === 'section'
        ? {
            fontSize: metrics.compact ? 18 : 20,
            lineHeight: metrics.compact ? 24 : 26,
          }
        : {
            fontSize: metrics.headingSize,
            lineHeight: metrics.headingSize + 6,
          };

  return (
    <Text
      {...props}
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.25}
      style={[
        tone === 'eyebrow' ? styles.eyebrow : styles.heading,
        tone !== 'eyebrow' && headingStyle,
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
  const metrics = useAdaptiveMetrics();
  return (
    <Text
      {...props}
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.35}
      style={[
        styles.bodyText,
        {
          color: theme.colors.foregroundSoft,
          fontSize: metrics.bodySize,
          lineHeight: metrics.bodySize + 7,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function HeroSceneCard({
  eyebrow,
  title,
  body,
  signals = [],
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  signals?: Array<{
    label: string;
    value: string | number;
    tone?: ProductStatusTone;
  }>;
  children?: React.ReactNode;
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const pulse = usePulseAnimation();

  return (
    <AnimatedEntrance>
      <View
        style={[
          styles.mobileHero,
          {
            backgroundColor: theme.colors.surfaceStrong,
            borderColor: theme.colors.borderStrong,
            borderRadius: metrics.compact ? 22 : 28,
            padding: metrics.cardPadding + 3,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mobileHeroOrb,
            {
              backgroundColor: theme.colors.primarySoft,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.42, 0.68],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1.04],
                  }),
                },
              ],
            },
          ]}
        />
        <Heading tone="eyebrow">{eyebrow}</Heading>
        <Heading style={{ fontSize: metrics.displaySize, lineHeight: metrics.displaySize + 4 }}>
          {title}
        </Heading>
        <BodyText>{body}</BodyText>
        {signals.length ? <TrustSignalStrip signals={signals} /> : null}
        {children}
      </View>
    </AnimatedEntrance>
  );
}

export function TrustSignalStrip({
  signals,
}: {
  signals: Array<{
    label: string;
    value: string | number;
    tone?: ProductStatusTone;
  }>;
}) {
  const theme = useMobileTheme();

  return (
    <View style={styles.mobileTrustGrid}>
      {signals.map((signal) => {
        const tone = signal.tone ? theme.status[signal.tone] : null;
        return (
          <View
            key={signal.label}
            style={[
              styles.mobileTrustCard,
              {
                backgroundColor: tone?.background ?? theme.colors.surface,
                borderColor: tone?.border ?? theme.colors.border,
              },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.mobileTrustLabel, { color: theme.colors.foregroundMuted }]}
            >
              {signal.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.25}
              style={[styles.mobileTrustValue, { color: tone?.foreground ?? theme.colors.foreground }]}
            >
              {signal.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function SurfaceCard({
  children,
  animated,
  delay,
  variant = 'default',
  style,
}: {
  children: React.ReactNode;
  animated?: boolean;
  delay?: number;
  variant?: 'default' | 'soft' | 'elevated';
  style?: ViewStyle;
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const card = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: variant === 'soft' ? theme.colors.surfaceStrong : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: metrics.compact ? 18 : theme.radii.lg,
          padding: metrics.cardPadding,
          shadowColor: theme.colors.shadow,
          shadowOpacity: variant === 'elevated' ? 0.16 : 0.1,
          elevation: variant === 'elevated' ? 3 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return animated ? <AnimatedEntrance delay={delay}>{card}</AnimatedEntrance> : card;
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
  const metrics = useAdaptiveMetrics();
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled || loading}
      {...props}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.pill,
          minHeight: metrics.buttonHeight,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          shadowColor: theme.colors.shadow,
        },
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
      pressedScale={0.982}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryForeground} />
      ) : (
        <Text
          maxFontSizeMultiplier={1.15}
          numberOfLines={2}
          style={[styles.buttonText, { color: theme.colors.primaryForeground }]}
        >
          {children}
        </Text>
      )}
    </PressableScale>
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
  const metrics = useAdaptiveMetrics();
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: theme.radii.pill,
          minHeight: metrics.buttonHeight,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
      pressedScale={0.986}
    >
      <Text
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        style={[styles.buttonText, { color: theme.colors.foreground }]}
      >
        {children}
      </Text>
    </PressableScale>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & {
  label: string;
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        placeholderTextColor={theme.colors.foregroundMuted}
        selectionColor={theme.colors.primary}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            color: theme.colors.foreground,
            borderRadius: theme.radii.md,
            minHeight: metrics.buttonHeight,
            shadowColor: focused ? theme.colors.primary : 'transparent',
            shadowOpacity: focused ? 0.12 : 0,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function Textarea(props: TextInputProps & { label: string }) {
  return (
    <Field {...props} multiline textAlignVertical="top" style={[styles.textarea, props.style]} />
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
      <Text
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        style={[styles.badgeText, { color: status.foreground }]}
      >
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
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <SurfaceCard variant="soft">
      <Heading size="section" style={styles.cardHeading}>
        {title}
      </Heading>
      <BodyText>{body}</BodyText>
      {action}
    </SurfaceCard>
  );
}

export function SkeletonCard() {
  const theme = useMobileTheme();
  const opacity = usePulseAnimation();
  return (
    <SurfaceCard>
      <Animated.View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, opacity, width: '52%' },
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, opacity, width: '86%' },
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonLine,
          { backgroundColor: theme.colors.surfaceSoft, opacity, width: '68%' },
        ]}
      />
    </SurfaceCard>
  );
}

export function BottomActionBar({ children }: { children: React.ReactNode }) {
  const theme = useMobileTheme();
  const insets = useSafeAreaInsets();
  const metrics = useAdaptiveMetrics();
  return (
    <View
      style={[
        styles.bottomActionBar,
        {
          paddingHorizontal: metrics.horizontal,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.bottomActionRail,
          {
            gap: metrics.compact ? 8 : 10,
            maxWidth: metrics.contentMaxWidth,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function ReadinessChecklist({ items }: { items: Array<{ label: string; ready: boolean }> }) {
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

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <AnimatedEntrance>
      <View style={styles.sectionHeader}>
        {eyebrow ? <Heading tone="eyebrow">{eyebrow}</Heading> : null}
        <Heading>{title}</Heading>
        {body ? <BodyText>{body}</BodyText> : null}
      </View>
    </AnimatedEntrance>
  );
}

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  return (
    <View
      style={[
        styles.segmented,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.border,
          borderRadius: metrics.compact && options.length > 2 ? theme.radii.md : theme.radii.pill,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            pressedScale={0.985}
            style={[
              styles.segmentedOption,
              {
                backgroundColor: active ? theme.colors.surface : 'transparent',
                borderColor: active ? theme.colors.borderStrong : 'transparent',
                borderRadius: metrics.compact && options.length > 2 ? theme.radii.sm : theme.radii.pill,
                shadowColor: active ? theme.colors.shadow : 'transparent',
                minHeight: metrics.compact ? 40 : 42,
                paddingHorizontal: metrics.compact ? 8 : 12,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentedText,
                {
                  color: active ? theme.colors.foreground : theme.colors.foregroundMuted,
                  fontSize: metrics.compact ? 12 : 13,
                },
              ]}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function ListCard({
  title,
  body,
  eyebrow,
  chips,
  meta,
  actionLabel,
  onPress,
  delay,
}: {
  title: string;
  body: string;
  eyebrow?: string;
  chips?: string[];
  meta?: string;
  actionLabel?: string;
  onPress?: () => void;
  delay?: number;
}) {
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const content = (
    <SurfaceCard variant="elevated">
      <View style={styles.listCardHeader}>
        <View style={styles.listCardCopy}>
          {eyebrow ? (
            <Text style={[styles.listEyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text>
          ) : null}
          <Heading size="section">{title}</Heading>
        </View>
        {meta && !metrics.tiny ? <StatusBadge label={meta} tone="muted" /> : null}
      </View>
      <BodyText numberOfLines={3}>{body}</BodyText>
      {chips?.length ? <ChipWrap values={chips.slice(0, 5)} /> : null}
      {meta && metrics.tiny ? <StatusBadge label={meta} tone="muted" /> : null}
      {actionLabel ? (
        <Text style={[styles.inlineAction, { color: theme.colors.primary }]}>{actionLabel}</Text>
      ) : null}
    </SurfaceCard>
  );

  return (
    <AnimatedEntrance delay={delay}>
      {onPress ? (
        <PressableScale
          accessibilityRole="button"
          onPress={onPress}
          pressedScale={0.992}
          style={styles.fullWidth}
        >
          {content}
        </PressableScale>
      ) : (
        content
      )}
    </AnimatedEntrance>
  );
}

export function MetricRow({ label, value }: { label: string; value: string | number }) {
  const theme = useMobileTheme();
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
        style={[styles.metricValue, { color: theme.colors.foreground }]}
      >
        {value}
      </Text>
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
    paddingTop: 18,
    alignItems: 'center',
  },
  contentRail: {
    width: '100%',
  },
  fullWidth: {
    width: '100%',
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0,
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
  mobileHero: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    width: '100%',
  },
  mobileHeroOrb: {
    borderRadius: 999,
    height: 170,
    position: 'absolute',
    right: -52,
    top: -62,
    width: 170,
  },
  mobileTrustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  mobileTrustCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    minWidth: 128,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  mobileTrustLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  mobileTrustValue: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    width: '100%',
  },
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    width: '100%',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
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
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  textarea: {
    minHeight: 120,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  bottomActionRail: {
    width: '100%',
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
  sectionHeader: {
    gap: 9,
    width: '100%',
  },
  segmented: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    width: '100%',
  },
  segmentedOption: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  listCardCopy: {
    flex: 1,
    gap: 4,
  },
  listEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  inlineAction: {
    fontSize: 14,
    fontWeight: '900',
    paddingTop: 2,
  },
  metricRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  metricLabel: {
    flex: 0.9,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    flex: 1.1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
});
