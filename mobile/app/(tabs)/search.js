import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Animated, Image, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { musicAPI } from '../../services/api';
import { STORAGE_KEYS } from '../../constants/config';
import TrackCard from '../../components/TrackCard';
import EmptyState from '../../components/EmptyState';
import { deduplicateTracks, getTrackDedupeKey, getTrackDedupeTokens } from '../../utils/helpers';

const { width } = Dimensions.get('window');

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const TABS = ['tracks', 'artists', 'albums'];
const TAB_LABELS = { tracks: '🎵 Tracks', artists: '🎤 Artists', albums: '💿 Albums' };

const LANGUAGE_FILTERS = [
  { id: 'all', label: '🌐 All', language: 'all', source: 'all' },
  { id: 'tamil', label: '🦁 Tamil', language: 'tamil', source: 'saavn', color: '#F97316' },
  { id: 'telugu', label: '⚡ Telugu', language: 'telugu', source: 'saavn', color: '#10B981' },
  { id: 'hindi', label: '🇮🇳 Hindi', language: 'hindi', source: 'saavn', color: '#EAB308' },
  { id: 'english', label: '🌍 English', language: 'english', source: 'saavn', color: '#38BDF8' },
  { id: 'malayalam', label: '🌴 Malayalam', language: 'malayalam', source: 'saavn', color: '#14B8A6' },
  { id: 'punjabi', label: '🪕 Punjabi', language: 'punjabi', source: 'saavn', color: '#EC4899' },
  { id: 'kannada', label: '👑 Kannada', language: 'kannada', source: 'saavn', color: '#8B5CF6' },
  { id: 'youtube', label: '▶ YouTube', language: 'all', source: 'youtube', color: '#EF4444' },
  { id: 'spotify', label: '🟢 Spotify', language: 'all', source: 'spotify', color: '#10B981' },
];

const QUICK_TRENDING_TAGS = [
  { text: '🦁 Anirudh Hits', query: 'Anirudh Ravichander', lang: 'tamil' },
  { text: '⚡ DSP Telugu Hits', query: 'Devi Sri Prasad Hits', lang: 'telugu' },
  { text: '🎶 AR Rahman', query: 'A.R. Rahman', lang: 'tamil' },
  { text: '🎤 Arijit Singh', query: 'Arijit Singh', lang: 'hindi' },
  { text: '🌴 Sushin Shyam', query: 'Sushin Shyam Malayalam', lang: 'malayalam' },
  { text: '🪕 Diljit Dosanjh', query: 'Diljit Dosanjh Punjabi Hits', lang: 'punjabi' },
  { text: '👑 Ravi Basrur', query: 'Ravi Basrur Kannada KGF', lang: 'kannada' },
  { text: '🎵 Thaman S', query: 'Thaman S Telugu', lang: 'telugu' },
  { text: '🌟 Taylor Swift', query: 'Taylor Swift', lang: 'english' },
  { text: '🔥 Naa Ready', query: 'Naa Ready Leo', lang: 'tamil' },
  { text: '✨ SPB Classics', query: 'SP Balasubrahmanyam Telugu Old', lang: 'telugu' },
  { text: '❤️ Kesariya', query: 'Kesariya Brahmastra', lang: 'hindi' },
  { text: '🎧 Ed Sheeran', query: 'Ed Sheeran', lang: 'english' },
];

const GENRE_COLORS = {
  tamil: '#F97316', telugu: '#10B981', hindi: '#EAB308', english: '#38BDF8',
  malayalam: '#14B8A6', punjabi: '#EC4899', kannada: '#8B5CF6',
  pop: '#F472B6', rock: '#EF4444', electronic: '#06B6D4', hiphop: '#F59E0B',
  jazz: '#8B5CF6', classical: '#10B981', ambient: '#3B82F6', folk: '#D97706',
  metal: '#6B7280', rnb: '#EC4899', acoustic: '#84CC16',
};

