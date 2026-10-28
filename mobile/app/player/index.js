import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Animated,
  StatusBar, ScrollView, Share, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { usePlayer, usePlayerProgress } from '../../store/PlayerContext';
import { favoritesAPI, musicAPI } from '../../services/api';
import { REPEAT_MODES } from '../../constants/config';
import SleepTimerModal from '../../components/SleepTimerModal';
import QueueSheet from '../../components/QueueSheet';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import SpotifyLyricsView from '../../components/SpotifyLyricsView';
import { downloadSong, isTrackDownloaded } from '../../utils/downloader';
import { showAlert } from '../../utils/alert';
import MusicBackdrop from '../../components/MusicBackdrop';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.36);

function formatTime(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const s = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const SOURCE_LABELS = {
  saavn: { label: '320kbps High Quality', color: '#8B5CF6' },
  youtube: { label: 'YouTube Music Stream', color: '#EF4444' },
  spotify: { label: 'Spotify Track Match', color: '#10B981' },
  jamendo: { label: 'Creative Commons', color: Colors.teal },
  musopen: { label: 'Classical catalog', color: Colors.primaryLight },
  fma: { label: 'Free Music Archive', color: Colors.warning },
};

export default function PlayerScreen() {
  const router = useRouter();
  const {
    currentTrack, isPlaying, isLoading, error,
    volume, isShuffle, repeatMode, sleepTimerMinutes,
    togglePlayPause, seekTo, setVolume,
    skipNext, skipPrevious, toggleShuffle, cycleRepeat,
  } = usePlayer();
  const { position, duration } = usePlayerProgress();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  // Tabs: 'artwork' or 'lyrics' (Spotify style toggle)
  const [activeTab, setActiveTab] = useState('artwork');
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Download state
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [, setDownloadProgress] = useState(0);

  const [artworkScale] = useState(() => new Animated.Value(isPlaying ? 1 : 0.92));
  const [artworkTilt] = useState(() => new Animated.Value(0));
  const [favScaleAnim] = useState(() => new Animated.Value(1));
  const [playBtnScale] = useState(() => new Animated.Value(1));
  const [glowPulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    let loop;
    if (isPlaying) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 0.9, duration: 1600, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.35, duration: 1600, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      glowPulse.setValue(0.2);
    }
    return () => loop?.stop();
  }, [isPlaying, glowPulse]);

  useEffect(() => {
    Animated.spring(artworkScale, {
      toValue: isPlaying ? 1 : 0.92,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, artworkScale]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(artworkTilt, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(artworkTilt, { toValue: 0, speed: 16, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, [currentTrack?.id, artworkTilt]);

  const loadLyrics = useCallback(async () => {
    if (!currentTrack) return;
    setLyricsLoading(true);
    try {
      const res = await musicAPI.getLyrics({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        duration: currentTrack.duration,
      });
      if (res?.found && res?.lyrics) {
        setLyricsData(res.lyrics);
      } else {
        setLyricsData(null);
      }
    } catch {
      setLyricsData(null);
    } finally {
      setLyricsLoading(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack?.id) {
      favoritesAPI.check(currentTrack.id)
        .then((r) => setIsFavorite(r?.isFavorite || false))
        .catch(() => {});

      isTrackDownloaded(currentTrack.id)
        .then((res) => setIsDownloaded(res))
        .catch(() => {});

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Start lyrics loading for the selected track.
      loadLyrics();
    }
  }, [currentTrack?.id, loadLyrics]);

  const handleDownload = async () => {
    if (!currentTrack || isDownloading) return;
    if (isDownloaded) {
      showAlert('Already Downloaded', `"${currentTrack.title}" is already stored on your device.`);
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const saved = await downloadSong(currentTrack, (prog) => {
        setDownloadProgress(prog);
      });
      if (saved) {
        setIsDownloaded(true);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!currentTrack) return;
    Animated.sequence([
      Animated.timing(favScaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(favScaleAnim, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
    ]).start();
    try {
      if (isFavorite) {
        await favoritesAPI.remove(currentTrack.id);
        setIsFavorite(false);
      } else {
        await favoritesAPI.add(currentTrack);
        setIsFavorite(true);
      }
    } catch {
      showAlert('Notice', 'Log in to save favorites to your profile');
    }
  };

  const handleTogglePlay = () => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(playBtnScale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
    ]).start();
    togglePlayPause();
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `Listening to "${currentTrack.title}" by ${currentTrack.artist} on VibeStream!`,
        title: currentTrack.title,
      });
    } catch {}
  };

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safePosition = Number.isFinite(position) && position > 0 ? position : 0;
  const progress = safeDuration > 0 ? safePosition / safeDuration : 0;
  const rawProgress = isSeeking ? seekValue : progress;
  const displayProgress = Number.isFinite(rawProgress) ? Math.min(Math.max(rawProgress, 0), 1) : 0;

  const repeatColor = repeatMode === REPEAT_MODES.OFF ? Colors.textMuted : Colors.primary;
  const sourceInfo = currentTrack?.source ? (SOURCE_LABELS[currentTrack.source] || SOURCE_LABELS.saavn) : null;

  if (!currentTrack) {
    return (
      <View style={[styles.screen, styles.center]}>
        <LinearGradient
          colors={[Colors.primaryDark + '60', Colors.bg]}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="musical-notes" size={64} color={Colors.textMuted} />
        <Text style={styles.noTrack}>No track playing</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <MusicBackdrop isPlaying={isPlaying} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
            <Text style={styles.albumName} numberOfLines={1}>
              {currentTrack.album || currentTrack.genre || 'Song'}
            </Text>
          </View>

          {/* Toggle between Song view & Full-Screen Lyrics view */}
          <TouchableOpacity
            style={[styles.lyricsToggleBtn, activeTab === 'lyrics' && styles.lyricsToggleActive]}
            onPress={() => setActiveTab(activeTab === 'lyrics' ? 'artwork' : 'lyrics')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'lyrics' ? 'musical-notes' : 'text'}
              size={18}
              color={activeTab === 'lyrics' ? Colors.white : Colors.primaryLight}
            />
            <Text style={[styles.lyricsToggleText, activeTab === 'lyrics' && styles.lyricsToggleTextActive]}>
              {activeTab === 'lyrics' ? 'Cover' : 'Lyrics'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Notification Banner if any */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        )}

        {/* Main Content: Lyrics View or Album Artwork View */}
        {activeTab === 'lyrics' ? (
          <View style={styles.lyricsContainer}>
            <SpotifyLyricsView
              lyricsData={lyricsData}
              currentTimeMs={safePosition}
              isLoading={lyricsLoading}
              onSeekTo={(ms) => seekTo(ms)}
              onRetry={loadLyrics}
            />
          </View>
        ) : (
          <View>
            {/* Artwork */}
            <View style={styles.artworkWrap}>
              <Animated.View
                style={[
                  styles.glowHalo,
                  {
                    opacity: isPlaying ? glowPulse : 0.2,
                    transform: [{ scale: artworkScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.artworkContainer,
                  {
                    transform: [
                      { scale: artworkScale },
                      { rotate: artworkTilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1.5deg'] }) },
                    ],
                  },
                ]}
              >
                {currentTrack.artworkUrl ? (
                  <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
                ) : (
                  <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary, Colors.accent]}
                    style={[styles.artwork, styles.artworkFallback]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.6)" />
                  </LinearGradient>
                )}
              </Animated.View>
            </View>

            {/* Track Title, Artist, & Favorite */}
            <View style={styles.trackInfo}>
              <View style={styles.trackInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle} numberOfLines={2}>
                    {currentTrack.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {currentTrack.artist || 'Unknown Artist'}
                  </Text>
                </View>
                <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: favScaleAnim }] }}>
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={28}
                      color={isFavorite ? Colors.accent : Colors.textMuted}
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Source & Bitrate Badge */}
              {sourceInfo && (
                <View style={[styles.sourceBadge, { borderColor: sourceInfo.color + '60' }]}>
                  <Ionicons name="sparkles" size={12} color={sourceInfo.color} />
                  <Text style={[styles.sourceText, { color: sourceInfo.color }]}>
                    {sourceInfo.label}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Playback Slider */}
        <View style={styles.progressSection}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={displayProgress}
            onSlidingStart={() => setIsSeeking(true)}
            onValueChange={(val) => setSeekValue(Number.isFinite(val) ? val : 0)}
            onSlidingComplete={(val) => {
              setIsSeeking(false);
              const validVal = Number.isFinite(val) ? val : 0;
              seekTo(validVal * safeDuration);
            }}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor={Colors.white}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>
              {formatTime(isSeeking ? seekValue * safeDuration : safePosition)}
            </Text>
            <Text style={styles.time}>{formatTime(safeDuration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={toggleShuffle}
            style={styles.sideBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons
              name="shuffle"
              size={22}
              color={isShuffle ? Colors.primary : Colors.textMuted}
            />
            {isShuffle && <View style={styles.activeDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipPrevious}
            style={styles.skipBtn}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            activeOpacity={0.65}
          >
            <Ionicons name="play-skip-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
          <TouchableOpacity
            onPress={handleTogglePlay}
            style={styles.playBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.playBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={Colors.white}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={skipNext}
            style={styles.skipBtn}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            activeOpacity={0.65}
          >
            <Ionicons name="play-skip-forward" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cycleRepeat}
            style={styles.sideBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons name="repeat" size={22} color={repeatColor} />
            {repeatMode === REPEAT_MODES.ONE && (
              <Text style={styles.repeatOneLabel}>1</Text>
            )}
            {repeatMode !== REPEAT_MODES.OFF && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </View>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={16} color={Colors.textMuted} />
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={Number.isFinite(volume) ? volume : 1}
            onValueChange={(val) => setVolume(Number.isFinite(val) ? val : 1)}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor={Colors.primary}
          />
          <Ionicons name="volume-high" size={16} color={Colors.textMuted} />
        </View>

        {/* Bottom Actions Bar with Download & Lyrics Quick Action */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowSleepTimer(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons
              name="moon-outline"
              size={20}
              color={sleepTimerMinutes > 0 ? Colors.primary : Colors.textMuted}
            />
            {sleepTimerMinutes > 0 && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerBadgeText}>{sleepTimerMinutes}m</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Download Song Button */}
          <TouchableOpacity
            style={[styles.actionBtn, isDownloaded && styles.actionBtnActive]}
            onPress={handleDownload}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.primaryLight} />
            ) : (
              <Ionicons
                name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                size={22}
                color={isDownloaded ? Colors.success : Colors.textMuted}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowAddToPlaylist(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons name="add-circle-outline" size={22} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons name="share-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowQueue(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.65}
          >
            <Ionicons name="list" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <SleepTimerModal visible={showSleepTimer} onClose={() => setShowSleepTimer(false)} />
      <QueueSheet visible={showQueue} onClose={() => setShowQueue(false)} />
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        track={currentTrack}
        onClose={() => setShowAddToPlaylist(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: {
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  noTrack: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.primaryLight,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 48,
    paddingBottom: Spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lyricsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  lyricsToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  lyricsToggleText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryLight,
  },
  lyricsToggleTextActive: {
    color: Colors.white,
  },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  nowPlayingLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  albumName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },

  lyricsContainer: {
    height: ARTWORK_SIZE + 100,
    marginVertical: Spacing.md,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    flex: 1,
  },

  glowHalo: {
    position: 'absolute',
    width: ARTWORK_SIZE + 24,
    height: ARTWORK_SIZE + 24,
    borderRadius: Radius.xl + 12,
    backgroundColor: 'rgba(108,99,255,0.4)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
  },
  artworkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  artworkContainer: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  artwork: { width: '100%', height: '100%' },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  trackInfo: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  trackArtist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  favBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  sourceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.3,
  },

  progressSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  time: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  playBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  repeatOneLabel: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },

  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  volumeSlider: { flex: 1, height: 30 },

  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  timerBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  timerBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 7,
    color: Colors.white,
  },
});
