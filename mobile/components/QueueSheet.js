import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { usePlayer } from '../store/PlayerContext';

function formatTime(s) {
  if (!s && s !== 0) return '';
  if (typeof s === 'string' && s.includes(':')) return s;
  const num = Number(s);
  if (isNaN(num) || num < 0) return '';
  const sec = num > 1000 ? Math.floor(num / 1000) : Math.floor(num);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${rem.toString().padStart(2, '0')}`;
}

export default function QueueSheet({ visible, onClose }) {
  const { queue, currentIndex, currentTrack, isPlaying, playFromQueue, removeFromQueue } = usePlayer();
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(600);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  const queueList = Array.isArray(queue) ? queue : [];
  const validCurrentIndex =
    typeof currentIndex === 'number' && currentIndex >= 0 ? currentIndex : 0;
  const upNext = queueList.slice(validCurrentIndex + 1).filter(Boolean);
  const history = queueList.slice(0, validCurrentIndex).filter(Boolean);

  const curId = currentTrack?.id || currentTrack?.trackId;

  const renderTrackItem = ({ item, index: listIndex, isHistory }) => {
    if (!item) return null;

    const queueIndex = isHistory ? listIndex : validCurrentIndex + 1 + listIndex;
    const itemId = item.id || item.trackId;
    const isActive = Boolean(itemId && curId && itemId === curId);

    const titleText =
      typeof item.title === 'string'
        ? item.title
        : item?.title?.name || item?.name || 'Unknown Track';

    const artistText =
      typeof item.artist === 'string'
        ? item.artist
        : item?.artist?.name ||
          (Array.isArray(item.artist)
            ? item.artist.map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean).join(', ')
            : 'Unknown Artist');

    const artworkUri = typeof item.artworkUrl === 'string' ? item.artworkUrl : null;
    const uniqueKey = `${isHistory ? 'hist' : 'upnext'}-${itemId || listIndex}-${listIndex}`;

    return (
      <TouchableOpacity
        key={uniqueKey}
        style={[styles.trackRow, isActive && styles.activeRow]}
        onPress={() => {
          playFromQueue(queueIndex);
        }}
        activeOpacity={0.75}
      >
        {/* Artwork */}
        <View style={styles.artworkWrap}>
          {artworkUri ? (
            <Image source={{ uri: artworkUri }} style={styles.artwork} />
          ) : (
            <LinearGradient
              colors={
                isActive
                  ? [Colors.primaryDark, Colors.primary]
                  : [Colors.bgElevated, Colors.bgCard]
              }
              style={[styles.artwork, { alignItems: 'center', justifyContent: 'center' }]}
            >
              <Ionicons
                name="musical-notes"
                size={14}
                color={isActive ? Colors.white : Colors.textMuted}
              />
            </LinearGradient>
          )}
          {isActive && isPlaying && (
            <View style={styles.activeOverlay}>
              <Ionicons name="volume-medium" size={12} color={Colors.white} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.trackInfo}>
          <Text
            style={[styles.trackTitle, isActive && styles.activeText]}
            numberOfLines={1}
          >
            {titleText}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {artistText}
          </Text>
        </View>

        {/* Duration & remove */}
        <Text style={styles.duration}>{formatTime(item.duration)}</Text>
        {!isHistory && !isActive && (
          <TouchableOpacity
            onPress={() => removeFromQueue(queueIndex)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="remove-circle-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const nowPlayingTitle =
    typeof currentTrack?.title === 'string'
      ? currentTrack.title
      : currentTrack?.title?.name || 'Unknown Track';

  const nowPlayingArtist =
    typeof currentTrack?.artist === 'string'
      ? currentTrack.artist
      : currentTrack?.artist?.name ||
        (Array.isArray(currentTrack?.artist)
          ? currentTrack.artist.map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean).join(', ')
          : 'Unknown Artist');

  const nowPlayingArtwork =
    typeof currentTrack?.artworkUrl === 'string' ? currentTrack.artworkUrl : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Queue</Text>
              <Text style={styles.subtitle}>
                {queueList.length} tracks · Now playing #{validCurrentIndex + 1}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Now Playing */}
          {currentTrack && (
            <View style={styles.nowPlayingSection}>
              <Text style={styles.sectionLabel}>NOW PLAYING</Text>
              <View style={styles.nowPlayingRow}>
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.primary, Colors.accent]}
                  style={[styles.nowArtwork]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {nowPlayingArtwork ? (
                    <Image
                      source={{ uri: nowPlayingArtwork }}
                      style={[styles.nowArtwork, { position: 'absolute' }]}
                    />
                  ) : (
                    <Ionicons name="musical-notes" size={18} color={Colors.white} />
                  )}
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nowTitle} numberOfLines={1}>
                    {nowPlayingTitle}
                  </Text>
                  <Text style={styles.nowArtist} numberOfLines={1}>
                    {nowPlayingArtist}
                  </Text>
                </View>
                <View style={styles.playingBadge}>
                  <Ionicons name="volume-medium" size={12} color={Colors.primary} />
                  <Text style={styles.playingText}>{isPlaying ? 'Playing' : 'Paused'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Up Next Label */}
          {upNext.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>UP NEXT · {upNext.length}</Text>
            </View>
          )}

          <FlatList
            data={upNext}
            keyExtractor={(item, i) => `next-${item?.id || item?.trackId || i}-${i}`}
            renderItem={({ item, index }) => renderTrackItem({ item, index, isHistory: false })}
            ListFooterComponent={
              history.length > 0 ? (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                      PREVIOUSLY PLAYED · {history.length}
                    </Text>
                  </View>
                  {history.map((item, index) =>
                    renderTrackItem({ item, index, isHistory: true })
                  )}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Queue is empty</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgGlass,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 8,
  },
  nowArtwork: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nowTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  nowArtist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.bgGlassStrong,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  playingText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Colors.primary,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  activeRow: {
    backgroundColor: Colors.bgGlass,
  },
  artworkWrap: {
    position: 'relative',
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(108,99,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  activeText: {
    color: Colors.primaryLight,
  },
  trackArtist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  duration: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
  },
});