const QUICK_GENRES = [
  { id: 'tamil', name: '🦁 Tamil Hits' },
  { id: 'telugu', name: '⚡ Telugu Hits' },
  { id: 'hindi', name: '🇮🇳 Hindi Hits' },
  { id: 'english', name: '🌍 English Pop' },
  { id: 'malayalam', name: '🌴 Malayalam Hits' },
  { id: 'punjabi', name: '🪕 Punjabi Hits' },
  { id: 'kannada', name: '👑 Kannada Hits' },
  { id: 'pop', name: 'Pop Hits' },
  { id: 'hiphop', name: 'Hip-Hop' },
  { id: 'rock', name: 'Rock' },
  { id: 'acoustic', name: 'Acoustic' },
  { id: 'electronic', name: 'EDM' },
  { id: 'classical', name: 'Classical' },
  { id: 'ambient', name: 'Lo-Fi & Ambient' },
];

const SEARCH_SEED_QUERIES = {
  tamil: ['Tamil Superhits Anirudh', 'AR Rahman Tamil Hits', 'Ilaiyaraaja 80s 90s Melodies', 'Yuvan Harris Tamil', 'Kollywood Mass Songs', 'Tamil Love Hits Janaki'],
  telugu: ['Telugu Tollywood Hits DSP', 'Thaman S Telugu Superhits', 'SPB Telugu Golden Classics', 'Sid Sriram Telugu Melodies', 'Allu Arjun Mahesh Hits', 'Telugu Cinema Hits'],
  hindi: ['Bollywood Hits 2024 Arijit', 'Kishore Kumar Lata 70s 80s', '90s Evergreen Bollywood Hits', 'Pritam Bollywood Hits', 'Sonu Nigam KK Hits', 'Bollywood Dance Party'],
  english: ['Billboard Hot 100 Hits', 'Today Top Hits Global Pop', 'Taylor Swift The Weeknd Hits', 'Classic 80s 90s Rock Pop', 'Ed Sheeran Acoustic Hits', 'Global Dance Pop EDM'],
  malayalam: ['Malayalam Superhits Sushin Shyam', 'Aavesham Manjummel Boys Hits', 'Mohanlal Mammootty Evergreen Hits', 'Vineeth Sreenivasan Melodies', 'Malayalam Cinema 2024'],
  punjabi: ['Punjabi Hits Diljit Dosanjh', 'Sidhu Moosewala Superhits', 'AP Dhillon Karan Aujla Punjabi', 'Bhangra Dance Party Hits', 'Punjabi Pop Top 50'],
  kannada: ['Kannada Superhits Ravi Basrur', 'KGF Kantara Kannada Hits', 'Dr Rajkumar Puneeth Hits', 'Sonu Nigam Kannada Melodies', 'Kannada Top 50 Chartbusters'],
};

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const inputRef = useRef(null);

  const [query, setQuery] = useState(params.genre ? params.genreName || params.genre : '');
  const [activeTab, setActiveTab] = useState('tracks');
  const [activeFilter, setActiveFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searched, setSearched] = useState(!!params.genre);
  const [resultCount, setResultCount] = useState(0);
  const [isUrlDetected, setIsUrlDetected] = useState(false);

  const debouncedQuery = useDebounce(query, 350);
  const inputFocused = useRef(new Animated.Value(0)).current;

  const getEffectiveQuery = (rawQuery, filterId) => {
    if (rawQuery && rawQuery.trim().length >= 2) return rawQuery.trim();
    if (filterId === 'tamil') return 'All Tamil Songs Superhits Anirudh Rahman';
    if (filterId === 'telugu') return 'All Telugu Songs Tollywood DSP Thaman';
    if (filterId === 'hindi') return 'All Hindi Bollywood Songs Arijit Singh';
    if (filterId === 'english') return 'All Global English Pop Songs';
    if (filterId === 'malayalam') return 'All Malayalam Songs Sushin Shyam';
    if (filterId === 'punjabi') return 'All Punjabi Songs Diljit Dosanjh';
    if (filterId === 'kannada') return 'All Kannada Songs Ravi Basrur KGF';
    return '';
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (params.genre && params.genreName) {
      performSearch(params.genreName || params.genre, activeTab, activeFilter, false, 1);
    }
  }, [params.genre]);

  useEffect(() => {
    // Detect YouTube or Spotify URL
    const isYt = query.includes('youtube.com') || query.includes('youtu.be');
    const isSp = query.includes('spotify.com');
    setIsUrlDetected(isYt || isSp);

    const effectiveQ = getEffectiveQuery(debouncedQuery, activeFilter);
    if (effectiveQ) {
      performSearch(effectiveQ, activeTab, activeFilter, false, 1);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [debouncedQuery, activeTab, activeFilter]);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  };

  const saveToHistory = async (q) => {
    try {
      const updated = [q, ...history.filter((h) => h !== q)].slice(0, 10);
      setHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    } catch {}
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  };

  const performSearch = async (q, type, filterId, isLoadMore = false, pageNum = 1) => {
    if (!q || !q.trim()) return;

    if (isLoadMore) {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearched(true);
      setPage(1);
      setHasMore(true);
    }

    try {
      const filterConfig = LANGUAGE_FILTERS.find((f) => f.id === filterId) || LANGUAGE_FILTERS[0];
      const res = await musicAPI.search(
        q,
        type,
        80,
        pageNum,
        filterConfig.language,
        filterConfig.source
      );
      const found = res?.results || [];

      if (isLoadMore) {
        if (found.length === 0) {
          setHasMore(false);
        } else {
          setResults((prev) => {
            const currentKeys = new Set();
            const currentIds = new Set();
            prev.forEach((t) => {
              if (t?.id) currentIds.add(t.id);
              getTrackDedupeTokens(t).forEach((tok) => currentKeys.add(tok));
            });
            const additions = type === 'tracks' ? deduplicateTracks(found, currentKeys, currentIds) : found.filter((t) => t && t.id && !currentIds.has(t.id));
            if (additions.length === 0) {
              setHasMore(false);
              return prev;
            }
            return [...prev, ...additions];
          });
          setPage(pageNum);
          setResultCount((prev) => prev + found.length);
        }
      } else {
        const unique = type === 'tracks' ? deduplicateTracks(found) : found;
        setResults(unique);
        setResultCount(unique.length);
        if (q.trim().length > 1 && !q.startsWith('http') && !q.startsWith('All ') && !q.startsWith('Top ')) {
          saveToHistory(q.trim());
        }
      }
    } catch {
      if (!isLoadMore) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || loading || !hasMore || results.length === 0) return;
    const effectiveQ = getEffectiveQuery(debouncedQuery, activeFilter);
    if (!effectiveQ) return;
    performSearch(effectiveQ, activeTab, activeFilter, true, page + 1);
  };

  const [boosting, setBoosting] = useState(false);

  const boost500Songs = async () => {
    if (boosting || loading) return;
    setBoosting(true);
    try {
      const langKey = activeFilter !== 'all' ? activeFilter : 'tamil';
      const seeds = SEARCH_SEED_QUERIES[langKey] || [
        `${debouncedQuery || 'Hit'} Songs`,
        `${debouncedQuery || 'Top'} Superhits`,
        `${debouncedQuery || 'Evergreen'} Classics`,
        `${debouncedQuery || 'Latest'} 2024`,
      ];

      const promises = seeds.map((s) =>
        musicAPI.search(s, activeTab, 60, 1, langKey, 'saavn')
      );
      const resList = await Promise.allSettled(promises);
      const newItems = resList
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value?.results || []);

      if (newItems.length > 0) {
        setResults((prev) => {
          const currentKeys = new Set();
          const currentIds = new Set();
          prev.forEach((t) => {
            if (t?.id) currentIds.add(t.id);
            getTrackDedupeTokens(t).forEach((tok) => currentKeys.add(tok));
          });
          const additions = activeTab === 'tracks'
            ? deduplicateTracks(newItems, currentKeys, currentIds)
            : newItems.filter((t) => t && t.id && !currentIds.has(t.id));
          return [...prev, ...additions];
        });
        setResultCount((prev) => prev + newItems.length);
      }
    } catch (e) {
      console.warn('Boost songs error:', e.message);
    } finally {
      setBoosting(false);
    }
  };

  const handleFocus = () => {
    Animated.timing(inputFocused, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    Animated.timing(inputFocused, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = inputFocused.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const renderResult = ({ item, index }) => {
    if (!item) return null;
    if (activeTab === 'tracks') {
      return <TrackCard key={`${item.id}-${index}`} track={item} queue={results} index={index} />;
    }
    if (activeTab === 'artists') {
      return (
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => router.push(`/artist/${item.id}`)}
          activeOpacity={0.75}
        >
          <View style={styles.artistAvatar}>
            {item.artworkUrl || item.imageUrl ? (
              <Image source={{ uri: item.artworkUrl || item.imageUrl }} style={styles.artistAvatarImg} />
            ) : (
              <LinearGradient
                colors={[Colors.primaryDark, Colors.primary]}
                style={styles.artistAvatarImg}
              >
                <Text style={styles.artistInitial}>{item.name?.[0] || 'A'}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            {item.role && <Text style={styles.rowSub}>{item.role}</Text>}
            {item.source && (
              <Text style={styles.sourceLabel}>via {item.source}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.rowItem}
        onPress={() => router.push(`/album/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.albumThumb}>
          {item.artworkUrl ? (
            <Image source={{ uri: item.artworkUrl }} style={styles.albumThumbImg} />
          ) : (
            <LinearGradient
              colors={[Colors.bgElevated, Colors.bgCard]}
              style={styles.albumThumbImg}
            >
              <Ionicons name="albums" size={20} color={Colors.primaryLight} />
            </LinearGradient>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          {item.artist && <Text style={styles.rowSub}>{item.artist}</Text>}
          {item.year && <Text style={styles.sourceLabel}>{item.year}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Search Header */}
      <LinearGradient
        colors={[Colors.bg, Colors.bg + 'F0']}
        style={styles.searchHeader}
      >
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Search Music</Text>
          <View style={styles.catalogBadge}>
            <Ionicons name="globe-outline" size={12} color={Colors.primaryLight} />
            <Text style={styles.catalogText}>Worldwide Catalog</Text>
          </View>
        </View>

        <Animated.View style={[styles.searchBar, { borderColor }]}>
          <Ionicons name={isUrlDetected ? 'link' : 'search'} size={18} color={isUrlDetected ? Colors.success : Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search Tamil, Hindi, English, YouTube..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query, activeTab, activeFilter)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoFocus={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {isUrlDetected && (
          <View style={styles.urlNotice}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.urlNoticeText}>External link detected. Resolving high-quality audio...</Text>
          </View>
        )}

        {/* Source & Language Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {LANGUAGE_FILTERS.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  isSelected && f.color ? { borderColor: f.color } : {},
                ]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <LinearGradient
                    colors={[f.color || Colors.primary, Colors.primaryDark]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    borderRadius={Radius.full}
                  />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Tabs (Tracks / Artists / Albums) */}
      {searched && (
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.primary]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  borderRadius={Radius.full}
                />
              )}
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Result count */}
      {searched && !loading && results.length > 0 && (
        <View style={styles.resultCountRow}>
          <Text style={styles.resultCount}>
            Showing {results.length} songs {debouncedQuery ? `for "${debouncedQuery}"` : ''} · Scroll for more
          </Text>
          <Text style={styles.resultProviderBadge}>
            {activeFilter !== 'all' ? activeFilter.toUpperCase() : 'ALL SOURCES'}
          </Text>
        </View>
      )}

      {/* Content */}
      {!searched ? (
        <ScrollView contentContainerStyle={styles.discover} showsVerticalScrollIndicator={false}>
          {/* Quick Trending Suggestions */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flame" size={18} color="#F97316" />
              <Text style={styles.sectionTitle}>Trending Worldwide Hits</Text>
            </View>
            <View style={styles.tagsContainer}>
              {QUICK_TRENDING_TAGS.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.trendingTag}
                  onPress={() => {
                    setQuery(tag.query);
                    if (tag.lang) setActiveFilter(tag.lang);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trendingTagText}>{tag.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Searches */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearBtn}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {history.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={styles.historyItem}
                  onPress={() => setQuery(h)}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.historyText}>{h}</Text>
                  <Ionicons name="arrow-up-outline" size={14} color={Colors.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Browse Language & Genres */}
          <View style={styles.genresSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="musical-notes" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Explore by Language & Genre</Text>
            </View>
            <View style={styles.genreGrid}>
              {QUICK_GENRES.map((g) => {
                const color = GENRE_COLORS[g.id] || Colors.primary;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.genreCard, { borderColor: color + '40' }]}
                    onPress={() => {
                      if (g.id === 'tamil' || g.id === 'hindi' || g.id === 'english') {
                        setActiveFilter(g.id);
                        setQuery(`Top ${g.id} Songs`);
                      } else {
                        setQuery(g.name);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[color + '30', color + '10']}
                      style={StyleSheet.absoluteFill}
                      borderRadius={Radius.xl}
                    />
                    <Text style={[styles.genreCardText, { color }]}>{g.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching Tamil, Hindi, English, YouTube...</Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon="musical-notes-outline"
          title="No results found"
          subtitle={`Nothing found for "${query}". Try another song or artist name.`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item?.id || 'track'}-${i}`}
          renderItem={renderResult}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <View style={styles.footerContainer}>
              {loadingMore ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.footerText}>Loading more songs ({results.length} loaded)...</Text>
                </View>
              ) : hasMore ? (
                <View style={styles.footerBtnRow}>
                  <TouchableOpacity
                    style={[styles.loadMoreBtn, { flex: 1 }]}
                    onPress={handleLoadMore}
                    activeOpacity={0.8}
                    disabled={loadingMore}
                  >
                    <LinearGradient
                      colors={[Colors.primaryDark, Colors.bgElevated]}
                      style={styles.loadMoreGrad}
                    >
                      <Ionicons name="arrow-down-circle" size={16} color={Colors.primaryLight} />
                      <Text style={styles.loadMoreBtnText}>+80 More</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.loadMoreBtn, { flex: 1.3 }]}
                    onPress={boost500Songs}
                    activeOpacity={0.8}
                    disabled={boosting}
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#9333EA']}
                      style={styles.loadMoreGrad}
                    >
                      {boosting ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="flash" size={16} color={Colors.white} />
                          <Text style={[styles.loadMoreBtnText, { color: Colors.white }]}>
                            ⚡ Boost 500+ Songs
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.allLoadedRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primaryLight} />
                  <Text style={styles.allLoadedText}>Showing all {results.length} songs</Text>
                </View>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingTop: 48 },

  searchHeader: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
  },
  catalogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catalogText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.primaryLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  urlNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  urlNoticeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
  },

  filterScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  filterChipActive: {
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamily.semiBold,
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    overflow: 'hidden',
  },
  tabActive: {},
  tabLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.white,
  },

  resultCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
  },
  resultCount: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  resultProviderBadge: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.primaryLight,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  discover: {
    padding: Spacing.base,
    gap: Spacing.lg,
    paddingBottom: 120,
  },
  sectionWrap: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  trendingTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trendingTagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },

  historySection: {
    gap: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtn: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  genresSection: {
    gap: Spacing.sm,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  genreCard: {
    width: (width - Spacing.base * 2 - Spacing.sm) / 2,
    height: 52,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  genreCardText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    marginTop: 40,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  artistAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  albumThumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  albumThumbImg: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
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
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  sourceLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryLight,
  },

  footerContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  footerText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginVertical: 8,
  },
  loadMoreBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadMoreGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
  },
  loadMoreBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  allLoadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  allLoadedText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
