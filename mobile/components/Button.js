import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

import { LinearGradient } from 'expo-linear-gradient';

export default function Button({
  title,
  onPress,
  variant = 'primary',  // primary | secondary | ghost | danger
  size = 'md',          // sm | md | lg
  loading = false,
  disabled = false,
  icon = null,
  style,
  textStyle,
}) {
  const isPrimary = variant === 'primary';
  const buttonStyle = [
    styles.base,
    !isPrimary && styles[variant],
    styles[`size_${size}`],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    textStyle,
  ];

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
  ) : (
    <View style={styles.content}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={labelStyle}>{title}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.65}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[Colors.primary, Colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
      ) : null}
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientFill: {
    borderRadius: Radius.full,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    marginRight: 4,
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.error,
  },

  // Sizes
  size_sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  size_md: { paddingVertical: 12, paddingHorizontal: 24, minHeight: 48 },
  size_lg: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 56 },

  // Labels
  label: {
    fontFamily: Typography.fontFamily.semibold,
  },
  label_primary: { color: Colors.white },
  label_secondary: { color: Colors.textPrimary },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.white },

  labelSize_sm: { fontSize: Typography.fontSize.sm },
  labelSize_md: { fontSize: Typography.fontSize.base },
  labelSize_lg: { fontSize: Typography.fontSize.md },

  disabled: { opacity: 0.5 },
});
