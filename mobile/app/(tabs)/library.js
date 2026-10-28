import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { playlistAPI, favoritesAPI, historyAPI, musicAPI } from '../../services/api';
import TrackCard from '../../components/TrackCard';
import EmptyState from '../../components/EmptyState';
import { usePlayer } from '../../store/PlayerContext';
import { getDownloadedTracks } from '../../utils/downloader';
import { showAlert } from '../../utils/alert';
import { deduplicateTracks } from '../../utils/helpers';

const TABS = ['playlists', 'favorites', 'artists', 'albums', 'downloads', 'history'];

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState('playlists');
  const [playlists, setPlaylists] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newName, setNewName] = useState('');
  const { loadAndPlay } = usePlayer();
  const router = useRouter();

  const fetchAll = useCallback(async () => {
    try {
      const [pl, fav, hist, down, art, alb] = await Promise.allSettled([
        playlistAPI.getAll(),
        favoritesAPI.getAll(),
        historyAPI.getAll(30),
        getDownloadedTracks(),
        musicAPI.getPopularArtists(20),
        musicAPI.getPopularAlbums(20),
      ]);
      if (pl.status === 'fulfilled') setPlaylists(pl.value?.playlists || []);
      if (fav.status === 'fulfilled') {
        const rawFav = (fav.value?.favorites || []).map((f) => ({ ...f, id: f.trackId || f.id }));
        setFavorites(deduplicateTracks(rawFav));
      }
      if (hist.status === 'fulfilled') {
        const rawHist = (hist.value?.history || []).map((h) => ({ ...h, id: h.trackId || h.id }));
        setHistory(deduplicateTracks(rawHist));
      }
      if (down.status === 'fulfilled') setDownloads(down.value || []);
      if (art.status === 'fulfilled') setArtists(art.value?.artists || []);
      if (alb.status === 'fulfilled') setAlbums(alb.value?.albums || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load library sections asynchronously on mount.
    fetchAll();
  }, [fetchAll]);

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    try {
      await playlistAPI.create({ name: newName.trim() });
      setNewName('');
      setShowNewPlaylist(false);
      fetchAll();
    } catch (e) {
      showAlert('Error', e.message);
    }
  };

  const deletePlaylist = (id) => {
    showAlert('Delete Playlist', 'Are you sure you want to delete this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await playlistAPI.delete(id);
          fetchAll();
        },
      },
    ]);
  };

  const renderPlaylist = ({ item }) => (
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => router.push(`/playlist/${item._id}`)}
    >
      <View style={styles.playlistIcon}>
        <Ionicons name="musical-notes" size={24} color={Colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSub}>{item.tracks?.length || 0} tracks</Text>
      </View>
      <TouchableOpacity onPress={() => deletePlaylist(item._id)}>
        <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFavorite = ({ item, index }) => {
    const formatted = { ...item, id: item.trackId || item.id };
    const queue = favorites.map((f) => ({ ...f, id: f.trackId || f.id }));
    return <TrackCard track={formatted} queue={queue} index={index} />;
  };

  const renderArtist = ({ item }) => (
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => router.push(`/artist/${item.id}`)}
      activeOpacity={0.75}
    >
      {item.artworkUrl || item.imageUrl ? (
        <Image source={{ uri: item.artworkUrl || item.imageUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{item.name?.[0] || 'A'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSub}>{item.role || 'Artist'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => router.push(`/album/${item.id}`)}
      activeOpacity={0.75}
    >
      {item.artworkUrl ? (
        <Image source={{ uri: item.artworkUrl }} style={styles.albumImg} />
      ) : (
        <View style={styles.albumFallback}>
          <Ionicons name="albums" size={22} color={Colors.primaryLight} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name || item.title}</Text>
        <Text style={styles.rowSub}>{item.artist || 'Various Artists'}{item.year ? ` · ${item.year}` : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  const renderDownload = ({ item, index }) => {
    const stream = item.localUri || item.streamUrl;
    const formatted = { ...item, streamUrl: stream };
    return (
      <TrackCard
        track={formatted}
        queue={downloads}
        index={index}
        onPress={() => loadAndPlay(formatted, downloads, index)}
      />
    );
  };

  const renderHistory = ({ item }) => {
    const formatted = { ...item, id: item.trackId || item.id };
    return (
      <TrackCard
        track={formatted}
        onPress={(t) => loadAndPlay(t, [t], 0)}
      />
    );
  };

  const data =
    activeTab === 'playlists'
      ? playlists
      : activeTab === 'favorites'
      ? favorites
      : activeTab === 'artists'
      ? artists
      : activeTab === 'albums'
      ? albums
      : activeTab === 'downloads'
      ? downloads
      : history;

  const renderItem =
    activeTab === 'playlists'
      ? renderPlaylist
      : activeTab === 'favorites'
      ? renderFavorite
      : activeTab === 'artists'
      ? renderArtist
      : activeTab === 'albums'
      ? renderAlbum
      : activeTab === 'downloads'
      ? renderDownload
      : renderHistory;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        {activeTab === 'playlists' && (
          <TouchableOpacity onPress={() => setShowNewPlaylist(true)}>
            <Ionicons name="add-circle" size={30} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {activeTab === 'history' && history.length > 0 && (
          <TouchableOpacity onPress={async () => { await historyAPI.clear(); fetchAll(); }}>
            <Ionicons name="trash-outline" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab === 'playlists'
                  ? 'Playlists'
                  : tab === 'favorites'
                  ? '❤️ Liked'
                  : tab === 'artists'
                  ? '🎤 Artists'
                  : tab === 'albums'
                  ? '💿 Albums'
                  : tab === 'downloads'
                  ? '⬇️ Offline'
                  : '🕓 History'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => String(item._id || item.id || item.trackId)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon={
                activeTab === 'playlists'
                  ? 'musical-notes'
                  : activeTab === 'favorites'
                  ? 'heart'
                  : activeTab === 'artists'
                  ? 'people'
                  : activeTab === 'albums'
                  ? 'albums'
                  : activeTab === 'downloads'
                  ? 'cloud-download-outline'
                  : 'time'
              }
              title={
                activeTab === 'playlists'
                  ? 'No playlists yet'
                  : activeTab === 'favorites'
                  ? 'No liked tracks'
                  : activeTab === 'artists'
                  ? 'No artists found'
                  : activeTab === 'albums'
                  ? 'No albums found'
                  : activeTab === 'downloads'
                  ? 'No downloaded tracks'
                  : 'No history yet'
              }
              subtitle={
                activeTab === 'playlists'
                  ? 'Tap + to create your first playlist.'
                  : activeTab === 'downloads'
                  ? 'Tap the download button on any song to save it for offline listening.'
                  : 'Explore music to build your collection.'
              }
              actionLabel={activeTab === 'playlists' ? 'Create Playlist' : undefined}
              onAction={activeTab === 'playlists' ? () => setShowNewPlaylist(true) : undefined}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Playlist Modal */}
      <Modal visible={showNewPlaylist} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewPlaylist(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={createPlaylist}>
                <Text style={styles.confirmText}>Create</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xxl,
    color: Colors.textPrimary,
  },
  tabsContainer: {
    marginBottom: Spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCard,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamily.semibold,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgElevated,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarFallbackText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.primaryLight,
  },
  albumImg: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
  },
  albumFallback: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalBox: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
  },
  confirmText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
});
