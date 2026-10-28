import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from './alert';

const DOWNLOADS_KEY = '@vibestream_downloads';

// Optional safe loader for MediaLibrary (Expo Go doesn't include it by default)
let MediaLibrary = null;
try {
  MediaLibrary = require('expo-media-library');
} catch {
  MediaLibrary = null;
}

export async function getDownloadedTracks() {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function isTrackDownloaded(trackId) {
  if (!trackId) return false;
  try {
    const downloads = await getDownloadedTracks();
    return downloads.some((t) => t.id === trackId);
  } catch {
    return false;
  }
}

export async function downloadSong(track, onProgress = null) {
  if (!track || !track.streamUrl) {
    showAlert('Error', 'No stream URL available to download this track.');
    return null;
  }

  // Web fallback: Trigger standard browser download
  if (Platform.OS === 'web') {
    try {
      const a = document.createElement('a');
      a.href = track.streamUrl;
      a.download = `${track.artist || 'Unknown'} - ${track.title || 'Track'}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAlert('Downloading', `Downloading "${track.title}" in your browser.`);
      return true;
    } catch (e) {
      showAlert('Download Failed', e?.message || 'Unable to download track');
      return null;
    }
  }

  // Native: expo-file-system/legacy (safe, recommended by Expo docs, no deprecation warning)
  try {
    const sanitizedTitle = (track.title || 'track').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${track.id || 'track'}_${sanitizedTitle}.mp3`;
    const targetDir = `${FileSystem.documentDirectory}downloads/`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }
    } catch {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true }).catch(() => {});
    }

    const fileUri = `${targetDir}${filename}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      track.streamUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        if (onProgress && !isNaN(progress)) {
          onProgress(progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Download failed to complete');
    }

    // Try to export to device media library if available & permitted
    if (MediaLibrary && typeof MediaLibrary.requestPermissionsAsync === 'function') {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(result.uri);
          await MediaLibrary.createAlbumAsync('VibeStream', asset, false);
        }
      } catch (permErr) {
        console.log('MediaLibrary export optional skip:', permErr.message);
      }
    }

    // Save download metadata in storage so user can view/play in library offline
    const downloadedTrack = {
      ...track,
      isDownloaded: true,
      localUri: result.uri,
      downloadedAt: new Date().toISOString(),
    };

    const currentDownloads = await getDownloadedTracks();
    const updated = [downloadedTrack, ...currentDownloads.filter((t) => t.id !== track.id)];
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));

    showAlert('Downloaded!', `"${track.title}" is saved for offline listening.`);
    return downloadedTrack;
  } catch (err) {
    console.warn('Download error:', err.message);
    showAlert('Download Failed', err.message || 'Could not download audio file.');
    return null;
  }
}
