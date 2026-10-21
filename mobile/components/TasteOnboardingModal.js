import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@vibestream_taste_preferences';

export const LANGUAGES = [
  { id: 'tamil', label: '🦁 Tamil', color: '#F97316' },
  { id: 'telugu', label: '⚡ Telugu', color: '#10B981' },
  { id: 'hindi', label: '🇮🇳 Hindi', color: '#EAB308' },
  { id: 'english', label: '🌍 English', color: '#38BDF8' },
  { id: 'all', label: '🌐 All Languages', color: Colors.primary },
];

export const MOODS = [
  { id: 'happy', label: '😄 Happy & Upbeat', color: '#22C55E', query: 'Upbeat Happy Dance Party Hits' },
  { id: 'sad', label: '💔 Sad & Emotional', color: '#6366F1', query: 'Sad Melody Heartbreak Emotional' },
  { id: 'romantic', label: '💖 Romantic & Love', color: '#EC4899', query: 'Romantic Love Melodies' },
  { id: 'chill', label: '🌙 Chill & Relaxing', color: '#8B5CF6', query: 'Acoustic Lo-fi Chill Relaxing' },
  { id: 'mix', label: '🔥 All-Kind Mix', color: Colors.primary, query: 'Top Mega Hit Songs Best Mix' },
];

export async function getUserPreferences() {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function TasteOnboardingModal({ visible, onComplete, onClose }) {
  const [selectedLangs, setSelectedLangs] = useState(['tamil', 'english']);
  const [selectedMoods, setSelectedMoods] = useState(['happy', 'romantic']);

  const toggleLanguage = (id) => {
    if (id === 'all') {
      setSelectedLangs(['all']);
      return;
    }
    const filtered = selectedLangs.filter((l) => l !== 'all');
    if (filtered.includes(id)) {
      if (filtered.length > 1) {
        setSelectedLangs(filtered.filter((l) => l !== id));
      }
    } else {
      setSelectedLangs([...filtered, id]);
    }
  };

  const toggleMood = (id) => {
    if (id === 'mix') {
      setSelectedMoods(['mix']);
      return;
    }
    const filtered = selectedMoods.filter((m) => m !== 'mix');
    if (filtered.includes(id)) {
      if (filtered.length > 1) {
        setSelectedMoods(filtered.filter((m) => m !== id));
      }
    } else {
      setSelectedMoods([...filtered, id]);
    }
  };

  const handleFinish = async () => {
    const pref = {
      languages: selectedLangs,
      moods: selectedMoods,
      completedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(pref));
    onComplete(pref);
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      handleFinish();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={[Colors.primaryDark, Colors.bgElevated, Colors.bgCard]}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top Bar with Badge & Back / Close Button */}
            <View style={styles.topRow}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color={Colors.primaryLight} />
                <Text style={styles.badgeText}>CUSTOMIZE YOUR TASTE</Text>
              </View>

              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.backCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>What music do you love?</Text>
            <Text style={styles.subtitle}>
              Pick your favorite languages and listening moods to personalize your music feed & recommendations.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
              {/* Question 1: Languages */}
              <Text style={styles.sectionLabel}>1. Which languages do you like?</Text>
              <View style={styles.pillGrid}>
                {LANGUAGES.map((lang) => {
                  const active = selectedLangs.includes(lang.id);
                  return (
                    <TouchableOpacity
                      key={lang.id}
                      style={[
                        styles.pill,
                        active && { backgroundColor: lang.color + '26', borderColor: lang.color },
                      ]}
                      onPress={() => toggleLanguage(lang.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, active && { color: lang.color, fontFamily: Typography.fontFamily.bold }]}>
                        {lang.label}
                      </Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={16} color={lang.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Question 2: Moods */}
              <Text style={styles.sectionLabel}>2. What's your usual music mood?</Text>
              <View style={styles.pillGrid}>
                {MOODS.map((mood) => {
                  const active = selectedMoods.includes(mood.id);
                  return (
                    <TouchableOpacity
                      key={mood.id}
                      style={[
                        styles.pill,
                        active && { backgroundColor: mood.color + '26', borderColor: mood.color },
                      ]}
                      onPress={() => toggleMood(mood.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, active && { color: mood.color, fontFamily: Typography.fontFamily.bold }]}>
                        {mood.label}
                      </Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={16} color={mood.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Actions with Back Button & Save Button */}
            <View style={styles.bottomBtnRow}>
              <TouchableOpacity style={styles.backTextBtn} onPress={handleDismiss} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={16} color={Colors.textMuted} />
                <Text style={styles.backTextBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleFinish} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitText}>Save & Start 🚀</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.35)',
  },
  cardGradient: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderRadius: Radius.full,
  },
  backCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.primaryLight,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  scrollArea: {
    maxHeight: 320,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  bottomBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  backTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backTextBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
});
