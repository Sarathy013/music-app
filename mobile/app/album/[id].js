import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { musicAPI } from '../../services/api';
import TrackCard from '../../components/TrackCard';
import EmptyState from '../../components/EmptyState';
import { usePlayer } from '../../store/PlayerContext';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { loadAndPlay } = usePlayer();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      musicAPI.getAlbum(id)
        .then((res) => setAlbum(res?.album || null))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!album) {
    return <EmptyState icon="albums" title="Album not found" />;
  }

  const tracks = album.tracks || [];

  return (
    <View style={styles.screen}>
      <FlatList
        data={tracks}
        keyExtractor={(item, index) => String(item.id || item.trackId || item._id || index)}
        renderItem={({ item, index }) => (
          <TrackCard track={item} queue={tracks} index={index} />
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <LinearGradient colors={[Colors.primaryDark, Colors.bg]} style={styles.hero}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            {album.artworkUrl ? (
              <Image source={{ uri: album.artworkUrl }} style={styles.artwork} />
            ) : (
              <LinearGradient colors={[Colors.primary, Colors.accentGlow]} style={[styles.artwork, styles.artworkFallback]}>
                <Ionicons name="albums" size={60} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
            <Text style={styles.albumName}>{album.name}</Text>
            <Text style={styles.albumArtist}>{album.artist}</Text>
            {album.year && <Text style={styles.albumYear}>{album.year}</Text>}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.shuffleBtn} onPress={() => {
                if (tracks.length) {
                  const i = Math.floor(Math.random() * tracks.length);
                  loadAndPlay(tracks[i], tracks, i);
                }
              }}>
                <Ionicons name="shuffle" size={18} color={Colors.primary} />
                <Text style={styles.shuffleText}>Shuffle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={() => tracks.length && loadAndPlay(tracks[0], tracks, 0)}>
                <LinearGradient colors={[Colors.primary, Colors.accentGlow]} style={styles.playBtnGrad}>
                  <Ionicons name="play" size={22} color={Colors.white} />
                  <Text style={styles.playText}>Play</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        }
        ListEmptyComponent={
          <EmptyState icon="musical-notes" title="No tracks" subtitle="No tracks available for this album." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingTop: 54,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  backBtn: {
    position: 'absolute',
    top: 54,
    left: Spacing.base,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: {
    width: 180,
    height: 180,
    borderRadius: Radius.xl,
    marginTop: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallback: {},
  albumName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xl, color: Colors.textPrimary, textAlign: 'center', marginTop: 8 },
  albumArtist: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  albumYear: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.base },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shuffleText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.sm, color: Colors.primary },
  playBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  playBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  playText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.sm, color: Colors.white },
});
