import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';

function GlowOrb({ animation, style, duration, delay = 0 }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animation) {
      const fadeOut = Animated.timing(progress, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      });
      fadeOut.start();
      return () => fadeOut.stop();
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animation, delay, duration, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
          ],
        },
      ]}
    />
  );
}

export default function MusicBackdrop({ isPlaying = false }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[Colors.primaryDark + 'DD', '#0E0922', Colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      <GlowOrb
        animation={isPlaying}
        duration={6200}
        style={styles.topOrb}
      />
      <GlowOrb
        animation={isPlaying}
        duration={7800}
        delay={500}
        style={styles.bottomOrb}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  topOrb: {
    top: 110,
    right: -120,
    backgroundColor: Colors.primary,
  },
  bottomOrb: {
    bottom: 80,
    left: -150,
    backgroundColor: Colors.accent,
  },
});
