import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BOTTOM_TAB_HEIGHT, MINI_PLAYER_HEIGHT } from '../../constants/theme';
import MiniPlayer from '../../components/MiniPlayer';
import { usePlayer } from '../../store/PlayerContext';

function TabIcon({ name, focused }) {
  return focused ? (
    <View style={styles.activeIconWrap}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.activeIconBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={name} size={20} color={Colors.white} />
      </LinearGradient>
    </View>
  ) : (
    <Ionicons name={`${name}-outline`} size={22} color={Colors.textMuted} />
  );
}

export default function TabsLayout() {
  const { currentTrack } = usePlayer();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primaryLight,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: {
            fontFamily: Typography.fontFamily.medium,
            fontSize: 10,
            marginBottom: 2,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.tabBarBg]}>
              <View style={styles.tabBarTopBorder} />
            </View>
          ),
        }}
        sceneContainerStyle={{
          paddingBottom: currentTrack ? BOTTOM_TAB_HEIGHT + MINI_PLAYER_HEIGHT + 14 : BOTTOM_TAB_HEIGHT,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ focused }) => <TabIcon name="library" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  tabBar: {
    height: BOTTOM_TAB_HEIGHT,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabBarBg: {
    backgroundColor: Colors.bgCard + 'F8',
  },
  tabBarTopBorder: {
    height: 0.5,
    backgroundColor: Colors.border,
  },
  activeIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconBg: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
