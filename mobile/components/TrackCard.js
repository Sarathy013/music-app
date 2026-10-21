import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
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
  if (track.source === 'jamendo') return { label: 'CC', color: Colors.teal };
  if (track.source === 'musopen') return { label: 'Classic', color: Colors.primaryLight };
  return null;
}

// Memoized EqBars — animations are stable across re-renders
const EqBars = React.memo(function EqBars() {
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    const animate = (anim, toVal, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: toVal, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration, useNativeDriver: true }),
        ])
      ).start();
    animate(bar1, 1.0, 350);
    animate(bar2, 0.9, 450);
    animate(bar3, 0.8, 300);
  }, []);

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

export default function TrackCard({ track, queue = [], index = 0, style, onPress }) {
  if (!track) return null;
  const { loadAndPlay, currentTrack, isPlaying, addToQueue } = usePlayer();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const isActive = currentTrack?.id === track?.id;

  const handlePress = () => {
    if (onPress) {
      onPress(track);
    } else {
      loadAndPlay(track, queue.length ? queue : [track], index);
    }
  };

  const badge = getBadgeInfo(track);

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[styles.card, isActive && styles.activeCard, style]}
        onPress={handlePress}
        activeOpacity={0.65}
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
          onPress={() => addToQueue && addToQueue(track)}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          style={styles.actionIcon}
          activeOpacity={0.5}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {showPlaylistModal && (
        <AddToPlaylistModal
          visible={showPlaylistModal}
          track={track}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </View>
  );
}

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
    backgroundColor: Colors.bgGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  artworkContainer: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  artwork: { width: 52, height: 52, borderRadius: Radius.md },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(108,99,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  activeTitle: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semibold,
  },
  artist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  sourceBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.semibold,
    letterSpacing: 0.5,
  },
  trailing: { alignItems: 'flex-end', gap: Spacing.xs },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
