import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { musicAPI } from '../services/api';
import { usePlayer } from '../store/PlayerContext';
import TrackCard from '../components/TrackCard';
import { TrackSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const LANGUAGES = [
  { id: 'all', label: '🌐 All Languages', color: Colors.primary, badge: 'All' },
  { id: 'tamil', label: '🦁 Tamil (தமிழ்)', color: '#F97316', badge: 'Tamil' },
  { id: 'english', label: '🌍 English (Global)', color: '#38BDF8', badge: 'English' },
  { id: 'hindi', label: '🇮🇳 Hindi (हिंदी)', color: '#EAB308', badge: 'Hindi' },
  { id: 'telugu', label: '⚡ Telugu (తెలుగు)', color: '#10B981', badge: 'Telugu' },
];

const ERAS = [
  { id: 'all', label: '🎶 All Songs (Old & New)' },
  { id: 'new', label: '🔥 Latest & New Hits' },
  { id: 'old', label: '📻 Golden Classics & Old' },
];

const LANGUAGE_SEARCH_POOLS = {
  tamil: [
    'Latest Tamil Songs 2024 Anirudh',
    'AR Rahman Tamil Superhits',
    'Ilaiyaraaja 80s 90s Golden Melodies SPB',
    'Yuvan Shankar Raja Tamil Hits',
    'Harris Jayaraj Tamil Melodies',
    'Kollywood Mass Superhits Vijay Ajith',
    'Tamil Love Romantic Melodies Janaki',
    'Kuthu Dance Tamil Hits Kollywood',
    'Vidyasagar Deva 2000s Hits',
    'SP Balasubrahmanyam Tamil Classics',
    'Santhosh Narayanan Tamil Hits',
    'Classic Tamil 70s 80s TMS Susheela',
    'Tamil Melody Hits Hariharan Unni Menon',
    'Sid Sriram Tamil Melodies',
    'Tamil Folk Gana Songs',
    'Mani Ratnam Tamil Movie Songs',
    'Tamil 90s Evergreen Hits',
    'Anirudh Ravichander Mass Hits',
    'D Imman Tamil Songs',
    'Tamil Acoustic Unplugged Melodies',
  ],
  telugu: [
    'Telugu Latest Songs Tollywood 2024',
    'Devi Sri Prasad DSP Telugu Hits',
    'Thaman S Telugu Superhits',
    'Keeravani Telugu Classic Melodies',
    'SPB Telugu Golden Classics',
    'Sid Sriram Telugu Melodies',
    'Allu Arjun Mahesh Babu Telugu Hits',
    'Telugu Romantic Love Songs',
    '90s Tollywood Evergreen Songs',
    'Ghantasala Susheela Telugu Classics',
    'Telugu Mass Folk Dance Songs',
    'Telugu Cinema Superhits Chiranjeevi',
    'Mickey J Meyer Telugu Hits',
    'Pushpa Devara Telugu Hits',
    'Classic Telugu 80s Golden Hits',
    'Chitra Telugu Evergreen Melodies',
    'Telugu Melody Beats',
    'Telugu Party Beats',
    'Koti Mani Sharma Telugu Hits',
    'Tollywood Blockbuster Melodies',
  ],
  hindi: [
    'Latest Bollywood Hits 2024',
    'Arijit Singh Romantic Hits',
    'Kishore Kumar Golden Hits',
    'Lata Mangeshkar Evergreen Classics',
    '90s Bollywood Hits Alka Udit Kumar Sanu',
    'RD Burman Evergreen Hits',
    'Pritam Bollywood Superhits',
    'Sonu Nigam KK 2000s Hits',
    'Bollywood Party Dance Hits',
    'Atif Aslam Shreya Ghoshal Hits',
    'Mohammad Rafi Classic Hits',
    'Mukesh Asha Bhosle Retro Hindi',
    'Hindi Romantic Melodies 2000s',
    'Shankar Ehsaan Loy Hits',
    'Vishal Shekhar Bollywood Hits',
    'Rahman Bollywood Hindi Hits',
    'Hindi Sufi Ghazal Hits Nusrat',
    'Jagjit Singh Hindi Ghazals',
    'Punjabi Bollywood Party Hits',
    '90s Romance Bollywood Hits',
  ],
  english: [
    'Billboard Hot 100 Hits',
    'Today Top Hits Global Pop',
    'Taylor Swift The Weeknd Hits',
    'Classic 80s 90s Rock Pop Queen Michael Jackson',
    'Ed Sheeran Bruno Mars Acoustic Melodies',
    'Global Dance Pop EDM Hits Dua Lipa',
    'Hip Hop R&B Global Hits Drake',
    'Viral English Pop Hits 2024',
    'Coldplay Maroon 5 Rock Hits',
    'Retro 70s 80s English Classics Beatles',
    'Imagine Dragons Pop Rock Hits',
    'Top Global Acoustic Ballads',
    'Justin Bieber Ariana Grande Hits',
    'Billie Eilish Olivia Rodrigo Hits',
    'Post Malone English Hits',
    'Eminem Global Hip Hop',
    'Adele Sam Smith English Ballads',
    'Katy Perry Rihanna Pop Classics',
    '2000s English Pop Hits',
    '90s Boyband English Hits Backstreet',
  ],
};

export default function SeeMoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { loadAndPlay } = usePlayer();

  const [selectedLang, setSelectedLang] = useState(params.language || params.genre || 'all');
  const [selectedEra, setSelectedEra] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [languagesData, setLanguagesData] = useState({
    tamil: { newTracks: [], oldTracks: [], tracks: [] },
    english: { newTracks: [], oldTracks: [], tracks: [] },
    hindi: { newTracks: [], oldTracks: [], tracks: [] },
    telugu: { newTracks: [], oldTracks: [], tracks: [] },
  });

  const loadAllMusic = useCallback(async (era = selectedEra) => {
    try {
      setLoading(true);
      // Fetch categorized music across all 4 languages
      const res = await musicAPI.getAllLanguages(era);
      if (res?.success && res.languages) {
        setLanguagesData(res.languages);
      } else {
        // Fallback: search individual languages concurrently
        const [tamilRes, engRes, hindiRes, teluguRes] = await Promise.allSettled([
          musicAPI.search(era === 'old' ? 'Classic Tamil Old 80s 90s' : era === 'new' ? 'Latest Tamil Songs 2024' : 'Tamil Hits Anirudh Rahman', 'tracks', 20, 1, 'tamil', 'saavn'),
          musicAPI.search(era === 'old' ? 'Classic English 80s 90s Pop Rock' : era === 'new' ? 'Global Pop Hits 2024' : 'Top Global English Pop Hits', 'tracks', 20, 1, 'english', 'saavn'),
          musicAPI.search(era === 'old' ? 'Old Hindi Songs Kishore Kumar Lata' : era === 'new' ? 'Latest Hindi Songs 2024' : 'Hindi Hits Arijit Singh', 'tracks', 20, 1, 'hindi', 'saavn'),
          musicAPI.search(era === 'old' ? 'Old Telugu Songs SPB Ilaiyaraaja' : era === 'new' ? 'Latest Telugu Songs 2024' : 'Telugu Hits Tollywood', 'tracks', 20, 1, 'telugu', 'saavn'),
        ]);

        setLanguagesData({
          tamil: { title: '🦁 Tamil (தமிழ்)', tracks: tamilRes.status === 'fulfilled' ? tamilRes.value.results || [] : [] },
          english: { title: '🌍 English (Global)', tracks: engRes.status === 'fulfilled' ? engRes.value.results || [] : [] },
          hindi: { title: '🇮🇳 Hindi (हिंदी)', tracks: hindiRes.status === 'fulfilled' ? hindiRes.value.results || [] : [] },
          telugu: { title: '⚡ Telugu (తెలుగు)', tracks: teluguRes.status === 'fulfilled' ? teluguRes.value.results || [] : [] },
        });
      }
    } catch (e) {
      console.warn('See more load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEra]);

  useEffect(() => {
    loadAllMusic(selectedEra);
  }, [selectedEra]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllMusic(selectedEra);
  };

  const filterTracks = (tracksList) => {
    if (!tracksList || !Array.isArray(tracksList)) return [];
    const seen = new Set();
    const q = searchQuery.toLowerCase().trim();

    return tracksList.filter((t) => {
      if (!t || !t.id) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);

      if (!q) return true;
      return (
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q))
      );
    });
  };

  const getLanguageTracks = (langKey) => {
    const data = languagesData[langKey];
    if (!data) return [];
    if (selectedEra === 'new' && data.newTracks?.length) {
      return data.newTracks;
    }
    if (selectedEra === 'old' && data.oldTracks?.length) {
      return data.oldTracks;
    }
    return data.tracks || [];
  };

  const tamilTracks = useMemo(() => filterTracks(getLanguageTracks('tamil')), [languagesData, selectedEra, searchQuery]);
  const englishTracks = useMemo(() => filterTracks(getLanguageTracks('english')), [languagesData, selectedEra, searchQuery]);
  const hindiTracks = useMemo(() => filterTracks(getLanguageTracks('hindi')), [languagesData, selectedEra, searchQuery]);
  const teluguTracks = useMemo(() => filterTracks(getLanguageTracks('telugu')), [languagesData, selectedEra, searchQuery]);

  const allVisibleTracks = useMemo(() => {
    return [...tamilTracks, ...englishTracks, ...hindiTracks, ...teluguTracks];
  }, [tamilTracks, englishTracks, hindiTracks, teluguTracks]);

  const [langQueryIndex, setLangQueryIndex] = useState({ tamil: 0, english: 0, hindi: 0, telugu: 0 });
  const [loadingMoreLang, setLoadingMoreLang] = useState({});
  const [loadingMassiveLang, setLoadingMassiveLang] = useState({});
  const [boostingAll, setBoostingAll] = useState(false);

  const loadMoreLanguageSongs = async (langKey) => {
    if (loadingMoreLang[langKey]) return;
    setLoadingMoreLang((prev) => ({ ...prev, [langKey]: true }));
    try {
      const pool = LANGUAGE_SEARCH_POOLS[langKey] || [];
      const currentIdx = langQueryIndex[langKey] || 0;
      const q1 = pool[currentIdx % pool.length];
      const q2 = pool[(currentIdx + 1) % pool.length];

      const [r1, r2] = await Promise.allSettled([
        musicAPI.search(q1, 'tracks', 50, 1, langKey, 'saavn'),
        musicAPI.search(q2, 'tracks', 50, 1, langKey, 'saavn'),
      ]);

      const additions = [
        ...(r1.status === 'fulfilled' ? r1.value?.results || [] : []),
        ...(r2.status === 'fulfilled' ? r2.value?.results || [] : []),
      ];

      if (additions.length > 0) {
        setLanguagesData((prev) => {
          const current = prev[langKey] || {};
          const existing = current.tracks || [];
          const seen = new Set(existing.map((t) => t.id));
          const newUnique = additions.filter((t) => t && t.id && !seen.has(t.id));
          return {
            ...prev,
            [langKey]: {
              ...current,
              tracks: [...existing, ...newUnique],
            },
          };
        });
        setLangQueryIndex((prev) => ({ ...prev, [langKey]: currentIdx + 2 }));
      }
    } catch (e) {
      console.warn('Load more lang error:', e.message);
    } finally {
      setLoadingMoreLang((prev) => ({ ...prev, [langKey]: false }));
    }
  };

  const loadMassive1000Songs = async (langKey) => {
    if (loadingMassiveLang[langKey]) return;
    setLoadingMassiveLang((prev) => ({ ...prev, [langKey]: true }));
    try {
      const pool = LANGUAGE_SEARCH_POOLS[langKey] || [];
      const queriesToRun = pool.slice(0, 14);
      const promises = queriesToRun.map((q) =>
        musicAPI.search(q, 'tracks', 50, 1, langKey, 'saavn')
      );
      const results = await Promise.allSettled(promises);
      const additions = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value?.results || []);

      if (additions.length > 0) {
        setLanguagesData((prev) => {
          const current = prev[langKey] || {};
          const existing = current.tracks || [];
          const seen = new Set(existing.map((t) => t.id));
          const newUnique = additions.filter((t) => t && t.id && !seen.has(t.id));
          return {
            ...prev,
            [langKey]: {
              ...current,
              tracks: [...existing, ...newUnique],
            },
          };
        });
      }
    } catch (e) {
      console.warn('Load massive error:', e.message);
    } finally {
      setLoadingMassiveLang((prev) => ({ ...prev, [langKey]: false }));
    }
  };

  const boostAllTo1000 = async () => {
    if (boostingAll) return;
    setBoostingAll(true);
    try {
      await Promise.allSettled([
        loadMassive1000Songs('tamil'),
        loadMassive1000Songs('english'),
        loadMassive1000Songs('hindi'),
        loadMassive1000Songs('telugu'),
      ]);
    } finally {
      setBoostingAll(false);
    }
  };

  const playSection = (tracks) => {
    if (tracks && tracks.length > 0) {
      loadAndPlay(tracks[0], tracks, 0);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Navigation & Title Bar */}
      <LinearGradient colors={[Colors.primaryDark, Colors.bg]} style={styles.topBar}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.mainTitle}>Explore All Music</Text>
            <Text style={styles.subtitle}>Tamil · English · Hindi · Telugu (Old & New)</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Tamil, English, Hindi, Telugu songs..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Language Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langPillsScroll}>
          {LANGUAGES.map((lang) => {
            const isActive = selectedLang === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  isActive && { borderColor: lang.color },
                ]}
                onPress={() => setSelectedLang(lang.id)}
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
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Era Selector Pills (All / New / Old) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraPillsScroll}>
          {ERAS.map((era) => {
            const isActive = selectedEra === era.id;
            return (
              <TouchableOpacity
                key={era.id}
                style={[styles.eraPill, isActive && styles.eraPillActive]}
                onPress={() => setSelectedEra(era.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.eraPillText, isActive && styles.eraPillTextActive]}>
                  {era.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Main Content List */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TrackSkeleton key={i} />
            ))}
          </View>
        ) : (
          <>
            {/* 1,000 SONGS PER LANGUAGE POWER BANNER */}
            <View style={styles.boostBanner}>
              <LinearGradient
                colors={['#4C1D95', '#7C3AED', '#2563EB']}
                style={styles.boostBannerGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.boostBannerLeft}>
                  <View style={styles.boostTitleBadge}>
                    <Ionicons name="sparkles" size={14} color="#FDE047" />
                    <Text style={styles.boostBannerTitle}>Massive 1,000 Songs Catalog</Text>
                  </View>
                  <Text style={styles.boostBannerSub}>
                    🦁 Tamil: {tamilTracks.length} · 🌍 English: {englishTracks.length} · 🇮🇳 Hindi: {hindiTracks.length} · ⚡ Telugu: {teluguTracks.length}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.boostBannerBtn}
                  onPress={boostAllTo1000}
                  disabled={boostingAll}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.boostBtnGrad}>
                    {boostingAll ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="flash" size={14} color={Colors.white} />
                        <Text style={styles.boostBannerBtnText}>Boost All</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* 1. TAMIL SONGS SECTION */}
            {(selectedLang === 'all' || selectedLang === 'tamil') && (
              <View style={styles.languageSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.langDot, { backgroundColor: '#F97316' }]} />
                    <View>
                      <Text style={styles.sectionTitle}>🦁 Tamil Songs (தமிழ்)</Text>
                      <Text style={styles.sectionSub}>Kollywood Hits · Anirudh · AR Rahman · Ilaiyaraaja · SPB</Text>
                    </View>
                  </View>
                  {tamilTracks.length > 0 && (
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSection(tamilTracks)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#F97316', '#EA580C']} style={styles.playAllGrad}>
                        <Ionicons name="play" size={14} color={Colors.white} />
                        <Text style={styles.playAllText}>Play All ({tamilTracks.length})</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {tamilTracks.length === 0 ? (
                  <EmptyState icon="musical-notes" title="No Tamil songs found" subtitle="Try adjusting your search query." />
                ) : (
                  tamilTracks.map((track, idx) => (
                    <TrackCard key={`${track.id || 'tamil'}-${idx}`} track={track} queue={tamilTracks} index={idx} />
                  ))
                )}
                {tamilTracks.length > 0 && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1 }]}
                      onPress={() => loadMoreLanguageSongs('tamil')}
                      disabled={loadingMoreLang['tamil']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#F97316', '#EA580C']} style={styles.langLoadMoreGrad}>
                        {loadingMoreLang['tamil'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="arrow-down-circle" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>+100 Tamil</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1.3 }]}
                      onPress={() => loadMassive1000Songs('tamil')}
                      disabled={loadingMassiveLang['tamil']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.langLoadMoreGrad}>
                        {loadingMassiveLang['tamil'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="flash" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>⚡ Load 1000 Tamil</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 2. ENGLISH SONGS SECTION */}
            {(selectedLang === 'all' || selectedLang === 'english') && (
              <View style={styles.languageSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.langDot, { backgroundColor: '#38BDF8' }]} />
                    <View>
                      <Text style={styles.sectionTitle}>🌍 English Songs (Global Pop & Classics)</Text>
                      <Text style={styles.sectionSub}>Billboard Top 100 · Taylor Swift · The Weeknd · Retro Pop Rock</Text>
                    </View>
                  </View>
                  {englishTracks.length > 0 && (
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSection(englishTracks)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#38BDF8', '#0284C7']} style={styles.playAllGrad}>
                        <Ionicons name="play" size={14} color={Colors.white} />
                        <Text style={styles.playAllText}>Play All ({englishTracks.length})</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {englishTracks.length === 0 ? (
                  <EmptyState icon="musical-notes" title="No English songs found" subtitle="Try adjusting your search query." />
                ) : (
                  englishTracks.map((track, idx) => (
                    <TrackCard key={`${track.id || 'eng'}-${idx}`} track={track} queue={englishTracks} index={idx} />
                  ))
                )}
                {englishTracks.length > 0 && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1 }]}
                      onPress={() => loadMoreLanguageSongs('english')}
                      disabled={loadingMoreLang['english']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#38BDF8', '#0284C7']} style={styles.langLoadMoreGrad}>
                        {loadingMoreLang['english'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="arrow-down-circle" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>+100 English</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1.3 }]}
                      onPress={() => loadMassive1000Songs('english')}
                      disabled={loadingMassiveLang['english']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.langLoadMoreGrad}>
                        {loadingMassiveLang['english'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="flash" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>⚡ Load 1000 English</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 3. HINDI SONGS SECTION */}
            {(selectedLang === 'all' || selectedLang === 'hindi') && (
              <View style={styles.languageSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.langDot, { backgroundColor: '#EAB308' }]} />
                    <View>
                      <Text style={styles.sectionTitle}>🇮🇳 Hindi Songs (हिंदी)</Text>
                      <Text style={styles.sectionSub}>Bollywood Blockbusters · Arijit Singh · Kishore Kumar · Lata Mangeshkar</Text>
                    </View>
                  </View>
                  {hindiTracks.length > 0 && (
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSection(hindiTracks)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#EAB308', '#CA8A04']} style={styles.playAllGrad}>
                        <Ionicons name="play" size={14} color={Colors.white} />
                        <Text style={styles.playAllText}>Play All ({hindiTracks.length})</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {hindiTracks.length === 0 ? (
                  <EmptyState icon="musical-notes" title="No Hindi songs found" subtitle="Try adjusting your search query." />
                ) : (
                  hindiTracks.map((track, idx) => (
                    <TrackCard key={`${track.id || 'hindi'}-${idx}`} track={track} queue={hindiTracks} index={idx} />
                  ))
                )}
                {hindiTracks.length > 0 && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1 }]}
                      onPress={() => loadMoreLanguageSongs('hindi')}
                      disabled={loadingMoreLang['hindi']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#EAB308', '#CA8A04']} style={styles.langLoadMoreGrad}>
                        {loadingMoreLang['hindi'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="arrow-down-circle" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>+100 Hindi</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1.3 }]}
                      onPress={() => loadMassive1000Songs('hindi')}
                      disabled={loadingMassiveLang['hindi']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.langLoadMoreGrad}>
                        {loadingMassiveLang['hindi'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="flash" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>⚡ Load 1000 Hindi</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 4. TELUGU SONGS SECTION */}
            {(selectedLang === 'all' || selectedLang === 'telugu') && (
              <View style={styles.languageSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.langDot, { backgroundColor: '#10B981' }]} />
                    <View>
                      <Text style={styles.sectionTitle}>⚡ Telugu Songs (తెలుగు)</Text>
                      <Text style={styles.sectionSub}>Tollywood Hits · Devi Sri Prasad · Thaman S · SPB · Ilaiyaraaja</Text>
                    </View>
                  </View>
                  {teluguTracks.length > 0 && (
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSection(teluguTracks)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#10B981', '#059669']} style={styles.playAllGrad}>
                        <Ionicons name="play" size={14} color={Colors.white} />
                        <Text style={styles.playAllText}>Play All ({teluguTracks.length})</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {teluguTracks.length === 0 ? (
                  <EmptyState icon="musical-notes" title="No Telugu songs found" subtitle="Try adjusting your search query." />
                ) : (
                  teluguTracks.map((track, idx) => (
                    <TrackCard key={`${track.id || 'telugu'}-${idx}`} track={track} queue={teluguTracks} index={idx} />
                  ))
                )}
                {teluguTracks.length > 0 && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1 }]}
                      onPress={() => loadMoreLanguageSongs('telugu')}
                      disabled={loadingMoreLang['telugu']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#10B981', '#059669']} style={styles.langLoadMoreGrad}>
                        {loadingMoreLang['telugu'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="arrow-down-circle" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>+100 Telugu</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.langLoadMoreBtn, { flex: 1.3 }]}
                      onPress={() => loadMassive1000Songs('telugu')}
                      disabled={loadingMassiveLang['telugu']}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.langLoadMoreGrad}>
                        {loadingMassiveLang['telugu'] ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <>
                            <Ionicons name="flash" size={16} color={Colors.white} />
                            <Text style={styles.langLoadMoreText}>⚡ Load 1000 Telugu</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Total count footer */}
            <View style={styles.footerInfo}>
              <Ionicons name="sparkles" size={16} color={Colors.primaryLight} />
              <Text style={styles.footerText}>
                Showing {allVisibleTracks.length} tracks across Tamil, English, Hindi & Telugu
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    paddingTop: 48,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  mainTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  langPillsScroll: {
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  filterPillActive: {
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  eraPillsScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  eraPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  eraPillActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryLight,
  },
  eraPillText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  eraPillTextActive: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 130,
    paddingTop: Spacing.sm,
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  languageSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  langDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playAllBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  playAllGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  playAllText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 11,
    color: Colors.white,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  langLoadMoreBtn: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  langLoadMoreGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
  },
  langLoadMoreText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.white,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xs,
  },
  boostBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  boostBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  boostBannerLeft: {
    flex: 1,
  },
  boostTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boostBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  boostBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#DDD6FE',
    marginTop: 4,
  },
  boostBannerBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  boostBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boostBannerBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.white,
  },
});
