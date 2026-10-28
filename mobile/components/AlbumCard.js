import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { usePlayer } from '../store/PlayerContext';

import { useRouter } from 'expo-router';

function AlbumCardComponent({ item, onPress, style, size = 'md' }) {
  const { loadAndPlay, currentTrack } = usePlayer();
  const router = useRouter();
  const isLarge = size === 'lg';
  const cardSize = isLarge ? 170 : 148;
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const isActive = currentTrack?.album === (item?.name || item?.title);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else if (item?.streamUrl) {
      loadAndPlay(item, [item], 0);
    } else if (item?.id) {
      router.push(`/album/${item.id}`);
    }
  };

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, { width: cardSize }, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        <View style={[styles.artworkWrap, { width: cardSize, height: cardSize }, isActive && styles.activeArtwork]}>
          {item.artworkUrl || item.coverImage ? (
            <Image
              source={{ uri: item.artworkUrl || item.coverImage }}
              style={styles.artwork}
            />
          ) : (
            <LinearGradient
              colors={[Colors.primaryDark, Colors.primary, Colors.accent]}
              style={styles.artwork}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={isLarge ? 40 : 32} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,18,0.8)']}
            style={styles.gradientOverlay}
          />
          {item.source && (
            <View style={[styles.sourceBadge, { backgroundColor: item.source === 'jamendo' ? Colors.teal + 'DD' : Colors.primaryDark + 'DD' }]}>
              <Text style={styles.sourceText}>
                {item.source === 'jamendo' ? (item.license === 'Creative Commons' ? 'CC' : 'Jamendo') : item.source === 'musopen' ? 'Classical' : item.source}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {item.name || item.title}
        </Text>
        {item.artist && (
          <Text style={styles.artist} numberOfLines={1}>
            {item.artist}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const AlbumCard = React.memo(AlbumCardComponent);
export default AlbumCard;

const styles = StyleSheet.create({
  card: {
    marginRight: Spacing.md,
  },
  artworkWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  activeArtwork: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  artwork: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.xl,
  },
  sourceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
  },
  sourceText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  artist: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
