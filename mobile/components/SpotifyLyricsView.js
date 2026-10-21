import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function parseLRC(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split('\n');
  const parsed = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\](.*)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisPart = match[3] || '0';
      const millis = millisPart.length === 2 ? parseInt(millisPart, 10) * 10 : parseInt(millisPart, 10);
      const timeMs = minutes * 60000 + seconds * 1000 + millis;
      const text = match[4].trim();
      if (text) {
        parsed.push({ id: `line-${i}`, timeMs, text });
      }
    }
  }

  return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

export default function SpotifyLyricsView({
  lyricsData,
  currentTimeMs,
  isLoading,
  onSeekTo,
  onRetry,
}) {
  const scrollViewRef = useRef(null);

  const syncedLines = React.useMemo(() => {
    if (lyricsData?.syncedLyrics) {
      return parseLRC(lyricsData.syncedLyrics);
    }
    return [];
  }, [lyricsData?.syncedLyrics]);

  const activeIndex = React.useMemo(() => {
    if (!syncedLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentTimeMs >= syncedLines[i].timeMs) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [syncedLines, currentTimeMs]);

  // Smoothly auto-scroll to the current singing lyric line without nesting VirtualizedLists
  useEffect(() => {
    if (activeIndex >= 0 && scrollViewRef.current) {
      try {
        const targetY = Math.max(0, activeIndex * 52 - 80);
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      } catch (err) {}
    }
  }, [activeIndex]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching lyrics...</Text>
      </View>
    );
  }

  if (!lyricsData || (!lyricsData.syncedLyrics && !lyricsData.plainLyrics)) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Lyrics Found</Text>
        <Text style={styles.emptySubtitle}>
          Lyrics aren't available for this track yet.
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 1. Synced Karaoke / Spotify Style using ScrollView (Eliminates VirtualizedList in ScrollView error)
  if (syncedLines.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.indicatorBadge}>
          <Ionicons name="radio" size={12} color={Colors.primaryLight} />
          <Text style={styles.indicatorText}>SYNCED LYRICS</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled={true}
        >
          {syncedLines.map((item, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => onSeekTo && onSeekTo(item.timeMs)}
                style={[styles.lyricRow, isActive && styles.activeLyricRow]}
              >
                <Text
                  style={[
                    styles.lyricText,
                    isActive && styles.activeLyricText,
                    isPast && styles.pastLyricText,
                  ]}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // 2. Plain Text Lyrics
  const plainLines = (lyricsData.plainLyrics || '').split('\n').filter((l) => l.trim());
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled={true}
      >
        {plainLines.map((line, i) => (
          <View key={`plain-${i}`} style={styles.lyricRow}>
            <Text style={styles.plainLyricText}>{line}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
  indicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  indicatorText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.primaryLight,
  },
  listContent: {
    paddingVertical: 20,
    paddingBottom: 80,
  },
  lyricRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  activeLyricRow: {
    transform: [{ scale: 1.03 }],
  },
  lyricText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    lineHeight: 32,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  activeLyricText: {
    color: Colors.white,
    fontSize: 26,
    lineHeight: 36,
    textShadowColor: 'rgba(108, 99, 255, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pastLyricText: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  plainLyricText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 18,
    lineHeight: 28,
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
