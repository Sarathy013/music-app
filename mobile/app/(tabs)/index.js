import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity,
  FlatList, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { musicAPI } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { usePlayer } from '../../store/PlayerContext';
import TrackCard from '../../components/TrackCard';
import AlbumCard from '../../components/AlbumCard';
import SectionHeader from '../../components/SectionHeader';
import { TrackSkeleton, AlbumCardSkeleton } from '../../components/SkeletonLoader';
import TasteOnboardingModal, { getUserPreferences, MOODS } from '../../components/TasteOnboardingModal';

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
];

function ArtistChip({ artist, onPress }) {
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
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { loadAndPlay } = usePlayer();
  const router = useRouter();

  const [selectedLang, setSelectedLang] = useState('all');
  const [trending, setTrending] = useState([]);
  const [tamilHits, setTamilHits] = useState([]);
  const [tamilClassics, setTamilClassics] = useState([]);
  const [teluguHits, setTeluguHits] = useState([]);
  const [teluguClassics, setTeluguClassics] = useState([]);
  const [hindiHits, setHindiHits] = useState([]);
  const [hindiClassics, setHindiClassics] = useState([]);
  const [englishHits, setEnglishHits] = useState([]);
  const [artists, setArtists] = useState([]);
  
  // Personalized Recommendations based on User's Taste Questionnaire
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [userTaste, setUserTaste] = useState(null);
  const [showTasteModal, setShowTasteModal] = useState(false);

  // Extended Songs Feed with Pagination
  const [feedTracks, setFeedTracks] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if onboarding questionnaire has been completed by user
  useEffect(() => {
    getUserPreferences().then((pref) => {
      if (pref) {
        setUserTaste(pref);
        fetchPersonalizedRecommendations(pref);
      } else {
        // Show questionnaire modal automatically for user
        setShowTasteModal(true);
      }
    });
  }, [user]);

  const fetchPersonalizedRecommendations = async (pref) => {
    if (!pref) return;
    try {
      const langs = pref.languages || ['all'];
      const moods = pref.moods || ['happy'];
      const primaryLang = langs[0] === 'all' ? 'hindi' : langs[0];
      const moodObj = MOODS.find((m) => moods.includes(m.id)) || MOODS[0];
      const query = `${primaryLang} ${moodObj.query}`;

      const res = await musicAPI.search(query, 'tracks', 40, 1, primaryLang, 'saavn');
      const list = res?.results || [];
      const seen = new Set();
      const unique = list.filter((t) => {
        if (!t || !t.id || seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      setRecommendedTracks(unique);
    } catch {}
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const getFeedQuery = (lang) => {
    if (lang === 'tamil') return 'All Tamil Songs Anirudh Rahman Ilaiyaraaja';
    if (lang === 'telugu') return 'All Telugu Songs Tollywood DSP Thaman';
    if (lang === 'hindi') return 'All Hindi Songs Bollywood Arijit Kishore';
    if (lang === 'english') return 'All English Pop Rock Billboard Hits';
    return 'Trending Songs Hits Worldwide';
  };

  const fetchHomeData = useCallback(async (lang = selectedLang) => {
    try {
      setFeedPage(1);
      setHasMore(true);

      const [
        trendingRes, artistsRes,
        tamilRes, tamilClassicsRes,
        teluguRes, teluguClassicsRes,
        hindiRes, hindiClassicsRes,
        englishRes,
        feedRes,
      ] = await Promise.allSettled([
        musicAPI.getTrending(40, lang),
        musicAPI.getPopularArtists(18),
        musicAPI.search('Latest Tamil Songs Anirudh', 'tracks', 40, 1, 'tamil', 'saavn'),
        musicAPI.search('Classic Tamil Old 80s 90s Ilaiyaraaja SPB', 'tracks', 40, 1, 'tamil', 'saavn'),
        musicAPI.search('Latest Telugu Songs Tollywood', 'tracks', 40, 1, 'telugu', 'saavn'),
        musicAPI.search('Classic Telugu Songs SPB Ilaiyaraaja Old', 'tracks', 40, 1, 'telugu', 'saavn'),
        musicAPI.search('Hindi Hits Arijit Singh Bollywood', 'tracks', 40, 1, 'hindi', 'saavn'),
        musicAPI.search('Old Hindi Songs Kishore Kumar RD Burman', 'tracks', 40, 1, 'hindi', 'saavn'),
        musicAPI.search('Global Pop English Hits 2024', 'tracks', 40, 1, 'english', 'saavn'),
        musicAPI.search(getFeedQuery(lang), 'tracks', 100, 1, lang, 'saavn'),
      ]);

      const dedup = (list) => {
        const seen = new Set();
        return (list || []).filter((t) => {
          if (!t || !t.id) return false;
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      };

      if (trendingRes.status === 'fulfilled') setTrending(dedup(trendingRes.value?.tracks || []));
      if (artistsRes.status === 'fulfilled') setArtists(artistsRes.value?.artists || []);
      if (tamilRes.status === 'fulfilled') setTamilHits(dedup(tamilRes.value?.results || []));
      if (tamilClassicsRes.status === 'fulfilled') setTamilClassics(dedup(tamilClassicsRes.value?.results || []));
      if (teluguRes.status === 'fulfilled') setTeluguHits(dedup(teluguRes.value?.results || []));
      if (teluguClassicsRes.status === 'fulfilled') setTeluguClassics(dedup(teluguClassicsRes.value?.results || []));
      if (hindiRes.status === 'fulfilled') setHindiHits(dedup(hindiRes.value?.results || []));
      if (hindiClassicsRes.status === 'fulfilled') setHindiClassics(dedup(hindiClassicsRes.value?.results || []));
      if (englishRes.status === 'fulfilled') setEnglishHits(dedup(englishRes.value?.results || []));
      if (feedRes.status === 'fulfilled') setFeedTracks(dedup(feedRes.value?.results || []));
    } catch (e) {
      console.warn('Home fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLang]);

  useEffect(() => {
    fetchHomeData(selectedLang);
  }, [selectedLang]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData(selectedLang);
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
          const seen = new Set(prev.map((t) => t.id));
          const additions = newItems.filter((t) => t && t.id && !seen.has(t.id));
          return [...prev, ...additions];
        });
        setFeedPage(nextPage);
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
        tamil: ['Tamil Superhits Anirudh', 'AR Rahman Tamil Hits', 'Ilaiyaraaja 80s 90s Melodies', 'Yuvan Harris Tamil', 'Kollywood Mass Songs'],
        telugu: ['Telugu Tollywood Hits DSP', 'Thaman S Telugu Superhits', 'SPB Telugu Golden Classics', 'Sid Sriram Telugu Melodies', 'Allu Arjun Mahesh Hits'],
        hindi: ['Bollywood Hits 2024 Arijit', 'Kishore Kumar Lata 70s 80s', '90s Evergreen Bollywood Hits', 'Pritam Bollywood Hits', 'Sonu Nigam KK Hits'],
        english: ['Billboard Hot 100 Hits', 'Today Top Hits Global Pop', 'Taylor Swift The Weeknd Hits', 'Classic 80s 90s Rock Pop', 'Ed Sheeran Acoustic Hits'],
        all: ['Tamil Superhits Kollywood', 'Telugu Tollywood Superhits', 'Bollywood Blockbuster Hits', 'Billboard Hot 100 English Hits'],
      };
      const seeds = qSeeds[selectedLang] || qSeeds.all;
      const promises = seeds.map((s) => musicAPI.search(s, 'tracks', 60, 1, selectedLang, 'saavn'));
      const resList = await Promise.allSettled(promises);
      const newItems = resList
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value?.results || []);

      if (newItems.length > 0) {
        setFeedTracks((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          const additions = newItems.filter((t) => t && t.id && !seen.has(t.id));
          return [...prev, ...additions];
        });
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
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.username}>{user?.username || 'Music Lover'}</Text>
              </View>
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

        {/* Personalized "Made For You" Recommendation Section based on Question/Preferences */}
        {recommendedTracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.recHeaderRow}>
              <View>
                <View style={styles.recBadge}>
                  <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                  <Text style={styles.recBadgeText}>TAILORED FOR YOUR TASTE</Text>
                </View>
                <Text style={styles.recTitle}>✨ Made For You</Text>
                <Text style={styles.recSubtitle}>
                  Songs picked based on your preferred languages and mood
                </Text>
              </View>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => setShowTasteModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={14} color={Colors.primaryLight} />
                <Text style={styles.retakeBtnText}>Change Taste</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {recommendedTracks.map((track) => (
                <AlbumCard
                  key={`rec-${track.id}`}
                  item={track}
                  onPress={(t) => loadAndPlay(t, recommendedTracks, recommendedTracks.indexOf(t))}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Now */}
        <View style={styles.section}>
          <SectionHeader
            title={selectedLang === 'tamil' ? '🦁 Trending Tamil' : selectedLang === 'telugu' ? '⚡ Trending Telugu' : selectedLang === 'hindi' ? '🇮🇳 Trending Hindi' : selectedLang === 'english' ? '🌍 Trending English' : '🔥 Trending Worldwide'}
            onSeeAll={() => router.push({ pathname: '/see-more', params: { language: selectedLang } })}
          />
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
            : trending.slice(0, 15).map((track, i) => (
                <TrackCard key={`${track.id}-${i}`} track={track} queue={trending} index={i} />
              ))}
        </View>

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
        {englishHits.length > 0 && selectedLang !== 'tamil' && selectedLang !== 'hindi' && selectedLang !== 'telugu' && (
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

        {/* Popular Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="🎤 Top Indian & Global Artists" />
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

        {/* 8. EXTENDED SONGS FEED (Dozens of songs with "Load More" on the Main Page!) */}
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
                  : '🎵 All Music & Songs Stream'
              }
              subtitle={`Showing ${feedTracks.length} songs · Tap any track to play immediately`}
            />

            {feedTracks.map((track, i) => (
              <TrackCard
                key={`${track.id}-${i}`}
                track={track}
                queue={feedTracks}
                index={i}
              />
            ))}

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
          setUserTaste(pref);
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
});
