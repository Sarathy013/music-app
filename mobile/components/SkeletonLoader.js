import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SkeletonBox({ width, height, style, borderRadius = 8 }) {
  const [shimmer] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.65],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.bgElevated,
          opacity,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.04)',
        },
        style,
      ]}
    />
  );
}

export function TrackSkeleton() {
  return (
    <View style={styles.trackRow}>
      <SkeletonBox width={52} height={52} borderRadius={Radius.md} />
      <View style={styles.trackInfo}>
        <SkeletonBox width={SCREEN_WIDTH * 0.52} height={14} borderRadius={4} />
        <SkeletonBox width={SCREEN_WIDTH * 0.32} height={11} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <SkeletonBox width={36} height={12} borderRadius={4} />
    </View>
  );
}

export function AlbumCardSkeleton() {
  return (
    <View style={styles.albumCard}>
      <SkeletonBox width={144} height={144} borderRadius={Radius.lg} />
      <SkeletonBox width={120} height={13} borderRadius={4} style={{ marginTop: 10 }} />
      <SkeletonBox width={80} height={10} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
  );
}

export function ArtistSkeleton() {
  return (
    <View style={styles.artistRow}>
      <SkeletonBox width={54} height={54} borderRadius={27} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <SkeletonBox width={130} height={14} borderRadius={4} />
        <SkeletonBox width={70} height={10} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function ScreenSkeleton() {
  return (
    <View style={styles.screenSkeleton}>
      <View style={styles.headerSkeleton}>
        <SkeletonBox width={160} height={26} borderRadius={6} />
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>

      <View style={{ paddingHorizontal: Spacing.base, marginBottom: Spacing.lg }}>
        <SkeletonBox width={SCREEN_WIDTH - 32} height={130} borderRadius={Radius.xl} />
      </View>

      <View style={{ paddingHorizontal: Spacing.base, marginBottom: Spacing.md }}>
        <SkeletonBox width={130} height={18} borderRadius={4} />
      </View>

      <View style={styles.horizontalRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <AlbumCardSkeleton key={i} />
        ))}
      </View>

      <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.sm, marginBottom: Spacing.sm }}>
        <SkeletonBox width={150} height={18} borderRadius={4} />
      </View>

      {Array.from({ length: 6 }).map((_, i) => (
        <TrackSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.md,
  },
  trackInfo: {
    flex: 1,
  },
  albumCard: {
    marginRight: 14,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  screenSkeleton: {
    flex: 1,
    paddingTop: 56,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  horizontalRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
});
