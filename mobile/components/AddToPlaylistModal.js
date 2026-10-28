import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { playlistAPI } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export let cachedPlaylists = null;

// Preload playlists cache in background so modal opens with ZERO wait
(async () => {
  try {
    const res = await playlistAPI.getAll();
    if (res?.playlists) cachedPlaylists = res.playlists;
  } catch {}
})();

export default function AddToPlaylistModal({ visible, track, onClose }) {
  const [playlists, setPlaylists] = useState(cachedPlaylists || []);
  const [loading, setLoading] = useState(!cachedPlaylists);
  const [addingId, setAddingId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Animation values
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(450));
  const [toastAnim] = useState(() => new Animated.Value(0));
  const [checkScaleAnim] = useState(() => new Animated.Value(0));

  const autoCloseTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  // Animate opening/closing
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset transient state when the modal opens.
      setAddedId(null);
      setNotification(null);
      setShowCreateInput(false);
      setNewPlaylistName('');
      loadPlaylists();

      // Opening animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      clearTimers();
    }

    return () => clearTimers();
  }, [visible, fadeAnim, slideAnim]);

  function clearTimers() {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }

  const handleClose = () => {
    clearTimers();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 450,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
    toastAnim.setValue(0);
    Animated.spring(toastAnim, {
      toValue: 1,
      tension: 90,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  async function loadPlaylists() {
    if (!cachedPlaylists) setLoading(true);
    try {
      const res = await playlistAPI.getAll();
      const list = res?.playlists || [];
      cachedPlaylists = list;
      setPlaylists(list);
    } catch (e) {
      console.warn('Failed to load playlists:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToPlaylist = async (playlist) => {
    if (!track) return;
    const playlistId = playlist._id || playlist.id;
    setAddingId(playlistId);

    // Instant optimistic feedback (<10ms)
    setAddedId(playlistId);
    checkScaleAnim.setValue(0);
    Animated.spring(checkScaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    showNotification('success', 'Added to Playlist', `Saved to "${playlist.name}"`);

    // Update local playlist track list so UI reflects the addition
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if ((p._id || p.id) === playlistId) {
          const currentTracks = p.tracks || [];
          return {
            ...p,
            tracks: [...currentTracks, { trackId: track.id, title: track.title }],
          };
        }
        return p;
      });
      cachedPlaylists = updated;
      return updated;
    });

    // Auto-return briskly back to the music with instant visual satisfaction
    autoCloseTimerRef.current = setTimeout(() => {
      handleClose();
    }, 400);

    try {
      await playlistAPI.addTrack(playlistId, {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        artworkUrl: track.artworkUrl,
        streamUrl: track.streamUrl,
      });
    } catch (err) {
      const isAlreadyAdded =
        err?.message?.toLowerCase().includes('already') ||
        err?.message?.toLowerCase().includes('exists');

      if (!isAlreadyAdded) {
        showNotification(
          'error',
          'Notice',
          err?.message || 'Could not add to playlist'
        );
      }
    } finally {
      setAddingId(null);
    }
  };

  const handleCreatePlaylist = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    setCreating(true);

    try {
      const res = await playlistAPI.create({ name: trimmed });
      const created = res?.playlist;
      if (created) {
        setPlaylists((prev) => [created, ...prev]);
        setShowCreateInput(false);
        setNewPlaylistName('');

        // Automatically add current track to this newly created playlist
        if (track) {
          await handleAddToPlaylist(created);
        }
      }
    } catch (err) {
      showNotification('error', 'Error', err?.message || 'Could not create playlist');
      errorTimerRef.current = setTimeout(() => {
        setNotification(null);
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Animated Notification / Toast Banner */}
          {notification && (
            <Animated.View
              style={[
                styles.toastBanner,
                notification.type === 'success'
                  ? styles.toastSuccess
                  : notification.type === 'info'
                  ? styles.toastInfo
                  : styles.toastError,
                {
                  opacity: toastAnim,
                  transform: [
                    {
                      scale: toastAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                    {
                      translateY: toastAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.toastIconCircle,
                  notification.type === 'success'
                    ? { backgroundColor: 'rgba(34, 197, 94, 0.2)' }
                    : notification.type === 'info'
                    ? { backgroundColor: 'rgba(108, 99, 255, 0.2)' }
                    : { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                ]}
              >
                <Ionicons
                  name={
                    notification.type === 'success'
                      ? 'checkmark'
                      : notification.type === 'info'
                      ? 'information'
                      : 'alert-circle'
                  }
                  size={16}
                  color={
                    notification.type === 'success'
                      ? Colors.success
                      : notification.type === 'info'
                      ? Colors.primaryLight
                      : Colors.error
                  }
                />
              </View>
              <View style={styles.toastTextContainer}>
                <Text style={styles.toastTitle}>{notification.title}</Text>
                <Text style={styles.toastMessage} numberOfLines={1}>
                  {notification.message}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Header Card with Track Info */}
          <View style={styles.header}>
            <View style={styles.trackCard}>
              <View style={styles.trackArtworkWrap}>
                {track?.artworkUrl ? (
                  <Image source={{ uri: track.artworkUrl }} style={styles.trackArtwork} />
                ) : (
                  <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary]}
                    style={styles.trackArtworkPlaceholder}
                  >
                    <Ionicons name="musical-notes" size={16} color={Colors.white} />
                  </LinearGradient>
                )}
              </View>
              <View style={styles.trackDetails}>
                <Text style={styles.headerSubtitle}>ADD TO PLAYLIST</Text>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track?.title || 'Unknown Track'}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track?.artist || 'Unknown Artist'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* New Playlist Action */}
          <View style={styles.actionSection}>
            {!showCreateInput ? (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreateInput(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createIconBadge}
                >
                  <Ionicons name="add" size={20} color={Colors.white} />
                </LinearGradient>
                <View style={styles.createTextContainer}>
                  <Text style={styles.createText}>New Playlist</Text>
                  <Text style={styles.createSubtext}>Create and add track instantly</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <View style={styles.createInputBox}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="musical-note-outline"
                    size={18}
                    color={Colors.primaryLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter playlist name..."
                    placeholderTextColor={Colors.textMuted}
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    autoFocus
                    maxLength={40}
                  />
                  {newPlaylistName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setNewPlaylistName('')}
                      style={styles.inputClear}
                    >
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowCreateInput(false);
                      setNewPlaylistName('');
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      !newPlaylistName.trim() && styles.saveBtnDisabled,
                    ]}
                    onPress={handleCreatePlaylist}
                    disabled={creating || !newPlaylistName.trim()}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={
                        newPlaylistName.trim()
                          ? [Colors.primary, Colors.primaryDark]
                          : [Colors.bgElevated, Colors.bgElevated]
                      }
                      style={styles.saveBtnGradient}
                    >
                      {creating ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.saveBtnText}>Create & Add</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Section Heading */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.listSectionTitle}>Your Playlists</Text>
            {playlists.length > 0 && (
              <Text style={styles.listCountBadge}>{playlists.length}</Text>
            )}
          </View>

          {/* List of existing playlists */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primaryLight} />
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          ) : playlists.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="folder-open-outline" size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No playlists found</Text>
              <Text style={styles.emptySubtitle}>
                Create your first playlist above to organize your music!
              </Text>
            </View>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item._id || item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const playlistId = item._id || item.id;
                const isAdding = addingId === playlistId;
                const isJustAdded = addedId === playlistId;
                const isAlreadyIn = (item.tracks || []).some(
                  (t) => t.trackId === track?.id || t.id === track?.id
                );

                return (
                  <TouchableOpacity
                    style={[
                      styles.playlistRow,
                      isJustAdded && styles.playlistRowSuccess,
                    ]}
                    onPress={() => handleAddToPlaylist(item)}
                    activeOpacity={0.7}
                    disabled={isAdding || isJustAdded}
                  >
                    {/* Left Icon */}
                    <LinearGradient
                      colors={
                        isJustAdded
                          ? ['rgba(34, 197, 94, 0.25)', 'rgba(34, 197, 94, 0.1)']
                          : [Colors.bgElevated, Colors.bgCard]
                      }
                      style={[
                        styles.playlistIconBox,
                        isJustAdded && { borderColor: Colors.success },
                      ]}
                    >
                      <Ionicons
                        name={isJustAdded ? 'checkmark-circle' : 'musical-notes'}
                        size={18}
                        color={isJustAdded ? Colors.success : Colors.primaryLight}
                      />
                    </LinearGradient>

                    {/* Title & Song Count */}
                    <View style={styles.playlistInfo}>
                      <Text
                        style={[
                          styles.playlistName,
                          isJustAdded && { color: Colors.success },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <View style={styles.playlistMetaRow}>
                        <Text style={styles.playlistTracksCount}>
                          {(item.tracks || []).length}{' '}
                          {(item.tracks || []).length === 1 ? 'song' : 'songs'}
                        </Text>
                        {isAlreadyIn && !isJustAdded && (
                          <View style={styles.alreadyInBadge}>
                            <Text style={styles.alreadyInBadgeText}>In playlist</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Right Action / State */}
                    <View style={styles.actionStatusWrap}>
                      {isAdding ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : isJustAdded ? (
                        <Animated.View
                          style={{
                            transform: [{ scale: checkScaleAnim }],
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={Colors.success}
                          />
                        </Animated.View>
                      ) : isAlreadyIn ? (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={Colors.textMuted}
                        />
                      ) : (
                        <View style={styles.addIconCircle}>
                          <Ionicons
                            name="add"
                            size={18}
                            color={Colors.primaryLight}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Quick Back to Music Button */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissBtnText}>Back to Music</Text>
          </TouchableOpacity>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheet: {
    backgroundColor: '#12121E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: SCREEN_HEIGHT * 0.82,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 24,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },

  // Toast Notification
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    marginVertical: 8,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  toastInfo: {
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderColor: 'rgba(108, 99, 255, 0.35)',
  },
  toastError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  toastMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // Header & Track Preview
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  trackCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 46, 0.65)',
    padding: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: Spacing.sm,
  },
  trackArtworkWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bgElevated,
  },
  trackArtwork: {
    width: '100%',
    height: '100%',
  },
  trackArtworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Colors.primaryLight,
    letterSpacing: 0.8,
  },
  trackTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  trackArtist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action / Create Section
  actionSection: {
    marginBottom: Spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: Radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.22)',
  },
  createIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  createText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  createSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  createInputBox: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.35)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 42,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
  inputClear: {
    padding: 4,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  saveBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnGradient: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },

  // List
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  listSectionTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listCountBadge: {
    marginLeft: 6,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.primaryLight,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 28, 46, 0.45)',
    borderRadius: Radius.lg,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  playlistRowSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  playlistIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  playlistName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  playlistMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  playlistTracksCount: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  alreadyInBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  alreadyInBadgeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionStatusWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // State Boxes
  loadingBox: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  emptyBox: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Bottom Dismiss Button
  dismissBtn: {
    marginTop: Spacing.xs,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dismissBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
