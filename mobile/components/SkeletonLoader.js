import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radius } from '../constants/theme';

function SkeletonBox({ width, height, style, borderRadius = 8 }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.bgElevated, opacity },
        style,
      ]}
    />
  );
}

export function TrackSkeleton() {
  return (
    <View style={styles.trackRow}>
      <SkeletonBox width={52} height={52} borderRadius={8} />
      <View style={styles.trackInfo}>
        <SkeletonBox width={160} height={14} />
        <SkeletonBox width={100} height={11} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function AlbumCardSkeleton() {
  return (
    <View style={{ marginRight: 12 }}>
      <SkeletonBox width={140} height={140} borderRadius={14} />
      <SkeletonBox width={120} height={12} style={{ marginTop: 8 }} />
      <SkeletonBox width={80} height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

export function ArtistSkeleton() {
  return (
    <View style={styles.artistRow}>
      <SkeletonBox width={52} height={52} borderRadius={26} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width={140} height={14} />
        <SkeletonBox width={80} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  trackInfo: {
    flex: 1,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
