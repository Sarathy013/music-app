import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator,
  Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { musicAPI } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { usePlayer } from '../../store/PlayerContext';
import TrackCard from '../../components/TrackCard';
import AlbumCard from '../../components/AlbumCard';
import SectionHeader from '../../components/SectionHeader';
import { TrackSkeleton, AlbumCardSkeleton } from '../../components/SkeletonLoader';
import TasteOnboardingModal, { getUserPreferences, MOODS } from '../../components/TasteOnboardingModal';
import { deduplicateTracks, getTrackDedupeTokens } from '../../utils/helpers';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night 🌙';
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 17) return 'Good afternoon 🌤️';
  if (hour < 21) return 'Good evening 🌆';
  return 'Good night 🌙';
}

const HOME_LANGUAGES = [
  { id: 'all', label: '🌐 All Music', color: Colors.primary },
  { id: 'tamil', label: '🦁 Tamil Hits', color: '#F97316' },
  { id: 'telugu', label: '⚡ Telugu Hits', color: '#10B981' },
  { id: 'hindi', label: '🇮🇳 Hindi Hits', color: '#EAB308' },
  { id: 'english', label: '🌍 Global English', color: '#38BDF8' },
  { id: 'malayalam', label: '🌴 Malayalam Hits', color: '#06B6D4' },
  { id: 'punjabi', label: '🔥 Punjabi Hits', color: '#EC4899' },
  { id: 'kannada', label: '👑 Kannada Hits', color: '#8B5CF6' },
];

const ArtistChip = React.memo(function ArtistChip({ artist, onPress }) {
  const artwork = artist.artworkUrl || artist.imageUrl;
  return (
    <TouchableOpacity style={styles.artistCard} onPress={() => onPress(artist)} activeOpacity={0.8}>
      <LinearGradient
        colors={[Colors.primaryDark + '80', Colors.bgElevated]}
        style={styles.artistAvatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} borderRadius={36} />
        ) : (
          <Text style={styles.artistInitial}>{artist.name?.[0] || 'A'}</Text>
        )}
      </LinearGradient>
      <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
      {artist.role && <Text style={styles.artistEra}>{artist.role}</Text>}
    </TouchableOpacity>
  );
});

// In-memory cache for instant tab/language switching with zero lag
const homeDataCache = {};

