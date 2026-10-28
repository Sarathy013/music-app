import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer, usePlayerProgress } from '../store/PlayerContext';
import { Colors, Typography, Spacing, Radius, MINI_PLAYER_HEIGHT, BOTTOM_TAB_HEIGHT, Shadow } from '../constants/theme';
import { useRouter } from 'expo-router';

// Animated 3-bar equalizer for "now playing"
function MiniEqBars() {
  const [b1] = useState(() => new Animated.Value(0.3));
  const [b2] = useState(() => new Animated.Value(0.7));
  const [b3] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(b1, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(b1, { toValue: 0.25, duration: 320, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(b2, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(b2, { toValue: 0.2, duration: 420, useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(b3, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(b3, { toValue: 0.3, duration: 280, useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    loop3.start();
    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [b1, b2, b3]);

  return (
    <View style={styles.miniEqRow}>
      <Animated.View style={[styles.miniEqBar, { transform: [{ scaleY: b1 }] }]} />
      <Animated.View style={[styles.miniEqBar, { transform: [{ scaleY: b2 }] }]} />
      <Animated.View style={[styles.miniEqBar, { transform: [{ scaleY: b3 }] }]} />
    </View>
  );
}

export default function MiniPlayer() {
  const {
    currentTrack, isPlaying, isLoading,
    togglePlayPause, skipNext, skipPrevious, closePlayer,
  } = usePlayer();
  const { position, duration } = usePlayerProgress();
  const router = useRouter();
  const [slideAnim] = useState(() => new Animated.Value(120));
  const [playBtnScale] = useState(() => new Animated.Value(1));
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const rotateLoop = useRef(null);

  // Slide in when track loads
  useEffect(() => {
    if (currentTrack) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTrack, currentTrack?.id, slideAnim]);

  // Vinyl continuous rotation when playing
  useEffect(() => {
    if (isPlaying) {
      rotateLoop.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoop.current.start();
    } else {
      rotateLoop.current?.stop();
    }
    return () => rotateLoop.current?.stop();
  }, [isPlaying, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!currentTrack) return null;

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;

  const handleOpenFullPlayer = () => {
    router.push('/player');
  };

  const handleTogglePlayPause = () => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.spring(playBtnScale, { toValue: 1, tension: 90, friction: 5, useNativeDriver: true }),
    ]).start();
    togglePlayPause();
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
    if (track.source === 'jamendo') return track.license === 'Creative Commons' ? 'CC' : 'Jamendo';
    if (track.source === 'musopen') return 'Classical';
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
        colors={['rgba(32,24,65,0.98)', 'rgba(14,14,24,0.99)']}
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
          <Animated.View style={[styles.artworkWrap, { transform: [{ rotate: isPlaying ? spin : '0deg' }] }]}>
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
            <View style={styles.vinylHole} />
          </Animated.View>

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              {isPlaying && <MiniEqBars />}
            </View>
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

          <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
            <TouchableOpacity
              onPress={handleTogglePlayPause}
              style={styles.playBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
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
          </Animated.View>

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
    bottom: BOTTOM_TAB_HEIGHT,
    left: 8,
    right: 8,
    height: MINI_PLAYER_HEIGHT,
    borderRadius: Radius.xl,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylHole: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  miniEqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 12,
  },
  miniEqBar: {
    width: 2.5,
    height: 10,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  artist: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  badgeWrap: {
    backgroundColor: 'rgba(108,99,255,0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: Colors.primaryLight,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    padding: 6,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 2,
  },
});
