import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../store/PlayerContext';
import { Colors, Typography, Spacing, Radius, MINI_PLAYER_HEIGHT, BOTTOM_TAB_HEIGHT, Shadow } from '../constants/theme';
import { useRouter } from 'expo-router';

// Pulsing dot animation for "now playing"
function PlayingDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.playingDot, { transform: [{ scale: pulse }] }]} />
  );
}

export default function MiniPlayer() {
  const {
    currentTrack, isPlaying, isLoading, position, duration,
    togglePlayPause, skipNext, skipPrevious, closePlayer,
  } = usePlayer();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(120)).current;

  // Slide in when track loads
  useEffect(() => {
    if (currentTrack) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;

  const handleOpenFullPlayer = () => {
    router.push('/player');
  };

  const getSourceBadgeText = (track) => {
    if (!track?.source) return null;
    if (track.source === 'youtube') return 'YouTube';
    if (track.source === 'spotify') return 'Spotify';
    if (track.source === 'saavn') {
      if (track.language === 'tamil') return 'Tamil';
      if (track.language === 'hindi') return 'Hindi';
      if (track.language === 'english') return 'English';
      return 'HQ';
    }
    if (track.source === 'jamendo') return 'CC';
    if (track.source === 'musopen') return 'PD';
    return null;
  };

  const badgeText = getSourceBadgeText(currentTrack);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Gradient background with glassmorphism */}
      <LinearGradient
        colors={['rgba(30,22,60,0.98)', 'rgba(14,14,24,0.99)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Progress bar at top */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Track Artwork + Details (Clicking here opens full screen player) */}
        <TouchableOpacity
          style={styles.infoArea}
          onPress={handleOpenFullPlayer}
          activeOpacity={0.8}
        >
          <View style={styles.artworkWrap}>
            {currentTrack.artworkUrl ? (
              <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
            ) : (
              <LinearGradient
                colors={[Colors.primaryDark, Colors.primary, Colors.accent]}
                style={[styles.artwork, styles.artworkFallback]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-notes" size={16} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            {isPlaying && (
              <View style={styles.playingIndicator}>
                <PlayingDot />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <View style={styles.artistRow}>
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artist || 'Unknown Artist'}
              </Text>
              {badgeText && (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Playback Controls (Independent touch targets, do NOT open full screen) */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={skipPrevious}
            style={styles.btn}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <Ionicons name="play-skip-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.playBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={Colors.white}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipNext}
            style={styles.btn}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <Ionicons name="play-skip-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={closePlayer}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM_TAB_HEIGHT + 6,
    left: 10,
    right: 10,
    height: MINI_PLAYER_HEIGHT,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    ...Shadow.lg,
    zIndex: 999,
  },
  progressBar: {
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
    paddingRight: 4,
  },
  artworkWrap: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'visible',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  artist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  badgeWrap: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: Colors.bgElevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 8,
    color: Colors.primaryLight,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
});
