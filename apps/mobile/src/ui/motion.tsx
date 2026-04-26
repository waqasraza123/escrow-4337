import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { productMotion } from '@escrow4334/product-core';

export const mobileMotion = {
  short: productMotion.fastMs,
  medium: productMotion.mediumMs,
  content: 340,
  easing: Easing.out(Easing.cubic),
} as const;

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

export function AnimatedEntrance({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }

    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: mobileMotion.content,
      easing: mobileMotion.easing,
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reducedMotion]);

  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    }),
    [distance, progress],
  );

  if (reducedMotion) {
    return <View style={style}>{children}</View>;
  }

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

export function AnimatedReveal({
  children,
  visible,
  style,
  distance = 8,
}: {
  children: ReactNode;
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  distance?: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(visible ? 1 : 0);
      setMounted(visible);
      return;
    }

    if (visible) {
      setMounted(true);
    }

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: mobileMotion.medium,
      easing: mobileMotion.easing,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [progress, reducedMotion, visible]);

  if (!mounted) {
    return null;
  }

  if (reducedMotion) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function PressableScale({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.985,
  style,
  contentStyle,
  ...props
}: PressableProps & {
  children: ReactNode;
  pressedScale?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    if (reducedMotion) {
      return;
    }

    Animated.timing(scale, {
      toValue: value,
      duration: mobileMotion.short,
      easing: mobileMotion.easing,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          animateTo(pressedScale);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View style={[{ transform: [{ scale }] }, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function usePulseAnimation() {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(0.5);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 920,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 920,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);

  if (reducedMotion) {
    return 0.62;
  }

  return progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.86],
  });
}
