import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { usePlayer } from '../../store/PlayerContext';
import { historyAPI } from '../../services/api';
import { STORAGE_KEYS, EQ_PRESETS, APP_NAME, APP_TAGLINE } from '../../constants/config';
import { showAlert } from '../../utils/alert';
import SleepTimerModal from '../../components/SleepTimerModal';

function SettingRow({ icon, iconColor, label, onPress, value, isSwitch, rightText, danger, badge }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={isSwitch ? undefined : onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger, { backgroundColor: (iconColor || Colors.primary) + '20' }]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.error : (iconColor || Colors.primaryLight)} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {badge && (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {rightText && <Text style={styles.rowRightText}>{rightText}</Text>}
        {isSwitch ? (
          <Switch
            value={value}
            onValueChange={onPress}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const EQ_PRESET_KEYS = Object.keys(EQ_PRESETS);

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { sleepTimerMinutes, eqPreset, setEqPreset } = usePlayer();

  const [autoplay, setAutoplay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [selectedEq, setSelectedEq] = useState(eqPreset || 'flat');

  const handleLogout = () => {
    showAlert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const clearSearchHistory = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    showAlert('Cleared', 'Search history cleared.');
  };

  const clearListeningHistory = async () => {
    showAlert('Clear History', 'This will remove all your listening history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await historyAPI.clear();
          showAlert('Done', 'Listening history cleared.');
        },
      },
    ]);
  };

  const cycleEqPreset = () => {
    const idx = EQ_PRESET_KEYS.indexOf(selectedEq);
    const next = EQ_PRESET_KEYS[(idx + 1) % EQ_PRESET_KEYS.length];
    setSelectedEq(next);
    setEqPreset && setEqPreset(next);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <LinearGradient
        colors={[Colors.primaryDark + '80', Colors.bg + '00']}
        style={styles.profileGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.profileCard}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
          ) : (
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{(user?.username?.[0] || 'V').toUpperCase()}</Text>
            </LinearGradient>
          )}
          <Text style={styles.username}>{user?.username || 'Music Lover'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.authProvider === 'google' && (
            <View style={styles.googleBadge}>
              <Ionicons name="logo-google" size={12} color="#4285F4" />
              <Text style={styles.googleBadgeText}>Google Account</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/auth/edit-profile')}
          >
            <Ionicons name="pencil" size={13} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Account */}
      <SectionCard title="ACCOUNT">
        <SettingRow
          icon="person-outline"
          iconColor={Colors.primary}
          label="Edit Profile"
          onPress={() => router.push('/auth/edit-profile')}
        />
        <SettingRow
          icon="lock-closed-outline"
          iconColor={Colors.teal}
          label="Change Password"
          onPress={() => router.push('/auth/change-password')}
        />
      </SectionCard>

      {/* Playback */}
      <SectionCard title="PLAYBACK">
        <SettingRow
          icon="play-circle-outline"
          iconColor={Colors.primary}
          label="Autoplay"
          isSwitch
          value={autoplay}
          onPress={setAutoplay}
        />
        <SettingRow
          icon="git-merge-outline"
          iconColor={Colors.teal}
          label="Crossfade"
          isSwitch
          value={crossfade}
          onPress={setCrossfade}
        />
        <SettingRow
          icon="musical-note-outline"
          iconColor={Colors.warning}
          label="Audio Quality"
          rightText="High"
          onPress={() => showAlert('Audio Quality', 'High quality (192kbps) streaming is enabled.')}
        />
        <SettingRow
          icon="options-outline"
          iconColor={Colors.accent}
          label="Equalizer"
          rightText={EQ_PRESETS[selectedEq]?.name || 'Flat'}
          onPress={cycleEqPreset}
        />
        <SettingRow
          icon="moon-outline"
          iconColor={Colors.info}
          label="Sleep Timer"
          rightText={sleepTimerMinutes > 0 ? `${sleepTimerMinutes} min` : 'Off'}
          badge={sleepTimerMinutes > 0 ? `${sleepTimerMinutes}m` : undefined}
          onPress={() => setShowSleepTimer(true)}
        />
      </SectionCard>

      {/* Music Sources */}
      <SectionCard title="MUSIC SOURCES">
        <View style={styles.sourcesBox}>
          <View style={styles.sourceItem}>
            <View style={[styles.sourceIcon, { backgroundColor: Colors.teal + '20' }]}>
              <Ionicons name="musical-notes" size={18} color={Colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>Jamendo</Text>
              <Text style={styles.sourceDesc}>Creative Commons music · All genres</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
          <View style={[styles.sourceItem, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 0, paddingTop: Spacing.md }]}>
            <View style={[styles.sourceIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
              <Ionicons name="library" size={18} color={Colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>Musopen</Text>
              <Text style={styles.sourceDesc}>Public Domain classical music</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      {/* Privacy */}
      <SectionCard title="PRIVACY">
        <SettingRow
          icon="search-outline"
          iconColor={Colors.primary}
          label="Clear Search History"
          onPress={clearSearchHistory}
        />
        <SettingRow
          icon="time-outline"
          iconColor={Colors.textMuted}
          label="Clear Listening History"
          onPress={clearListeningHistory}
        />
      </SectionCard>

      {/* About */}
      <SectionCard title="ABOUT">
        <SettingRow
          icon="information-circle-outline"
          iconColor={Colors.info}
          label="App Version"
          rightText="2.0.0"
          onPress={() => {}}
        />
        <SettingRow
          icon="document-text-outline"
          iconColor={Colors.textMuted}
          label="Terms of Service"
          onPress={() => {}}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          iconColor={Colors.success}
          label="Privacy Policy"
          onPress={() => {}}
        />
      </SectionCard>

      {/* Logout */}
      <View style={[styles.section, { paddingHorizontal: Spacing.base }]}>
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.footerLogoImg}
          resizeMode="contain"
        />
        <Text style={styles.footerTitle}>{APP_NAME}</Text>
        <Text style={styles.footerTagline}>{APP_TAGLINE}</Text>
        <Text style={styles.footerNote}>
          Music sourced from Jamendo (CC) & Musopen (PD){'\n'}
          All music is free, ad-free, and legally licensed.
        </Text>
      </View>

      <View style={{ height: 60 }} />

      <SleepTimerModal visible={showSleepTimer} onClose={() => setShowSleepTimer(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingTop: 52 },
  content: { paddingBottom: 40 },

  profileGradient: {},
  profileCard: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
    gap: 6,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadow.lg,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#4285F4',
    ...Shadow.lg,
  },
  avatarText: { fontFamily: Typography.fontFamily.bold, fontSize: 40, color: Colors.white },
  username: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xl, color: Colors.textPrimary },
  email: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  googleBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: '#60A5FA',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.bgGlass,
  },
  editBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.primary },

  section: { marginBottom: Spacing.md, paddingHorizontal: Spacing.base },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: 'rgba(239,68,68,0.15)' },
  rowLabel: { flex: 1, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  rowLabelDanger: { color: Colors.error },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRightText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  badgePill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },

  sourcesBox: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sourceIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  sourceDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  activeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  activeBadgeText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Colors.success,
  },

  footer: {
    marginHorizontal: Spacing.base,
    padding: Spacing.xl,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  footerLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 6,
  },
  footerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  footerTagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryLight,
  },
  footerNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
