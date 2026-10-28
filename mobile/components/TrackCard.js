import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { usePlayer } from '../store/PlayerContext';
import AddToPlaylistModal from './AddToPlaylistModal';

function formatTime(s) {
  if (!s) return '0:00';
  const sec = typeof s === 'number' && s > 1000 ? Math.floor(s / 1000) : Math.floor(s);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${rem.toString().padStart(2, '0')}`;
}

function getBadgeInfo(track) {
  if (!track) return null;
  if (track.source === 'youtube') return { label: 'YouTube', color: '#EF4444' };
  if (track.source === 'spotify') return { label: 'Spotify', color: '#10B981' };
  if (track.source === 'saavn') {
    if (track.language === 'tamil') return { label: 'Tamil', color: '#F97316' };
    if (track.language === 'hindi') return { label: 'Hindi', color: '#EAB308' };
    if (track.language === 'english') return { label: 'English', color: '#38BDF8' };
    return { label: 'HQ 320k', color: '#8B5CF6' };
  }
  if (track.source === 'jamendo') {
    return track.license === 'Creative Commons'
      ? { label: 'CC', color: Colors.teal }
      : { label: 'Jamendo', color: Colors.teal };
  }
  if (track.source === 'musopen') return { label: 'Classical', color: Colors.primaryLight };
  return null;
}

// Memoized EqBars — animations are stable across re-renders
const EqBars = React.memo(function EqBars() {
  const [bar1] = React.useState(() => new Animated.Value(0.4));
  const [bar2] = React.useState(() => new Animated.Value(0.7));
  const [bar3] = React.useState(() => new Animated.Value(0.5));

  React.useEffect(() => {
    const animate = (anim, toVal, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: toVal, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration, useNativeDriver: true }),
        ])
      ).start();
    animate(bar1, 1.0, 320);
    animate(bar2, 0.9, 440);
    animate(bar3, 0.8, 290);
  }, [bar1, bar2, bar3]);

  return (
    <View style={eqStyles.container}>
      {[bar1, bar2, bar3].map((bar, i) => (
        <Animated.View key={i} style={[eqStyles.bar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
});

const eqStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 18 },
  bar: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.primary },
});

function TrackCardComponent({ track, queue = [], index = 0, style, onPress }) {
  const { loadAndPlay, currentTrack, isPlaying, addToQueue } = usePlayer();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [addedToQueue, setAddedToQueue] = useState(false);

  const [pressScaleAnim] = useState(() => new Animated.Value(1));
  const [checkScaleAnim] = useState(() => new Animated.Value(1));
  const isActive = currentTrack?.id === track?.id;

  if (!track) return null;

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      tension: 90,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress(track);
    } else {
      loadAndPlay(track, queue.length ? queue : [track], index);
    }
  };

  const handleAddToQueue = () => {
    if (addToQueue) {
      addToQueue(track);
      setAddedToQueue(true);
      checkScaleAnim.setValue(0.3);
      Animated.spring(checkScaleAnim, {
        toValue: 1,
        tension: 110,
        friction: 6,
        useNativeDriver: true,
      }).start();
      setTimeout(() => setAddedToQueue(false), 1400);
    }
  };

  const badge = getBadgeInfo(track);

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: pressScaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.card, isActive && styles.activeCard, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {isActive && <View style={styles.activeBar} />}

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {track.artworkUrl ? (
            <Image source={{ uri: track.artworkUrl }} style={styles.artwork} />
          ) : (
            <LinearGradient
              colors={isActive ? [Colors.primaryDark, Colors.primary] : [Colors.bgElevated, Colors.bgCard]}
              style={[styles.artwork, styles.artworkFallback]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={20} color={isActive ? Colors.white : Colors.primaryLight} />
            </LinearGradient>
          )}
          {isActive && (
            <View style={styles.activeOverlay}>
              {isPlaying ? <EqBars /> : <Ionicons name="pause" size={16} color={Colors.white} />}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, isActive && styles.activeTitle]} numberOfLines={1}>
            {track.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist || 'Unknown Artist'}
            </Text>
            {badge && (
              <View style={[styles.sourceBadge, { borderColor: badge.color, backgroundColor: `${badge.color}18` }]}>
                <Text style={[styles.sourceText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Duration */}
        <Text style={styles.duration}>{formatTime(track.duration)}</Text>
      </TouchableOpacity>

      {/* Action buttons with isolated touch bounds */}
      <View style={styles.actionBtns}>
        <TouchableOpacity
          onPress={() => setShowPlaylistModal(true)}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          style={styles.actionIcon}
          activeOpacity={0.5}
        >
          <Ionicons name="bookmark-outline" size={19} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAddToQueue}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          style={styles.actionIcon}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: checkScaleAnim }] }}>
            <Ionicons
              name={addedToQueue ? "checkmark-circle" : "add-circle-outline"}
              size={20}
              color={addedToQueue ? Colors.success : Colors.primaryLight}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {showPlaylistModal && (
        <AddToPlaylistModal
          visible={showPlaylistModal}
          track={track}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </Animated.View>
  );
}

const TrackCard = React.memo(TrackCardComponent, (prev, next) => {
  return (
    prev.track?.id === next.track?.id &&
    prev.index === next.index &&
    prev.queue?.length === next.queue?.length &&
    prev.style === next.style
  );
});

export default TrackCard;

const styles = StyleSheet.create({
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    backgroundColor: Colors.transparent,
    borderRadius: Radius.lg,
  },
  activeCard: {
    backgroundColor: 'rgba(108,99,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  artworkContainer: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  activeTitle: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  artist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'center',
  },
  sourceText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  duration: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
    gap: 4,
  },
  actionIcon: {
    padding: 6,
  },
});
