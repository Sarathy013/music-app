import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { playlistAPI } from '../../services/api';
import TrackCard from '../../components/TrackCard';
import EmptyState from '../../components/EmptyState';
import { usePlayer } from '../../store/PlayerContext';
import { showAlert } from '../../utils/alert';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { loadAndPlay } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchPlaylist = async () => {
    try {
      const res = await playlistAPI.getOne(id);
      setPlaylist(res?.playlist);
      setNewName(res?.playlist?.name || '');
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlaylist(); }, [id]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    await playlistAPI.update(id, { name: newName.trim() });
    setShowRename(false);
    fetchPlaylist();
  };

  const handleRemoveTrack = (trackId) => {
    showAlert('Remove Track', 'Remove this track from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await playlistAPI.removeTrack(id, trackId);
          fetchPlaylist();
        },
      },
    ]);
  };

  const handleRemoveDuplicates = async () => {
    const currentTracks = playlist?.tracks || [];
    const seen = new Set();
    const duplicates = [];

    for (const t of currentTracks) {
      const tId = t.trackId || t.id || t._id;
      const key = `${(t.title || '').toLowerCase().trim()}-${(t.artist || '').toLowerCase().trim()}`;
      if ((tId && seen.has(tId)) || seen.has(key)) {
        if (tId) duplicates.push(tId);
      } else {
        if (tId) seen.add(tId);
        seen.add(key);
      }
    }

    if (duplicates.length === 0) {
      showAlert('Clean Playlist', 'No duplicate songs found in this playlist!');
      return;
    }

    showAlert(
      'Remove Duplicates',
      `Found ${duplicates.length} duplicate song(s). Remove them now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All Duplicates',
          style: 'destructive',
          onPress: async () => {
            for (const dupId of duplicates) {
              try {
                await playlistAPI.removeTrack(id, dupId);
              } catch {}
            }
            fetchPlaylist();
            showAlert('Done', `Removed ${duplicates.length} duplicate songs.`);
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!playlist) {
    return <EmptyState icon="musical-notes" title="Playlist not found" />;
  }

  const tracks = playlist.tracks || [];
  const totalSeconds = tracks.reduce((acc, t) => acc + (Number(t.duration) || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);
  const durationLabel = totalHours > 0 ? `${totalHours} hr ${totalMins} min` : `${totalMins} min`;

  return (
    <View style={styles.screen}>
      <FlatList
        data={tracks}
        keyExtractor={(item, index) => String(item.trackId || item.id || item._id || index)}
        renderItem={({ item, index }) => (
          <View style={styles.trackRow}>
            <TrackCard
              track={{ ...item, id: item.trackId }}
              queue={tracks.map((t) => ({ ...t, id: t.trackId }))}
              index={index}
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={() => handleRemoveTrack(item.trackId || item.id || item._id)} style={styles.removeBtn}>
              <Ionicons name="remove-circle-outline" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <LinearGradient colors={[Colors.primaryDark, Colors.bg]} style={styles.hero}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.playlistIcon}>
              <Ionicons name="musical-notes" size={50} color={Colors.primaryLight} />
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <TouchableOpacity onPress={() => setShowRename(true)}>
                <Ionicons name="pencil" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.trackCount}>{tracks.length} tracks</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.durationBadge}>⏱️ {durationLabel}</Text>
              {tracks.length > 1 && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <TouchableOpacity onPress={handleRemoveDuplicates} style={styles.dedupBtn}>
                    <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                    <Text style={styles.dedupBtnText}>Remove Duplicates</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {tracks.length > 0 && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.shuffleBtn} onPress={() => {
                  const i = Math.floor(Math.random() * tracks.length);
                  loadAndPlay({ ...tracks[i], id: tracks[i].trackId }, tracks.map(t => ({ ...t, id: t.trackId })), i);
                }}>
                  <Ionicons name="shuffle" size={18} color={Colors.primary} />
                  <Text style={styles.shuffleText}>Shuffle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.playAllBtn} onPress={() =>
                  loadAndPlay({ ...tracks[0], id: tracks[0].trackId }, tracks.map(t => ({ ...t, id: t.trackId })), 0)
                }>
                  <LinearGradient colors={[Colors.primary, Colors.accentGlow]} style={styles.playAllGrad}>
                    <Ionicons name="play" size={20} color={Colors.white} />
                    <Text style={styles.playAllText}>Play All</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        }
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes"
            title="Playlist is empty"
            subtitle="Search for tracks and add them to this playlist."
            actionLabel="Browse Music"
            onAction={() => router.push('/(tabs)/search')}
          />
        }
      />

      {/* Rename Modal */}
      <Modal visible={showRename} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Playlist name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRename(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRename}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingTop: 54, paddingBottom: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  backBtn: {
    position: 'absolute', top: 54, left: Spacing.base,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  playlistIcon: {
    width: 120, height: 120, borderRadius: Radius.xl,
    backgroundColor: Colors.bgElevated, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 40,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  playlistName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xl, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  trackCount: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  metaDot: { color: Colors.textMuted, fontSize: 10 },
  durationBadge: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.xs, color: Colors.primaryLight },
  dedupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.35)',
  },
  dedupBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.primaryLight,
  },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  shuffleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: Radius.full, backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.primary,
  },
  shuffleText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.sm, color: Colors.primary },
  playAllBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  playAllGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 24 },
  playAllText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.sm, color: Colors.white },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: { paddingRight: Spacing.base, paddingLeft: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.base,
  },
  modalTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.lg, color: Colors.textPrimary },
  modalInput: {
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: Colors.bgElevated, alignItems: 'center' },
  cancelText: { fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText: { fontFamily: Typography.fontFamily.semibold, color: Colors.white },
});
