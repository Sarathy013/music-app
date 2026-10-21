import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { isRunningInExpoGo } from 'expo';
import { historyAPI, musicAPI } from '../services/api';
import { REPEAT_MODES, SLEEP_TIMER_OPTIONS } from '../constants/config';

let Notifications = null;
// expo-notifications remote push functionality was removed from Expo Go in SDK 53+
// and throws a fatal error if loaded on Android Expo Go.
if (!isRunningInExpoGo() && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    Notifications = null;
  }
}

const PlayerContext = createContext(null);

const initialState = {
  currentTrack: null,
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  isLoading: false,
  position: 0,           // ms
  duration: 0,           // ms
  volume: 1.0,
  isShuffle: false,
  repeatMode: REPEAT_MODES.OFF,
  isPlayerVisible: false,
  error: null,
  // New state
  sleepTimerMinutes: 0,      // 0 = off
  sleepTimerEndsAt: null,    // timestamp ms
  eqPreset: 'flat',
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_TRACK':
      return { ...state, currentTrack: action.payload.track, currentIndex: action.payload.index, isLoading: true, error: null };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_POSITION':
      return { ...state, position: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffle: !state.isShuffle };
    case 'SET_REPEAT':
      return { ...state, repeatMode: action.payload };
    case 'SHOW_PLAYER':
      return { ...state, isPlayerVisible: true };
    case 'HIDE_PLAYER':
      return { ...state, isPlayerVisible: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SLEEP_TIMER':
      return { ...state, sleepTimerMinutes: action.payload.minutes, sleepTimerEndsAt: action.payload.endsAt };
    case 'SET_EQ_PRESET':
      return { ...state, eqPreset: action.payload };
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const soundRef = useRef(null);
  const stateRef = useRef(state);
  const sleepTimerRef = useRef(null);
  stateRef.current = state;

  // ── Audio Setup ────────────────────────────────────────────────────────────

  const setupAudio = async () => {
    try {
      if (Platform.OS !== 'web' && typeof setAudioModeAsync === 'function') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
      }
    } catch (e) {
      console.warn('Audio setup warning:', e?.message || e);
    }
  };

  // ── Notification Permissions ───────────────────────────────────────────────

  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web' || !Notifications) return false;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  };

  // ── Now-Playing Notification ───────────────────────────────────────────────

  const showNowPlayingNotification = async (track, isPlaying) => {
    if (Platform.OS === 'web' || !track || !Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: track.title || 'Unknown Track',
          body: `${track.artist || 'Unknown Artist'}${track.album ? ' · ' + track.album : ''}`,
          data: { trackId: track.id, action: 'open_player' },
          categoryIdentifier: 'music-player',
          sound: false,
          badge: 0,
        },
        trigger: null,
      });
    } catch (e) {
      // Notifications may not be available in Expo Go — silently ignore
    }
  };

  useEffect(() => {
    setupAudio();
    requestNotificationPermissions();

    return () => {
      if (soundRef.current) {
        try { soundRef.current.unloadAsync?.(); } catch {}
      }
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  // Update notification when track or play state changes
  useEffect(() => {
    if (state.currentTrack) {
      showNowPlayingNotification(state.currentTrack, state.isPlaying);
    }
  }, [state.currentTrack?.id, state.isPlaying]);

  const handleTrackEnd = () => {
    const s = stateRef.current;
    if (s.repeatMode === REPEAT_MODES.ONE) {
      seekTo(0);
      playCurrentSound();
    } else if (s.repeatMode === REPEAT_MODES.ALL || s.currentIndex < s.queue.length - 1) {
      skipNext();
    } else {
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  };

  // ── Core Player Methods ────────────────────────────────────────────────────

  const loadAndPlay = async (track, queue = [], index = 0) => {
    try {
      let playableTrack = track;

      // If streamUrl is missing (e.g. raw YouTube or unresolved track), resolve on the fly
      if (!playableTrack?.streamUrl) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          if (playableTrack?.id) {
            const resolved = await musicAPI.getTrack(playableTrack.id);
            if (resolved?.track?.streamUrl) {
              playableTrack = { ...playableTrack, ...resolved.track };
            }
          }
          if (!playableTrack?.streamUrl && playableTrack?.title) {
            const searchFallback = await musicAPI.search(`${playableTrack.title} ${playableTrack.artist || ''}`, 'tracks', 3);
            const found = (searchFallback?.results || []).find((t) => t.streamUrl);
            if (found) {
              playableTrack = { ...playableTrack, streamUrl: found.streamUrl, duration: found.duration || playableTrack.duration };
            }
          }
        } catch {}
      }

      if (!playableTrack?.streamUrl) {
        dispatch({ type: 'SET_ERROR', payload: 'This track is currently unavailable. Try another track.' });
        return;
      }

      // Safely unload previous sound without throwing
      if (soundRef.current) {
        try { await soundRef.current.pauseAsync?.(); } catch {}
        try { await soundRef.current.unloadAsync?.(); } catch {}
        soundRef.current = null;
      }

      dispatch({ type: 'SET_TRACK', payload: { track: playableTrack, index } });
      if (queue.length) dispatch({ type: 'SET_QUEUE', payload: queue });
      dispatch({ type: 'SHOW_PLAYER' });
      dispatch({ type: 'SET_LOADING', payload: true });

      let loadedSound = null;
      try {
        if (typeof createAudioPlayer === 'function') {
          const player = createAudioPlayer(
            { uri: playableTrack.streamUrl },
            { updateInterval: 500 }
          );

          player.volume = stateRef.current.volume;

          const subscription = player.addListener('playbackStatusUpdate', (status) => {
            if (!status) return;
            const posMs = Math.round((status.currentTime || 0) * 1000);
            const durMs = Math.round((status.duration || 0) * 1000);
            dispatch({ type: 'SET_POSITION', payload: posMs });
            dispatch({ type: 'SET_DURATION', payload: durMs });
            dispatch({ type: 'SET_PLAYING', payload: !!status.playing });
            dispatch({ type: 'SET_LOADING', payload: !!status.isBuffering });

            if (status.didJustFinish) {
              handleTrackEnd();
            }
          });

          player.play();

          // Enable lock screen controls with track metadata (required on Android for sustained background playback)
          if (Platform.OS !== 'web') {
            try {
              player.setActiveForLockScreen(true, {
                title: playableTrack.title || 'Unknown Track',
                artist: playableTrack.artist || 'Unknown Artist',
                albumTitle: playableTrack.album || undefined,
                artworkUrl: playableTrack.artworkUrl || undefined,
              });
            } catch {}
          }

          loadedSound = {
            unloadAsync: async () => {
              try { subscription?.remove?.(); } catch {}
              try { player.clearLockScreenControls?.(); } catch {}
              try { player.pause(); } catch {}
              try { player.remove(); } catch {}
            },
            pauseAsync: async () => {
              try { player.pause(); } catch {}
              dispatch({ type: 'SET_PLAYING', payload: false });
            },
            playAsync: async () => {
              try { player.play(); } catch {}
              dispatch({ type: 'SET_PLAYING', payload: true });
            },
            setPositionAsync: async (ms) => {
              try { await player.seekTo(ms / 1000); } catch {}
              dispatch({ type: 'SET_POSITION', payload: ms });
            },
            setVolumeAsync: async (vol) => {
              try { player.volume = Math.max(0, Math.min(1, vol)); } catch {}
            },
          };
        } else {
          throw new Error('createAudioPlayer is not available');
        }
      } catch (audioErr) {
        console.warn('expo-audio createAudioPlayer error:', audioErr?.message || audioErr);
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
          const htmlAudio = new window.Audio(playableTrack.streamUrl);
          htmlAudio.volume = stateRef.current.volume;
          htmlAudio.ontimeupdate = () => {
            dispatch({ type: 'SET_POSITION', payload: (htmlAudio.currentTime || 0) * 1000 });
            dispatch({ type: 'SET_DURATION', payload: (htmlAudio.duration || 0) * 1000 });
          };
          htmlAudio.onplaying = () => {
            dispatch({ type: 'SET_PLAYING', payload: true });
            dispatch({ type: 'SET_LOADING', payload: false });
          };
          htmlAudio.onwaiting = () => {
            dispatch({ type: 'SET_LOADING', payload: true });
          };
          htmlAudio.onended = () => {
            handleTrackEnd();
          };
          htmlAudio.onerror = (e) => {
            console.warn('HTML5 Audio playback error:', e);
            dispatch({ type: 'SET_ERROR', payload: 'Unable to stream audio. Try another track.' });
          };

          await htmlAudio.play();

          loadedSound = {
            unloadAsync: async () => { htmlAudio.pause(); htmlAudio.src = ''; },
            pauseAsync: async () => { htmlAudio.pause(); dispatch({ type: 'SET_PLAYING', payload: false }); },
            playAsync: async () => { await htmlAudio.play(); dispatch({ type: 'SET_PLAYING', payload: true }); },
            setPositionAsync: async (ms) => { htmlAudio.currentTime = ms / 1000; },
            setVolumeAsync: async (vol) => { htmlAudio.volume = Math.max(0, Math.min(1, vol)); },
          };
        } else {
          throw audioErr;
        }
      }

      soundRef.current = loadedSound;
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_PLAYING', payload: true });

      // Log to history (fire-and-forget)
      historyAPI.add(track).catch(() => {});
    } catch (err) {
      console.error('loadAndPlay error:', err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load track. Please try again.' });
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    try {
      if (stateRef.current.isPlaying) {
        await soundRef.current.pauseAsync();
        dispatch({ type: 'SET_PLAYING', payload: false });
      } else {
        await soundRef.current.playAsync();
        dispatch({ type: 'SET_PLAYING', payload: true });
      }
    } catch (err) {
      console.warn('togglePlayPause error:', err);
    }
  };

  const playCurrentSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.playAsync();
        dispatch({ type: 'SET_PLAYING', payload: true });
      } catch (err) {
        console.warn('playCurrentSound error:', err);
      }
    }
  };

  const seekTo = async (positionMs) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(positionMs);
        dispatch({ type: 'SET_POSITION', payload: positionMs });
      } catch (err) {
        console.warn('seekTo error:', err);
      }
    }
  };

  const setVolume = async (vol) => {
    dispatch({ type: 'SET_VOLUME', payload: vol });
    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(vol);
      } catch (err) {
        console.warn('setVolume error:', err);
      }
    }
  };

  const skipNext = () => {
    const s = stateRef.current;
    if (!s.queue.length) return;
    let nextIndex;
    if (s.isShuffle) {
      nextIndex = Math.floor(Math.random() * s.queue.length);
    } else {
      nextIndex = (s.currentIndex + 1) % s.queue.length;
    }
    loadAndPlay(s.queue[nextIndex], s.queue, nextIndex);
  };

  const skipPrevious = () => {
    const s = stateRef.current;
    if (s.position > 3000) {
      seekTo(0);
      return;
    }
    if (!s.queue.length) return;
    const prevIndex = s.currentIndex === 0 ? s.queue.length - 1 : s.currentIndex - 1;
    loadAndPlay(s.queue[prevIndex], s.queue, prevIndex);
  };

  const toggleShuffle = () => dispatch({ type: 'TOGGLE_SHUFFLE' });

  const cycleRepeat = () => {
    const modes = [REPEAT_MODES.OFF, REPEAT_MODES.ALL, REPEAT_MODES.ONE];
    const current = modes.indexOf(stateRef.current.repeatMode);
    dispatch({ type: 'SET_REPEAT', payload: modes[(current + 1) % modes.length] });
  };

  const showPlayer = () => dispatch({ type: 'SHOW_PLAYER' });
  const hidePlayer = () => dispatch({ type: 'HIDE_PLAYER' });

  const closePlayer = async () => {
    if (soundRef.current) {
      try { await soundRef.current.pauseAsync?.(); } catch {}
      try { await soundRef.current.unloadAsync?.(); } catch {}
      soundRef.current = null;
    }
    dispatch({ type: 'SET_TRACK', payload: { track: null, index: 0 } });
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'HIDE_PLAYER' });
  };

  // ── Sleep Timer ────────────────────────────────────────────────────────────

  const setSleepTimer = (minutes) => {
    // Clear existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (minutes === 0) {
      dispatch({ type: 'SET_SLEEP_TIMER', payload: { minutes: 0, endsAt: null } });
      return;
    }

    const endsAt = Date.now() + minutes * 60 * 1000;
    dispatch({ type: 'SET_SLEEP_TIMER', payload: { minutes, endsAt } });

    sleepTimerRef.current = setTimeout(async () => {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      dispatch({ type: 'SET_SLEEP_TIMER', payload: { minutes: 0, endsAt: null } });
    }, minutes * 60 * 1000);
  };

  // ── EQ Preset ──────────────────────────────────────────────────────────────

  const setEqPreset = (preset) => {
    dispatch({ type: 'SET_EQ_PRESET', payload: preset });
    // Note: Audio EQ preset preference is stored here for UI controls
    // and can be used to show visual feedback in the UI
  };

  // ── Play Entire Queue from Index ───────────────────────────────────────────

  const playFromQueue = (index) => {
    const s = stateRef.current;
    if (index >= 0 && index < s.queue.length) {
      loadAndPlay(s.queue[index], s.queue, index);
    }
  };

  const removeFromQueue = (index) => {
    const s = stateRef.current;
    const newQueue = [...s.queue];
    newQueue.splice(index, 1);
    dispatch({ type: 'SET_QUEUE', payload: newQueue });
  };

  const addToQueue = (track) => {
    const s = stateRef.current;
    dispatch({ type: 'SET_QUEUE', payload: [...s.queue, track] });
  };

  const addNextInQueue = (track) => {
    const s = stateRef.current;
    const newQueue = [...s.queue];
    newQueue.splice(s.currentIndex + 1, 0, track);
    dispatch({ type: 'SET_QUEUE', payload: newQueue });
  };

  return (
    <PlayerContext.Provider value={{
      ...state,
      loadAndPlay,
      togglePlayPause,
      seekTo,
      setVolume,
      skipNext,
      skipPrevious,
      toggleShuffle,
      cycleRepeat,
      showPlayer,
      hidePlayer,
      closePlayer,
      setSleepTimer,
      setEqPreset,
      playFromQueue,
      removeFromQueue,
      addToQueue,
      addNextInQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
};
