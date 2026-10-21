import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { usePlayer } from '../store/PlayerContext';
import { SLEEP_TIMER_OPTIONS } from '../constants/config';

function formatCountdown(ms) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function SleepTimerModal({ visible, onClose }) {
  const { setSleepTimer, sleepTimerMinutes, sleepTimerEndsAt } = usePlayer();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Live countdown
  useEffect(() => {
    if (!sleepTimerEndsAt) {
      setCountdown(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = sleepTimerEndsAt - Date.now();
      if (remaining <= 0) {
        setCountdown(null);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  const handleSelect = (minutes) => {
    setSleepTimer(minutes);
    if (minutes === 0) return;
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="moon" size={20} color={Colors.primaryLight} />
            </View>
            <View>
              <Text style={styles.title}>Sleep Timer</Text>
              {countdown !== null ? (
                <Text style={styles.countdown}>Stops in {formatCountdown(countdown)}</Text>
              ) : (
                <Text style={styles.subtitle}>Pause music after a set time</Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Timer options */}
        <ScrollView contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
          {SLEEP_TIMER_OPTIONS.map((minutes) => {
            const isActive = sleepTimerMinutes === minutes && minutes !== 0;
            const isOff = minutes === 0;

            return (
              <TouchableOpacity
                key={minutes}
                style={[styles.option, isActive && styles.optionActive, isOff && sleepTimerMinutes !== 0 && styles.optionOff]}
                onPress={() => handleSelect(minutes)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[Colors.primaryDark, Colors.primary]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                ) : null}
                <Ionicons
                  name={isOff ? 'close-circle-outline' : 'moon-outline'}
                  size={16}
                  color={isActive ? Colors.white : isOff && sleepTimerMinutes !== 0 ? Colors.error : Colors.textSecondary}
                />
                <Text style={[
                  styles.optionText,
                  isActive && styles.optionTextActive,
                  isOff && sleepTimerMinutes !== 0 && styles.optionTextOff,
                ]}>
                  {minutes === 0 ? 'Off' : minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
                </Text>
                {isActive && <Ionicons name="checkmark-circle" size={16} color={Colors.white} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.noteText}>Music will fade out and pause after the selected time.</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  countdown: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionActive: {
    borderColor: Colors.primary,
  },
  optionOff: {
    borderColor: Colors.error + '40',
  },
  optionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.white,
  },
  optionTextOff: {
    color: Colors.error,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
  },
  noteText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
