import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { musicAPI } from '../../services/api';
import TrackCard from '../../components/TrackCard';
import EmptyState from '../../components/EmptyState';
import { usePlayer } from '../../store/PlayerContext';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { loadAndPlay } = usePlayer();

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      musicAPI.getArtist(id).then((res) => {
        if (res?.artist) setArtist(res.artist);
        if (res?.tracks) setTracks(res.tracks);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!artist) {
    return <EmptyState icon="person" title="Artist not found" />;
  }

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
          <>
            <LinearGradient
              colors={[Colors.primaryDark, Colors.bg]}
              style={styles.hero}
            >
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.avatar}>
                {artist.artworkUrl || artist.imageUrl ? (
                  <Image source={{ uri: artist.artworkUrl || artist.imageUrl }} style={StyleSheet.absoluteFill} borderRadius={50} />
                ) : (
                  <Text style={styles.avatarText}>{artist.name?.[0] || 'A'}</Text>
                )}
              </View>
              <Text style={styles.artistName}>{artist.name}</Text>
              {artist.era && <Text style={styles.artistEra}>{artist.era}</Text>}
              {artist.bio ? (
                <Text style={styles.bio} numberOfLines={4}>{artist.bio}</Text>
              ) : null}
              {tracks.length > 0 && (
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => loadAndPlay(tracks[0], tracks, 0)}
                >
                  <LinearGradient colors={[Colors.primary, Colors.accentGlow]} style={styles.playAllGrad}>
                    <Ionicons name="play" size={20} color={Colors.white} />
                    <Text style={styles.playAllText}>Play All</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>

            <View style={styles.tracksHeader}>
              <Text style={styles.tracksTitle}>Popular Tracks</Text>
              <Text style={styles.trackCount}>{tracks.length} tracks</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="musical-notes" title="No tracks found" subtitle="No tracks available for this composer." />
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
    paddingBottom: Spacing['2xl'],
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
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarText: { fontFamily: Typography.fontFamily.bold, fontSize: 44, color: Colors.white },
  artistName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['2xl'], color: Colors.textPrimary, textAlign: 'center' },
  artistEra: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.primaryLight },
  bio: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  playAllBtn: { marginTop: Spacing.base, borderRadius: Radius.full, overflow: 'hidden' },
  playAllGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  playAllText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.base, color: Colors.white },
  tracksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tracksTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.lg, color: Colors.textPrimary },
  trackCount: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textMuted },
});