export default function HomeScreen() {
  const { user } = useAuth();
  const { loadAndPlay } = usePlayer();
  const router = useRouter();

  const [selectedLang, setSelectedLang] = useState('all');
  const [trending, setTrending] = useState([]);
  const [popularAlbums, setPopularAlbums] = useState([]);
  const [tamilHits, setTamilHits] = useState([]);
  const [tamilClassics, setTamilClassics] = useState([]);
  const [teluguHits, setTeluguHits] = useState([]);
  const [teluguClassics, setTeluguClassics] = useState([]);
  const [hindiHits, setHindiHits] = useState([]);
  const [hindiClassics, setHindiClassics] = useState([]);
  const [englishHits, setEnglishHits] = useState([]);
  const [malayalamHits, setMalayalamHits] = useState([]);
  const [punjabiHits, setPunjabiHits] = useState([]);
  const [kannadaHits, setKannadaHits] = useState([]);
  const [artists, setArtists] = useState([]);
  
  // Personalized Recommendations based on User's Taste Questionnaire
  const [, setRecommendedTracks] = useState([]);
  const [showTasteModal, setShowTasteModal] = useState(false);

  // Interactive Mood Recommendations (Sad, Love, Happy, Chill, Party, Workout, Rain, Devotional, Mix)
  const [activeMood, setActiveMood] = useState('romantic');
  const [moodTracks, setMoodTracks] = useState([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Restore saved active mood on mount
  useEffect(() => {
    AsyncStorage.getItem('@vibestream_user_active_mood').then((saved) => {
      if (saved) setActiveMood(saved);
    });
  }, []);

  const fetchMoodRecommendations = useCallback(async (moodId, langId) => {
    setMoodLoading(true);
    try {
      let list = [];
      try {
        const res = await musicAPI.getMoodRecommendations(moodId, langId, 30);
        if (res?.tracks?.length) {
          list = res.tracks;
        }
      } catch {}

      if (!list.length) {
        const moodObj = MOODS.find((m) => m.id === moodId) || MOODS[0];
        const langPrefix = langId && langId !== 'all' ? `${langId} ` : '';
        const searchRes = await musicAPI.search(`${langPrefix}${moodObj.query}`, 'tracks', 30, 1, langId, 'saavn');
        list = searchRes?.results || [];
      }

      const unique = deduplicateTracks(list);
      setMoodTracks(unique);
    } catch (e) {
      console.warn('Mood fetch error:', e.message);
    } finally {
      setMoodLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start async recommendations for this mood.
    fetchMoodRecommendations(activeMood, selectedLang);
  }, [activeMood, selectedLang, fetchMoodRecommendations]);

  const handleMoodSelect = (moodId) => {
    setActiveMood(moodId);
    AsyncStorage.setItem('@vibestream_user_active_mood', moodId).catch(() => {});
  };

  const fetchPersonalizedRecommendations = useCallback(async (pref) => {
    if (!pref) return;
    try {
      const langs = pref.languages || ['all'];
      const moods = pref.moods || ['happy'];
      const primaryLang = langs[0] === 'all' ? 'hindi' : langs[0];
      const moodObj = MOODS.find((m) => moods.includes(m.id)) || MOODS[0];
      const query = `${primaryLang} ${moodObj.query}`;

      const res = await musicAPI.search(query, 'tracks', 40, 1, primaryLang, 'saavn');
      const list = res?.results || [];
      const trendKeys = new Set();
      const trendIds = new Set();
      trending.forEach((t) => {
        if (t?.id) trendIds.add(t.id);
        getTrackDedupeTokens(t).forEach((tok) => trendKeys.add(tok));
      });
      setRecommendedTracks(deduplicateTracks(list, trendKeys, trendIds));
    } catch {}
  }, [trending]);

  useEffect(() => {
    getUserPreferences().then((pref) => {
      if (pref) {
        fetchPersonalizedRecommendations(pref);
      } else {
        setShowTasteModal(true);
      }
    });
  }, [user, fetchPersonalizedRecommendations]);

  // Extended Songs Feed with Windowing for Silk-Smooth Scrolling
  const [feedTracks, setFeedTracks] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [visibleFeedCount, setVisibleFeedCount] = useState(25);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(!homeDataCache[selectedLang]);
  const [refreshing, setRefreshing] = useState(false);

  // Restore cache on launch for 0ms instant display
  useEffect(() => {
    AsyncStorage.getItem('@vibestream_home_cache').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          Object.assign(homeDataCache, parsed);
          if (parsed[selectedLang] && !trending.length) {
            const c = parsed[selectedLang];
            setTrending(c.trending || []);
            setPopularAlbums(c.popularAlbums || []);
            setArtists(c.artists || []);
            setTamilHits(c.tamilHits || []);
            setTamilClassics(c.tamilClassics || []);
            setTeluguHits(c.teluguHits || []);
            setTeluguClassics(c.teluguClassics || []);
            setHindiHits(c.hindiHits || []);
            setHindiClassics(c.hindiClassics || []);
            setEnglishHits(c.englishHits || []);
            setMalayalamHits(c.malayalamHits || []);
            setPunjabiHits(c.punjabiHits || []);
            setKannadaHits(c.kannadaHits || []);
            setFeedTracks(c.feedTracks || []);
            setLoading(false);
          }
        } catch {}
      }
    });
  }, [selectedLang, trending.length]);

  const currentMoodObj = MOODS.find((m) => m.id === activeMood) || MOODS[0];

  const [scrollY] = useState(() => new Animated.Value(0));
  const [headerEntrance] = useState(() => new Animated.Value(0));
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(headerEntrance, {
      toValue: 1,
      tension: 55,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [headerEntrance]);

  const getFeedQuery = (lang) => {
    if (lang === 'tamil') return 'All Tamil Songs Anirudh Rahman Ilaiyaraaja';
    if (lang === 'telugu') return 'All Telugu Songs Tollywood DSP Thaman';
    if (lang === 'hindi') return 'All Hindi Songs Bollywood Arijit Kishore';
    if (lang === 'english') return 'All English Pop Rock Billboard Hits';
    if (lang === 'malayalam') return 'All Malayalam Songs Sushin Hesham Jakes';
    if (lang === 'punjabi') return 'All Punjabi Songs Diljit Karan Aujla';
    if (lang === 'kannada') return 'All Kannada Songs Ravi Basrur KGF';
    return 'Trending Songs Hits Worldwide';
  };

  const fetchHomeData = useCallback(async (lang = selectedLang, forceRefresh = false) => {
    try {
      setFeedPage(1);
      setVisibleFeedCount(25);
      setHasMore(true);

      // Instant hydration from cache if available (0ms loading lag!)
      if (homeDataCache[lang] && !forceRefresh) {
        const c = homeDataCache[lang];
        setTrending(c.trending || []);
        setPopularAlbums(c.popularAlbums || []);
        setArtists(c.artists || []);
        setTamilHits(c.tamilHits || []);
        setTamilClassics(c.tamilClassics || []);
        setTeluguHits(c.teluguHits || []);
        setTeluguClassics(c.teluguClassics || []);
        setHindiHits(c.hindiHits || []);
        setHindiClassics(c.hindiClassics || []);
        setEnglishHits(c.englishHits || []);
        setMalayalamHits(c.malayalamHits || []);
        setPunjabiHits(c.punjabiHits || []);
        setKannadaHits(c.kannadaHits || []);
        setFeedTracks(c.feedTracks || []);
        setLoading(false);
      }

      const [
        trendingRes, albumsRes, artistsRes,
        tamilRes, tamilClassicsRes,
        teluguRes, teluguClassicsRes,
        hindiRes, hindiClassicsRes,
        englishRes,
        malayalamRes,
        punjabiRes,
        kannadaRes,
        feedRes,
      ] = await Promise.allSettled([
        musicAPI.getTrending(40, lang),
        musicAPI.getPopularAlbums(12, lang),
        musicAPI.getPopularArtists(18),
        musicAPI.search('Latest Tamil Songs 2024 Amaran Vettaiyan GOAT Anirudh', 'tracks', 40, 1, 'tamil', 'saavn'),
        musicAPI.search('Classic Tamil Old 80s 90s Ilaiyaraaja SPB', 'tracks', 40, 1, 'tamil', 'saavn'),
        musicAPI.search('Latest Telugu Songs 2024 Pushpa 2 Devara Tollywood', 'tracks', 40, 1, 'telugu', 'saavn'),
        musicAPI.search('Classic Telugu Songs SPB Ilaiyaraaja Old', 'tracks', 40, 1, 'telugu', 'saavn'),
        musicAPI.search('Latest Bollywood Hits 2024 Stree 2 Tauba Tauba Arijit', 'tracks', 40, 1, 'hindi', 'saavn'),
        musicAPI.search('Old Hindi Songs Kishore Kumar RD Burman', 'tracks', 40, 1, 'hindi', 'saavn'),
        musicAPI.search('Global Pop English Hits 2024 Sabrina Billie Bruno', 'tracks', 40, 1, 'english', 'saavn'),
        musicAPI.search('Latest Malayalam Songs 2024 Aavesham Premalu Sushin', 'tracks', 40, 1, 'malayalam', 'saavn'),
        musicAPI.search('Latest Punjabi Hits 2024 Karan Aujla Diljit Dosanjh', 'tracks', 40, 1, 'punjabi', 'saavn'),
        musicAPI.search('Latest Kannada Songs 2024 KGF Kantara Ravi Basrur', 'tracks', 40, 1, 'kannada', 'saavn'),
        musicAPI.search(getFeedQuery(lang), 'tracks', 80, 1, lang, 'saavn'),
      ]);

      // Cascade deduplication across all sections: NO song is repeated anywhere on the page
      const globalSeenKeys = new Set();
      const globalSeenIds = new Set();

      const dedupeSection = (items) => {
        return deduplicateTracks(items, globalSeenKeys, globalSeenIds);
      };

      const cleanTrending = dedupeSection(trendingRes.status === 'fulfilled' ? trendingRes.value?.tracks || [] : []);
      const cleanAlbums = albumsRes.status === 'fulfilled' ? albumsRes.value?.albums || [] : [];
      const cleanArtists = artistsRes.status === 'fulfilled' ? artistsRes.value?.artists || [] : [];
      const cleanTamilHits = dedupeSection(tamilRes.status === 'fulfilled' ? tamilRes.value?.results || [] : []);
      const cleanTamilClassics = dedupeSection(tamilClassicsRes.status === 'fulfilled' ? tamilClassicsRes.value?.results || [] : []);
      const cleanTeluguHits = dedupeSection(teluguRes.status === 'fulfilled' ? teluguRes.value?.results || [] : []);
      const cleanTeluguClassics = dedupeSection(teluguClassicsRes.status === 'fulfilled' ? teluguClassicsRes.value?.results || [] : []);
      const cleanHindiHits = dedupeSection(hindiRes.status === 'fulfilled' ? hindiRes.value?.results || [] : []);
      const cleanHindiClassics = dedupeSection(hindiClassicsRes.status === 'fulfilled' ? hindiClassicsRes.value?.results || [] : []);
      const cleanEnglishHits = dedupeSection(englishRes.status === 'fulfilled' ? englishRes.value?.results || [] : []);
      const cleanMalayalamHits = dedupeSection(malayalamRes.status === 'fulfilled' ? malayalamRes.value?.results || [] : []);
      const cleanPunjabiHits = dedupeSection(punjabiRes.status === 'fulfilled' ? punjabiRes.value?.results || [] : []);
      const cleanKannadaHits = dedupeSection(kannadaRes.status === 'fulfilled' ? kannadaRes.value?.results || [] : []);

      const rawFeed = feedRes.status === 'fulfilled' ? feedRes.value?.results || [] : [];
      const cleanFeed = dedupeSection(rawFeed);

      setTrending(cleanTrending);
      setPopularAlbums(cleanAlbums);
      setArtists(cleanArtists);
      setTamilHits(cleanTamilHits);
      setTamilClassics(cleanTamilClassics);
      setTeluguHits(cleanTeluguHits);
      setTeluguClassics(cleanTeluguClassics);
      setHindiHits(cleanHindiHits);
      setHindiClassics(cleanHindiClassics);
      setEnglishHits(cleanEnglishHits);
      setMalayalamHits(cleanMalayalamHits);
      setPunjabiHits(cleanPunjabiHits);
      setKannadaHits(cleanKannadaHits);
      setFeedTracks(cleanFeed);

      // Save to memory cache for zero-delay instant hydration
      homeDataCache[lang] = {
        trending: cleanTrending,
        popularAlbums: cleanAlbums,
        artists: cleanArtists,
        tamilHits: cleanTamilHits,
        tamilClassics: cleanTamilClassics,
        teluguHits: cleanTeluguHits,
        teluguClassics: cleanTeluguClassics,
        hindiHits: cleanHindiHits,
        hindiClassics: cleanHindiClassics,
        englishHits: cleanEnglishHits,
        malayalamHits: cleanMalayalamHits,
        punjabiHits: cleanPunjabiHits,
        kannadaHits: cleanKannadaHits,
        feedTracks: cleanFeed,
      };
      AsyncStorage.setItem('@vibestream_home_cache', JSON.stringify(homeDataCache)).catch(() => {});
    } catch (e) {
      console.warn('Home fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLang]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate cached data before the network refresh.
    fetchHomeData(selectedLang);
  }, [fetchHomeData, selectedLang]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData(selectedLang, true);
  };

  const handleLanguageSelect = (langId) => {
    setSelectedLang(langId);
    setLoading(true);
  };

  const loadMoreFeedTracks = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = feedPage + 1;
      const res = await musicAPI.search(getFeedQuery(selectedLang), 'tracks', 100, nextPage, selectedLang, 'saavn');
      const newItems = res?.results || [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setFeedTracks((prev) => {
          const currentKeys = new Set();
          const currentIds = new Set();
          [
            ...trending,
            ...tamilHits, ...tamilClassics,
            ...teluguHits, ...teluguClassics,
            ...hindiHits, ...hindiClassics,
            ...englishHits,
            ...malayalamHits, ...punjabiHits, ...kannadaHits,
            ...prev,
          ].forEach((t) => {
            if (t?.id) currentIds.add(t.id);
            getTrackDedupeTokens(t).forEach((tok) => currentKeys.add(tok));
          });
          const additions = deduplicateTracks(newItems, currentKeys, currentIds);
          return [...prev, ...additions];
        });
        setFeedPage(nextPage);
        setVisibleFeedCount((prev) => prev + 30);
      }
    } catch (err) {
      console.warn('Load more error:', err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const [boostingFeed, setBoostingFeed] = useState(false);

  const boostFeedTracks = async () => {
    if (boostingFeed) return;
    setBoostingFeed(true);
    try {
      const qSeeds = {
        tamil: [
          'Amaran Tamil Songs Sai Abhyankaar GV Prakash',
          'Vettaiyan Manasilaayo Rajinikanth Anirudh',
          'GOAT Greatest Of All Time Thalapathy Vijay Yuvan',
          'Aasa Kooda Sai Abhyankaar',
          'Devara Tamil Chuttamalle Anirudh',
          'Pushpa 2 The Rule Tamil Devi Sri Prasad',
          'Raayan Dhanush AR Rahman',
          'Tamil Superhits Anirudh Rahman',
          'Ilaiyaraaja 80s 90s Melodies SPB',
        ],
        telugu: [
          'Pushpa 2 The Rule Telugu DSP Allu Arjun',
          'Devara Chuttamalle Fear Song Anirudh Jr NTR',
          'Saripodhaa Sanivaaram Nani Jakes Bejoy',
          'Kalki 2898 AD Santhosh Narayanan Prabhas',
          'Guntur Kaaram Kurchi Madathapetti Thaman',
          'HanuMan GowraHari',
          'Tillu Square Radhika Ram Miriyala',
          'Telugu Tollywood Hits DSP',
          'SPB Telugu Golden Classics',
        ],
        hindi: [
          'Stree 2 Aaj Ki Raat Aayi Nai Sachin Jigar',
          'Tauba Tauba Bad Newz Karan Aujla',
          'Bhool Bhulaiyaa 3 Pitbull Diljit Dosanjh',
          'Animal Arjan Vailly Satranga Ranbir Kapoor',
          'Fighter Hrithik Roshan Vishal Shekhar',
          'Dunki O Maahi Pritam Arijit',
          'Bollywood Hits 2024 Arijit',
          'Kishore Kumar Lata 70s 80s',
          '90s Evergreen Bollywood Hits',
        ],
        english: [
          'Espresso Sabrina Carpenter',
          'Birds of a Feather Billie Eilish',
          'Die With A Smile Lady Gaga Bruno Mars',
          'Apt ROSE Bruno Mars',
          'Beautiful Things Benson Boone',
          'Good Luck Babe Chappell Roan',
          'Lose Control Teddy Swims',
          'Billboard Hot 100 Hits',
          'Today Top Hits Global Pop',
          'Taylor Swift The Weeknd Hits',
        ],
        malayalam: [
          'Latest Malayalam Songs Aavesham Premalu',
          'Sushin Shyam Malayalam Hits',
          'Manjummel Boys Malayalam Hits',
          'Hesham Abdul Wahab Hits',
          'Top Mollywood Superhits',
          'Malayalam Melody Hits Jakes Bejoy',
        ],
        punjabi: [
          'Latest Punjabi Hits 2024 Karan Aujla',
          'Diljit Dosanjh Punjabi Superhits',
          'AP Dhillon Shubh Punjabi Hits',
          'Sidhu Moose Wala Hits',
          'Punjabi Party Hits B Praak',
        ],
        kannada: [
          'Latest Kannada Songs Sandalwood 2024',
          'KGF Kantara Kannada Hits',
          'Ravi Basrur Kannada Superhits',
          'Sanjith Hegde Kannada Melodies',
          'Arjun Janya Kannada Hits',
        ],
        all: [
          'Amaran Vettaiyan Tamil Hits',
          'Pushpa 2 Devara Telugu Hits',
          'Stree 2 Tauba Tauba Bollywood Hits',
          'Espresso Birds of a Feather Global Pop Hits',
          'Aavesham Manjummel Boys Malayalam Hits',
          'Diljit Karan Aujla Punjabi Hits',
          'KGF Kantara Kannada Hits',
        ],
      };
      const seeds = qSeeds[selectedLang] || qSeeds.all;
      const promises = seeds.map((s) => musicAPI.search(s, 'tracks', 60, 1, selectedLang, 'saavn'));
      const resList = await Promise.allSettled(promises);
      const newItems = resList
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value?.results || []);

      if (newItems.length > 0) {
        setFeedTracks((prev) => {
          const currentKeys = new Set();
          const currentIds = new Set();
          [
            ...trending,
            ...tamilHits, ...tamilClassics,
            ...teluguHits, ...teluguClassics,
            ...hindiHits, ...hindiClassics,
            ...englishHits,
            ...malayalamHits, ...punjabiHits, ...kannadaHits,
            ...prev,
          ].forEach((t) => {
            if (t?.id) currentIds.add(t.id);
            getTrackDedupeTokens(t).forEach((tok) => currentKeys.add(tok));
          });
          const additions = deduplicateTracks(newItems, currentKeys, currentIds);
          return [...prev, ...additions];
        });
        setVisibleFeedCount((prev) => prev + 50);
      }
    } catch (e) {
      console.warn('Boost feed error:', e.message);
    } finally {
      setBoostingFeed(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.headerGradientWrap, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={[Colors.primaryDark + 'DD', Colors.primaryDark + '80', Colors.bg + '00']}
            style={styles.headerGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.headerBrandRow,
                  {
                    opacity: headerEntrance,
                    transform: [
                      { translateY: headerEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                    ],
                  },
                ]}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.headerLogoImg}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.username}>{user?.username || 'Music Lover'}</Text>
                </View>
              </Animated.View>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarText}>
                    {(user?.username?.[0] || 'V').toUpperCase()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Catalog Info Bar */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="musical-notes" size={12} color={Colors.primaryLight} />
                <Text style={styles.statText}>Tamil · Telugu · Hindi · English · All Songs</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Ionicons name="sparkles" size={12} color={Colors.warning} />
                <Text style={styles.statText}>All Eras (Old & New)</Text>
              </View>
            </View>

            {/* Language filter selector pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langPillsRow}
            >
              {HOME_LANGUAGES.map((lang) => {
                const isActive = selectedLang === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.langPill,
                      isActive && styles.langPillActive,
                      isActive && { borderColor: lang.color },
                    ]}
                    onPress={() => handleLanguageSelect(lang.id)}
                    activeOpacity={0.8}
                  >
                    {isActive && (
                      <LinearGradient
                        colors={[lang.color, Colors.primaryDark]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        borderRadius={Radius.full}
                      />
                    )}
                    <Text style={[styles.langPillText, isActive && styles.langPillTextActive]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </Animated.View>

        {/* Explore All Music & Languages Banner */}
        <TouchableOpacity
          style={styles.exploreBanner}
          onPress={() => router.push('/see-more')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[Colors.primaryDark, Colors.bgElevated]}
            style={styles.exploreBannerGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.exploreBannerLeft}>
              <View style={styles.exploreBannerBadge}>
                <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                <Text style={styles.exploreBannerBadgeText}>ALL-IN-ONE MUSIC HUB</Text>
              </View>
              <Text style={styles.exploreBannerTitle}>Explore All Songs & Languages</Text>
              <Text style={styles.exploreBannerSub}>
                Tamil · English · Hindi · Telugu (Old Classics & New Hits)
              </Text>
              <View style={styles.exploreLanguagesRow}>
                <View style={[styles.langChip, { borderColor: '#F97316' }]}>
                  <Text style={[styles.langChipText, { color: '#F97316' }]}>🦁 Tamil</Text>
                </View>
                <View style={[styles.langChip, { borderColor: '#38BDF8' }]}>
                  <Text style={[styles.langChipText, { color: '#38BDF8' }]}>🌍 English</Text>
                </View>
                <View style={[styles.langChip, { borderColor: '#EAB308' }]}>
                  <Text style={[styles.langChipText, { color: '#EAB308' }]}>🇮🇳 Hindi</Text>
                </View>
                <View style={[styles.langChip, { borderColor: '#10B981' }]}>
                  <Text style={[styles.langChipText, { color: '#10B981' }]}>⚡ Telugu</Text>
                </View>
              </View>
            </View>
            <View style={styles.exploreBannerRight}>
              <View style={styles.exploreActionBtn}>
                <Text style={styles.exploreActionText}>See More</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.white} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Interactive Mood Recommendations Section */}
        <View style={styles.section}>
          <View style={styles.recHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={[styles.recBadge, { backgroundColor: (currentMoodObj?.color || Colors.primary) + '22' }]}>
                <Ionicons name="sparkles" size={12} color={currentMoodObj?.color || Colors.primaryLight} />
                <Text style={[styles.recBadgeText, { color: currentMoodObj?.color || Colors.primaryLight }]}>
                  CLICK A MOOD FOR INSTANT SONGS
                </Text>
              </View>
              <Text style={styles.recTitle}>{currentMoodObj?.label || '💖 Love & Romantic'}</Text>
              <Text style={styles.recSubtitle}>
                Recommended {selectedLang === 'all' ? 'Worldwide' : selectedLang.toUpperCase()} songs in this mood
              </Text>
            </View>
            {moodTracks.length > 0 && (
              <TouchableOpacity
                style={[styles.playMoodBtn, { backgroundColor: currentMoodObj?.color || Colors.primary }]}
                onPress={() => loadAndPlay(moodTracks[0], moodTracks, 0)}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={14} color={Colors.white} />
                <Text style={styles.playMoodBtnText}>Play Mix</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interactive Clickable Mood Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodPillsRow}>
            {MOODS.map((m) => {
              const isSelected = activeMood === m.id;
              return (
                <TouchableOpacity
                  key={`mood-pill-${m.id}`}
                  style={[
                    styles.moodPill,
                    isSelected && [styles.moodPillActive, { borderColor: m.color, backgroundColor: m.color + '26' }],
                  ]}
                  onPress={() => handleMoodSelect(m.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.moodPillText, isSelected && { color: m.color, fontFamily: Typography.fontFamily.semiBold }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Mood Songs Cards */}
          {moodLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {Array.from({ length: 4 }).map((_, i) => (
                <AlbumCardSkeleton key={`mood-skel-${i}`} />
              ))}
            </ScrollView>
          ) : moodTracks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {moodTracks.map((track) => (
                <AlbumCard
                  key={`mood-${track.id}`}
                  item={track}
                  onPress={(t) => loadAndPlay(t, moodTracks, moodTracks.indexOf(t))}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noMoodText}>Loading songs for this mood...</Text>
          )}
        </View>

        {/* Trending Now */}
        <View style={styles.section}>
          <SectionHeader
            title={selectedLang === 'tamil' ? '🦁 Trending Tamil' : selectedLang === 'telugu' ? '⚡ Trending Telugu' : selectedLang === 'hindi' ? '🇮🇳 Trending Hindi' : selectedLang === 'english' ? '🌍 Trending English' : '🔥 Trending Worldwide'}
            onSeeAll={() => router.push({ pathname: '/see-more', params: { language: selectedLang } })}
          />
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
          ) : trending.length > 0 ? (
            trending.slice(0, 15).map((track, i) => (
              <TrackCard key={`${track.id}-${i}`} track={track} queue={trending} index={i} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Unable to connect to server</Text>
              <Text style={styles.emptySubtitle}>
                Ensure your phone is on the same Wi-Fi as your computer, or pull down to refresh.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHomeData(selectedLang)} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>🔄 Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Blockbuster & Trending Albums Section */}
        {(loading || popularAlbums.length > 0) && (
          <View style={styles.section}>
            <SectionHeader
              title={
                selectedLang === 'tamil'
                  ? '💿 Kollywood & Tamil Blockbuster Albums'
                  : selectedLang === 'telugu'
                  ? '💿 Tollywood & Telugu Blockbuster Albums'
                  : selectedLang === 'hindi'
                  ? '💿 Bollywood & Hindi Blockbuster Albums'
                  : selectedLang === 'english'
                  ? '💿 Global Billboard & Pop Albums'
                  : '💿 Blockbuster & Trending Albums'
              }
              subtitle="Full original soundtrack albums · Tap to open album songs"
              onSeeAll={() => router.push({ pathname: '/(tabs)/search', params: { tab: 'albums' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <AlbumCardSkeleton key={i} />)
                : popularAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      item={album}
                      onPress={(a) => router.push(`/album/${a.id}`)}
                    />
                  ))}
            </ScrollView>
          </View>
        )}

        {/* Top Indian & Global Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="🎤 Top Indian & Global Artists"
              subtitle="Explore composers, music directors and singers"
              onSeeAll={() => router.push({ pathname: '/(tabs)/search', params: { tab: 'artists' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {artists.map((artist) => (
                <ArtistChip
                  key={artist.id}
                  artist={artist}
                  onPress={() => router.push(`/artist/${artist.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 1. Tamil Latest Superhits Horizontal Section */}
        {tamilHits.length > 0 && selectedLang !== 'hindi' && selectedLang !== 'english' && selectedLang !== 'telugu' && (
          <View style={styles.section}>
            <SectionHeader
              title="🦁 Kollywood & Tamil Latest Hits"
              subtitle="Anirudh · AR Rahman · Harris Jayaraj · Latest Releases"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'tamil' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {tamilHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, tamilHits, tamilHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. Tamil Golden Classics Horizontal Section (Old & Evergreen) */}
        {tamilClassics.length > 0 && selectedLang !== 'hindi' && selectedLang !== 'english' && selectedLang !== 'telugu' && (
          <View style={styles.section}>
            <SectionHeader
              title="📻 Golden Tamil Classics (80s & 90s)"
              subtitle="Ilaiyaraaja · SP Balasubrahmanyam · MSV · K.J. Yesudas"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'tamil' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {tamilClassics.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, tamilClassics, tamilClassics.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. Telugu Latest Superhits Section */}
        {teluguHits.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'hindi' && selectedLang !== 'english' && (
          <View style={styles.section}>
            <SectionHeader
              title="⚡ Tollywood & Telugu Blockbusters"
              subtitle="Devi Sri Prasad · Thaman S · Pushpa · Devara · Latest"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'telugu' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {teluguHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, teluguHits, teluguHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. Telugu Golden Classics Section */}
        {teluguClassics.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'hindi' && selectedLang !== 'english' && (
          <View style={styles.section}>
            <SectionHeader
              title="🎻 Golden Telugu Classics (SPB & Ilaiyaraaja)"
              subtitle="Timeless Tollywood Evergreens"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'telugu' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {teluguClassics.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, teluguClassics, teluguClassics.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 5. Hindi & Bollywood Latest Superhits Section */}
        {hindiHits.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'english' && selectedLang !== 'telugu' && (
          <View style={styles.section}>
            <SectionHeader
              title="🇮🇳 Bollywood & Hindi Blockbusters"
              subtitle="Arijit Singh · Pritam · Badshah · Latest Hits"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'hindi' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {hindiHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, hindiHits, hindiHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 6. Hindi Golden Retro Classics Section */}
        {hindiClassics.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'english' && selectedLang !== 'telugu' && (
          <View style={styles.section}>
            <SectionHeader
              title="📻 Golden Hindi Retro & 90s Romance"
              subtitle="Kishore Kumar · Lata Mangeshkar · RD Burman · Rafi"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'hindi' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {hindiClassics.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, hindiClassics, hindiClassics.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 7. Global English Hits Section */}
        {englishHits.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'hindi' && selectedLang !== 'telugu' && selectedLang !== 'malayalam' && selectedLang !== 'punjabi' && selectedLang !== 'kannada' && (
          <View style={styles.section}>
            <SectionHeader
              title="🌍 Global English Pop & Hits"
              subtitle="Taylor Swift · The Weeknd · Billboard Hot 100"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'english' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {englishHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, englishHits, englishHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 8. Mollywood & Malayalam Hits Section */}
        {malayalamHits.length > 0 && (selectedLang === 'all' || selectedLang === 'malayalam') && (
          <View style={styles.section}>
            <SectionHeader
              title="🌴 Mollywood & Malayalam Hits"
              subtitle="Aavesham · Premalu · Manjummel Boys · Sushin Shyam · Hesham"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'malayalam' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {malayalamHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, malayalamHits, malayalamHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 9. Punjabi Hits Section */}
        {punjabiHits.length > 0 && (selectedLang === 'all' || selectedLang === 'punjabi') && (
          <View style={styles.section}>
            <SectionHeader
              title="🔥 Punjabi Beats & Blockbusters"
              subtitle="Diljit Dosanjh · Karan Aujla · AP Dhillon · Sidhu Moose Wala"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'punjabi' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {punjabiHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, punjabiHits, punjabiHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 10. Sandalwood & Kannada Superhits Section */}
        {kannadaHits.length > 0 && (selectedLang === 'all' || selectedLang === 'kannada') && (
          <View style={styles.section}>
            <SectionHeader
              title="👑 Sandalwood & Kannada Hits"
              subtitle="KGF · Kantara · Ravi Basrur · Sanjith Hegde · Arjun Janya"
              onSeeAll={() => router.push({ pathname: '/see-more', params: { language: 'kannada' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {kannadaHits.map((track) => (
                <AlbumCard
                  key={track.id}
                  item={track}
                  onPress={(t) => loadAndPlay(t, kannadaHits, kannadaHits.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* EXTENDED SONGS FEED (Smooth Windowed Rendering) */}
        {feedTracks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={
                selectedLang === 'tamil'
                  ? '🦁 All Tamil Songs Stream (Old & New)'
                  : selectedLang === 'telugu'
                  ? '⚡ All Telugu Songs Stream (Tollywood)'
                  : selectedLang === 'hindi'
                  ? '🇮🇳 All Hindi Songs Stream (Bollywood & Retro)'
                  : selectedLang === 'english'
                  ? '🌍 All Global English Songs Stream'
                  : selectedLang === 'malayalam'
                  ? '🌴 All Malayalam Songs Stream (Mollywood)'
                  : selectedLang === 'punjabi'
                  ? '🔥 All Punjabi Songs Stream (Bhangra & Pop)'
                  : selectedLang === 'kannada'
                  ? '👑 All Kannada Songs Stream (Sandalwood)'
                  : '🎵 All Music & Songs Stream'
              }
              subtitle={`Showing ${Math.min(visibleFeedCount, feedTracks.length)} of ${feedTracks.length} songs · Tap any track to play`}
            />

            {feedTracks.slice(0, visibleFeedCount).map((track, i) => (
              <TrackCard
                key={`${track.id}-${i}`}
                track={track}
                queue={feedTracks}
                index={i}
              />
            ))}

            {visibleFeedCount < feedTracks.length && (
              <TouchableOpacity
                style={styles.showMoreInlineBtn}
                onPress={() => setVisibleFeedCount((prev) => Math.min(prev + 30, feedTracks.length))}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.bgElevated]}
                  style={styles.showMoreInlineGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="chevron-down-circle" size={18} color={Colors.primaryLight} />
                  <Text style={styles.showMoreInlineText}>
                    Show More Songs (+30) · {feedTracks.length - visibleFeedCount} remaining
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Load More Songs Dual Buttons */}
            {hasMore ? (
              <View style={styles.feedBtnRow}>
                <TouchableOpacity
                  style={[styles.loadMoreButton, { flex: 1 }]}
                  onPress={loadMoreFeedTracks}
                  disabled={loadingMore}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primaryDark, Colors.bgElevated]}
                    style={styles.loadMoreGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={Colors.primaryLight} />
                    ) : (
                      <>
                        <Ionicons name="arrow-down-circle" size={16} color={Colors.primaryLight} />
                        <Text style={styles.loadMoreText}>+100 Songs</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loadMoreButton, { flex: 1.3 }]}
                  onPress={boostFeedTracks}
                  disabled={boostingFeed}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#9333EA']}
                    style={styles.loadMoreGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {boostingFeed ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="flash" size={16} color={Colors.white} />
                        <Text style={[styles.loadMoreText, { color: Colors.white }]}>
                          ⚡ Boost 500+ Songs
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.allLoadedContainer}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primaryLight} />
                <Text style={styles.allLoadedText}>All {feedTracks.length} songs loaded</Text>
              </View>
            )}
          </View>
        )}

        {/* Worldwide Music Features Card */}
        <View style={styles.sourcesCard}>
          <View style={styles.sourcesHeader}>
            <Ionicons name="globe" size={18} color={Colors.primaryLight} />
            <Text style={styles.sourcesTitle}>All The Music in the World</Text>
          </View>
          <Text style={styles.sourcesBody}>
            Stream every Tamil, Hindi, English, and worldwide track with crystal-clear 320kbps audio.
            Search songs across YouTube, Spotify, and JioSaavn, and save any track directly to your playlists and favorites!
          </Text>
          <View style={styles.sourcesList}>
            <View style={[styles.sourceBadge, { borderColor: '#F97316' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#F97316' }]}>🦁 Tamil (தமிழ்)</Text>
            </View>
            <View style={[styles.sourceBadge, { borderColor: '#10B981' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#10B981' }]}>⚡ Telugu (తెలుగు)</Text>
            </View>
            <View style={[styles.sourceBadge, { borderColor: '#EAB308' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#EAB308' }]}>🇮🇳 Hindi (हिंदी)</Text>
            </View>
            <View style={[styles.sourceBadge, { borderColor: '#38BDF8' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#38BDF8' }]}>🌍 English Pop</Text>
            </View>
            <View style={[styles.sourceBadge, { borderColor: '#EF4444' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#EF4444' }]}>▶ YouTube</Text>
            </View>
            <View style={[styles.sourceBadge, { borderColor: '#10B981' }]}>
              <Text style={[styles.sourceBadgeText, { color: '#10B981' }]}>🟢 Spotify</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Onboarding Taste Questionnaire Modal */}
      <TasteOnboardingModal
        visible={showTasteModal}
        onClose={() => setShowTasteModal(false)}
        onComplete={(pref) => {
          setShowTasteModal(false);
          fetchPersonalizedRecommendations(pref);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 20 },

  headerGradientWrap: { marginBottom: Spacing.sm },
  headerGradient: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  greeting: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  username: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    marginTop: 2,
  },
  avatarBtn: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },

  langPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  langPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  langPillActive: {
    borderColor: Colors.primary,
  },
  langPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  langPillTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamily.semiBold,
  },

  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  recBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.primaryLight,
  },
  recTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  recSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryLight,
  },

  exploreBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exploreBannerGrad: {
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exploreBannerLeft: {
    flex: 1,
    gap: 4,
  },
  exploreBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: 2,
  },
  exploreBannerBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 9,
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
  exploreBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  exploreBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  exploreLanguagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: Colors.bgCard,
  },
  langChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
  },
  exploreBannerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  exploreActionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },

  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  hScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.base,
    paddingTop: Spacing.xs,
  },

  artistCard: {
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  artistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artistInitial: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.primaryLight,
  },
  artistName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  artistEra: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  sourcesCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  sourcesBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sourceBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
    backgroundColor: Colors.bgElevated,
  },
  feedBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },
  loadMoreButton: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.base,
    gap: 8,
  },
  loadMoreText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  allLoadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  allLoadedText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
  },
  retryBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  playMoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  playMoodBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },
  moodPillsRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  moodPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodPillActive: {
    borderWidth: 1.5,
  },
  moodPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  noMoodText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.md,
  },
  showMoreInlineBtn: {
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  showMoreInlineGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  showMoreInlineText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
});
