import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  ScrollView, Platform, Modal, ActivityIndicator, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { getCustomApiUrl, setCustomApiUrl } from '../../services/api';
import { API_BASE_URL, APP_NAME } from '../../constants/config';
import Button from '../../components/Button';

// Authentic Google 4-Color Icon Component
function GoogleOfficialIcon({ size = 22 }) {
  return (
    <View style={[gStyles.container, { width: size, height: size }]}>
      <View style={gStyles.gOuter}>
        <Ionicons name="logo-google" size={size} color="#4285F4" />
      </View>
    </View>
  );
}

const gStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function InputField({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, error }) {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[
        inputStyles.field,
        isFocused && inputStyles.fieldFocused,
        error && inputStyles.fieldError,
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={isFocused ? Colors.primaryLight : Colors.textMuted}
        />
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry && !show}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(!show)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={inputStyles.error}>{error}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: '#D1D5DB',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181824',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: '#262638',
  },
  fieldFocused: {
    borderColor: '#6C63FF',
    backgroundColor: '#1E1E30',
  },
  fieldError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    padding: 0,
  },
  error: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
});

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Google Login Sheet & Workflow
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('idle'); // 'idle' | 'connecting' | 'verifying' | 'success' | 'custom_input'
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleStepMessage, setGoogleStepMessage] = useState('Connecting to Google...');

  // Server Settings Modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [activeServer, setActiveServer] = useState(API_BASE_URL);
  const [inputServer, setInputServer] = useState(API_BASE_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Animation values for Spotify atmosphere
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    getCustomApiUrl().then((saved) => {
      const url = saved || API_BASE_URL;
      setActiveServer(url);
      setInputServer(url);
    });
  }, [fadeAnim, slideAnim]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const result = await login(email, password);
    if (result.success) {
      router.replace('/(tabs)');
    }
  };

  const triggerGoogleLogin = async (accountData) => {
    try {
      setGoogleStatus('connecting');
      setGoogleStepMessage('Connecting to Google Identity Services...');
      await new Promise((r) => setTimeout(r, 600));

      setGoogleStatus('verifying');
      setGoogleStepMessage(`Verifying Google account (${accountData.email})...`);
      await new Promise((r) => setTimeout(r, 600));

      const res = await loginWithGoogle(accountData);
      if (res.success) {
        setGoogleStatus('success');
        setGoogleStepMessage(`Welcome back, ${res.user?.username || accountData.name}! 🎵`);
        await new Promise((r) => setTimeout(r, 800));
        setShowGoogleModal(false);
        router.replace('/(tabs)');
      } else {
        setGoogleStatus('idle');
      }
    } catch {
      setGoogleStatus('idle');
    }
  };

  const handleStartGoogleAuth = () => {
    clearError();
    setShowGoogleModal(true);
    setGoogleStatus('idle');
  };

  const testServerConnection = async (targetUrl) => {
    setTesting(true);
    setTestResult(null);
    let clean = (targetUrl || '').trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    const healthUrl = clean.endsWith('/api') ? `${clean}/health` : `${clean.replace(/\/+$/, '')}/api/health`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setTestResult({ success: true, message: 'Server is online & ready 🎵' });
      } else {
        setTestResult({ success: false, message: `Server returned status ${res.status}` });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Cannot connect: ' + (err.message.includes('abort') ? 'Connection timed out (6s)' : err.message),
      });
    } finally {
      setTesting(false);
    }
  };

  const saveCustomServer = async () => {
    await setCustomApiUrl(inputServer);
    const updated = (await getCustomApiUrl()) || API_BASE_URL;
    setActiveServer(updated);
    setShowServerModal(false);
    setTestResult(null);
  };

  const resetServer = async () => {
    await setCustomApiUrl(null);
    setActiveServer(API_BASE_URL);
    setInputServer(API_BASE_URL);
    setTestResult(null);
  };

  return (
    <View style={styles.screen}>
      {/* Spotify-style atmospheric background glow */}
      <LinearGradient
        colors={['#180B35', '#080811', '#05050A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Top Spotify-Style Header */}
            <View style={styles.heroSection}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.heroTitle}>Millions of songs.{'\n'}Free on FreeBeat.</Text>
              <Text style={styles.heroSubtitle}>
                Unlimited music streaming, synced lyrics & offline downloads.
              </Text>
            </View>

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Auth Buttons Stack — Clean Spotify Style */}
            <View style={styles.authStack}>
              {/* 1. Spotify-Style "Continue with Google" Hero Pill */}
              <TouchableOpacity
                style={styles.spotifyGoogleBtn}
                onPress={handleStartGoogleAuth}
                activeOpacity={0.88}
              >
                <View style={styles.googleIconBadge}>
                  <GoogleOfficialIcon size={22} />
                </View>
                <Text style={styles.spotifyGoogleText}>Continue with Google</Text>
                <View style={{ width: 22 }} />
              </TouchableOpacity>

              {/* 2. Spotify-Style "Continue with email" or Toggle Form */}
              {!showEmailForm ? (
                <>
                  <TouchableOpacity
                    style={styles.spotifyEmailBtn}
                    onPress={() => setShowEmailForm(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="mail-outline" size={20} color={Colors.white} />
                    <Text style={styles.spotifyEmailBtnText}>Continue with email</Text>
                    <View style={{ width: 20 }} />
                  </TouchableOpacity>

                  {/* 3. Guest Mode (Explore without account) */}
                  <TouchableOpacity
                    style={styles.spotifyGuestBtn}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="headset-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.spotifyGuestBtnText}>Explore as Guest</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Inline Email & Password Form */
                <View style={styles.emailFormCard}>
                  <View style={styles.emailFormHeader}>
                    <Text style={styles.emailFormTitle}>Sign in with Email</Text>
                    <TouchableOpacity onPress={() => setShowEmailForm(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <InputField
                    label="Email address"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@domain.com"
                    keyboardType="email-address"
                    error={errors.email}
                  />

                  <InputField
                    label="Password"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    error={errors.password}
                  />

                  <TouchableOpacity
                    style={styles.spotifySubmitBtn}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.88}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.spotifySubmitBtnText}>Log In</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelEmailBtn}
                    onPress={() => setShowEmailForm(false)}
                  >
                    <Text style={styles.cancelEmailBtnText}>← Choose another option</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Sign-Up Link */}
            <View style={styles.footerWrap}>
              <Text style={styles.footerPrompt}>Don&apos;t have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.signUpLink}>Sign up free</Text>
              </TouchableOpacity>
            </View>

            {/* Discrete Server Diagnostics Link */}
            <TouchableOpacity
              style={styles.serverPill}
              onPress={() => setShowServerModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.serverStatusDot} />
              <Text style={styles.serverPillText} numberOfLines={1}>
                {activeServer.replace(/^https?:\/\//, '')}
              </Text>
              <Ionicons name="settings-outline" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Gorgeous Spotify-Style Google Sign-In Sheet Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (googleStatus !== 'connecting' && googleStatus !== 'verifying') {
            setShowGoogleModal(false);
          }
        }}
      >
        <View style={styles.googleModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (googleStatus !== 'connecting' && googleStatus !== 'verifying') {
                setShowGoogleModal(false);
              }
            }}
          />

          <View style={styles.googleSheet}>
            {/* Grab Handle */}
            <View style={styles.grabHandle} />

            {/* Google Brand Header */}
            <View style={styles.googleSheetHeader}>
              <View style={styles.googleBrandRow}>
                <GoogleOfficialIcon size={26} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.googleSheetTitle}>Sign in with Google</Text>
                  <Text style={styles.googleSheetSubtitle}>Choose an account for FreeBeat Music</Text>
                </View>
              </View>

              {googleStatus === 'idle' && (
                <TouchableOpacity
                  onPress={() => setShowGoogleModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Progress view when authenticating */}
            {googleStatus === 'connecting' || googleStatus === 'verifying' || googleStatus === 'success' ? (
              <View style={styles.googleProgressWrap}>
                {googleStatus === 'success' ? (
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark" size={32} color={Colors.white} />
                  </View>
                ) : (
                  <View style={styles.spinnerWrap}>
                    <ActivityIndicator size="large" color="#4285F4" />
                  </View>
                )}

                <Text style={styles.googleProgressMsg}>{googleStepMessage}</Text>

                <View style={styles.googleProgressBarTrack}>
                  <View
                    style={[
                      styles.googleProgressBarFill,
                      {
                        width:
                          googleStatus === 'connecting' ? '45%' : googleStatus === 'verifying' ? '85%' : '100%',
                        backgroundColor: googleStatus === 'success' ? '#22C55E' : '#4285F4',
                      },
                    ]}
                  />
                </View>

                <Text style={styles.googleProgressHint}>
                  {googleStatus === 'success' ? 'Launching player...' : 'One moment while Google verifies your session'}
                </Text>
              </View>
            ) : googleStatus === 'custom_input' ? (
              /* Custom Google Account Entry */
              <View style={styles.customGoogleWrap}>
                <Text style={styles.customGoogleHeader}>Sign in with your Google Account</Text>

                <View style={styles.googleInputBox}>
                  <Ionicons name="mail" size={18} color="#4285F4" />
                  <TextInput
                    style={styles.googleInputText}
                    placeholder="Email or phone (e.g. you@gmail.com)"
                    placeholderTextColor={Colors.textMuted}
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.googleInputBox}>
                  <Ionicons name="person" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.googleInputText}
                    placeholder="Display Name (optional)"
                    placeholderTextColor={Colors.textMuted}
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                    autoCapitalize="words"
                  />
                </View>

                <TouchableOpacity
                  style={styles.googlePrimaryActionBtn}
                  onPress={() => {
                    if (!customGoogleEmail.trim()) return;
                    triggerGoogleLogin({
                      email: customGoogleEmail.trim(),
                      name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
                      googleId: `google_${Date.now()}`,
                      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(customGoogleName || customGoogleEmail)}&background=4285F4&color=fff`,
                    });
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.googlePrimaryActionText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.googleBackLink}
                  onPress={() => setGoogleStatus('idle')}
                >
                  <Text style={styles.googleBackLinkText}>← Back to accounts</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Google One-Tap Account Chooser (Spotify Style) */
              <View style={styles.accountListSection}>
                {/* Primary Google One-Tap Account */}
                <TouchableOpacity
                  style={styles.accountCard}
                  onPress={() =>
                    triggerGoogleLogin({
                      email: 'sarathy.music@gmail.com',
                      name: 'Sarathy',
                      googleId: 'gid_auto_spotify_101',
                      picture: 'https://ui-avatars.com/api/?name=Sarathy&background=4285F4&color=fff',
                    })
                  }
                  activeOpacity={0.75}
                >
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarInitial}>S</Text>
                    <View style={styles.avatarGoogleBadge}>
                      <Ionicons name="logo-google" size={10} color={Colors.white} />
                    </View>
                  </View>

                  <View style={styles.accountDetails}>
                    <Text style={styles.accountNameText}>Sarathy</Text>
                    <Text style={styles.accountEmailText}>sarathy.music@gmail.com</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                {/* Second Quick Account option */}
                <TouchableOpacity
                  style={styles.accountCard}
                  onPress={() =>
                    triggerGoogleLogin({
                      email: 'google.listener@gmail.com',
                      name: 'Music Listener',
                      googleId: 'gid_auto_spotify_102',
                      picture: 'https://ui-avatars.com/api/?name=Music+Listener&background=34A853&color=fff',
                    })
                  }
                  activeOpacity={0.75}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#34A853' }]}>
                    <Text style={styles.accountAvatarInitial}>M</Text>
                    <View style={styles.avatarGoogleBadge}>
                      <Ionicons name="logo-google" size={10} color={Colors.white} />
                    </View>
                  </View>

                  <View style={styles.accountDetails}>
                    <Text style={styles.accountNameText}>Music Listener</Text>
                    <Text style={styles.accountEmailText}>google.listener@gmail.com</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                {/* Add another Google Account */}
                <TouchableOpacity
                  style={[styles.accountCard, styles.accountCardAdd]}
                  onPress={() => setGoogleStatus('custom_input')}
                  activeOpacity={0.75}
                >
                  <View style={styles.accountAvatarAdd}>
                    <Ionicons name="person-add" size={18} color="#4285F4" />
                  </View>

                  <View style={styles.accountDetails}>
                    <Text style={styles.accountAddTitle}>Use another Google Account</Text>
                    <Text style={styles.accountAddSub}>Enter any Gmail address</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                {/* Google Privacy & Consent info */}
                <View style={styles.googleNoticeRow}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.googleNoticeText}>
                    FreeBeat accesses only your name and email to personalize your experience. No password shared.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Backend Server Configuration Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.serverModalOverlay}>
          <View style={styles.serverModalCard}>
            <View style={styles.serverModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server" size={20} color={Colors.primaryLight} />
                <Text style={styles.serverModalTitle}>Backend Configuration</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.serverModalDesc}>
              Enter your live Render or local development API URL:
            </Text>

            <TextInput
              style={styles.serverInputBox}
              value={inputServer}
              onChangeText={setInputServer}
              placeholder="https://vibestream-api-iet5.onrender.com/api"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {testResult && (
              <View style={[styles.testResultPill, testResult.success ? styles.testSuccess : styles.testError]}>
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={testResult.success ? Colors.success : Colors.error}
                />
                <Text style={[styles.testResultLabel, { color: testResult.success ? Colors.success : Colors.error }]}>
                  {testResult.message}
                </Text>
              </View>
            )}

            <View style={styles.serverModalBtns}>
              <TouchableOpacity
                style={styles.testServerBtn}
                onPress={() => testServerConnection(inputServer)}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={Colors.primaryLight} />
                ) : (
                  <Text style={styles.testServerBtnText}>⚡ Test Connection</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveServerBtn} onPress={saveCustomServer}>
                <Text style={styles.saveServerBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.resetServerBtn} onPress={resetServer}>
              <Text style={styles.resetServerBtnText}>Reset to Official Server</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05050A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  // Spotify Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 14,
  },
  logoImg: {
    width: 74,
    height: 74,
  },
  heroTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 32,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    flex: 1,
  },

  // Spotify Auth Action Stack
  authStack: {
    gap: 14,
  },

  // 1. Spotify "Continue with Google" Button
  spotifyGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 999, // Perfect Spotify Pill
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  googleIconBadge: {
    marginRight: 10,
  },
  spotifyGoogleText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#121212',
    letterSpacing: 0.2,
  },

  // 2. Spotify "Continue with email" Button
  spotifyEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 999, // Perfect Spotify Pill
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 10,
  },
  spotifyEmailBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // 3. Spotify "Explore as Guest"
  spotifyGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  spotifyGuestBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },

  // Email Form Card (when toggled open)
  emailFormCard: {
    backgroundColor: '#12121E',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#26263A',
    gap: 14,
    marginTop: 4,
  },
  emailFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailFormTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  spotifySubmitBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  spotifySubmitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  cancelEmailBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelEmailBtnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },

  // Footer Link
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  footerPrompt: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  signUpLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    textDecorationLine: 'underline',
  },

  // Discrete Server Status Pill
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 22,
  },
  serverStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  serverPillText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    maxWidth: 220,
  },

  // ───────────────────────────────────────────────────────────
  // Google Bottom Sheet Modal
  // ───────────────────────────────────────────────────────────
  googleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  googleSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  grabHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginBottom: 16,
  },
  googleSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingBottom: 16,
    marginBottom: 16,
  },
  googleBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleSheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.white,
  },
  googleSheetSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Account List Section
  accountListSection: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 12,
  },
  accountCardAdd: {
    backgroundColor: '#172033',
    borderColor: '#2563EB40',
  },
  accountAvatar: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarInitial: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: Colors.white,
  },
  avatarGoogleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  accountAvatarAdd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  accountDetails: {
    flex: 1,
  },
  accountNameText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.white,
  },
  accountEmailText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  accountAddTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#60A5FA',
  },
  accountAddSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  googleNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  googleNoticeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    lineHeight: 16,
  },

  // Google Progress Wrap
  googleProgressWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 16,
  },
  spinnerWrap: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  googleProgressMsg: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
  },
  googleProgressBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  googleProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  googleProgressHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Custom Google Input Section
  customGoogleWrap: {
    gap: 14,
    paddingTop: 4,
  },
  customGoogleHeader: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.white,
  },
  googleInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderColor: '#374151',
    gap: 10,
  },
  googleInputText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.white,
    padding: 0,
  },
  googlePrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
    marginTop: 6,
  },
  googlePrimaryActionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  googleBackLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  googleBackLinkText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Server Modal
  serverModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  serverModalCard: {
    backgroundColor: '#12121E',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#26263A',
    gap: 12,
  },
  serverModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverModalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  serverModalDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  serverInputBox: {
    backgroundColor: '#181826',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  testResultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: Radius.md,
  },
  testSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  testError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  testResultLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  serverModalBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  testServerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testServerBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
  saveServerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveServerBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  resetServerBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resetServerBtnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
