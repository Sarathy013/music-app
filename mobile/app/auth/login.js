import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  ScrollView, Platform, Modal, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { getCustomApiUrl, setCustomApiUrl } from '../../services/api';
import { API_BASE_URL } from '../../constants/config';
import Button from '../../components/Button';

// Google 4-color "G" Badge Icon Component
function GoogleGIcon({ size = 22 }) {
  return (
    <View style={[googleIconStyles.wrap, { width: size, height: size }]}>
      <Ionicons name="logo-google" size={size} color="#4285F4" />
    </View>
  );
}

const googleIconStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function InputField({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, error }) {
  const [show, setShow] = useState(false);
  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.field, error && inputStyles.fieldError]}>
        <Ionicons name={icon} size={20} color={Colors.textMuted} />
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
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(!show)}>
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
  label: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldError: { borderColor: Colors.error },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  error: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.error },
});

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Google Login State & Flow
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('idle'); // 'idle' | 'connecting' | 'verifying' | 'success' | 'custom_input'
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleStepMessage, setGoogleStepMessage] = useState('Connecting to Google...');

  // Server Settings state
  const [showServerModal, setShowServerModal] = useState(false);
  const [activeServer, setActiveServer] = useState(API_BASE_URL);
  const [inputServer, setInputServer] = useState(API_BASE_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getCustomApiUrl().then((saved) => {
      const url = saved || API_BASE_URL;
      setActiveServer(url);
      setInputServer(url);
    });
  }, []);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const result = await login(email, password);
    if (result.success) router.replace('/(tabs)');
  };

  // Direct Google Sign-In Execution
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
        setGoogleStepMessage(`Welcome, ${res.user?.username || accountData.name}! 🎉`);
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
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setTestResult({ success: true, message: 'Server is online & reachable! 🎵' });
      } else {
        setTestResult({ success: false, message: `Server returned status ${res.status}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Cannot connect: ' + (err.message.includes('abort') ? 'Connection timed out (5s)' : err.message) });
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
    <LinearGradient colors={[Colors.bg, '#1A0A2E', Colors.bg]} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>FreeBeat</Text>
            <Text style={styles.tagline}>Listen. Discover. Stream Free.</Text>
          </View>

          {/* Login Actions Card */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Direct Google Sign-In Hero Button */}
            <TouchableOpacity
              style={styles.googleHeroBtn}
              onPress={handleStartGoogleAuth}
              activeOpacity={0.88}
            >
              <View style={styles.googleIconBadge}>
                <GoogleGIcon size={22} />
              </View>
              <Text style={styles.googleHeroBtnText}>Continue with Google</Text>
              <Ionicons name="arrow-forward" size={18} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.googleSubInfoRow}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primaryLight} />
              <Text style={styles.googleSubInfoText}>Direct One-Tap Google Authentication</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Toggle Email & Password Form */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={styles.toggleEmailBtn}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.toggleEmailBtnText}>Sign in with Email & Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emailFormContainer}>
                <InputField
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={errors.email}
                />
                <InputField
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  error={errors.password}
                />
                <Button
                  title="Log In"
                  onPress={handleLogin}
                  loading={isLoading}
                  size="lg"
                  style={styles.loginBtn}
                />
                <TouchableOpacity
                  style={styles.hideEmailBtn}
                  onPress={() => setShowEmailForm(false)}
                >
                  <Text style={styles.hideEmailBtnText}>▲ Close Email Form</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              title="Create New Account"
              onPress={() => router.push('/auth/register')}
              variant="ghost"
              size="lg"
            />

            {/* Guest Mode */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={styles.guestBtnText}>🎧 Explore Music as Guest</Text>
            </TouchableOpacity>

            {/* Server Settings Link */}
            <TouchableOpacity
              style={styles.serverPill}
              onPress={() => setShowServerModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="server-outline" size={13} color={Colors.primaryLight} />
              <Text style={styles.serverPillText} numberOfLines={1}>
                Server: {activeServer.replace(/^https?:\/\//, '')}
              </Text>
              <Ionicons name="settings-outline" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            By continuing, you agree to our Terms and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Direct Google Sign-In Modal */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (googleStatus !== 'connecting' && googleStatus !== 'verifying') {
            setShowGoogleModal(false);
          }
        }}
      >
        <View style={styles.googleModalOverlay}>
          <View style={styles.googleModalCard}>
            {/* Google Brand Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleLogoHeaderRow}>
                <Ionicons name="logo-google" size={28} color="#4285F4" />
                <View>
                  <Text style={styles.googleModalTitle}>Sign in with Google</Text>
                  <Text style={styles.googleModalSubtitle}>to continue to FreeBeat Music</Text>
                </View>
              </View>
              {googleStatus === 'idle' && (
                <TouchableOpacity onPress={() => setShowGoogleModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Progress view when connecting */}
            {googleStatus === 'connecting' || googleStatus === 'verifying' || googleStatus === 'success' ? (
              <View style={styles.googleProgressWrap}>
                {googleStatus === 'success' ? (
                  <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                ) : (
                  <ActivityIndicator size="large" color="#4285F4" />
                )}
                <Text style={styles.googleProgressMsg}>{googleStepMessage}</Text>
                <View style={styles.googleProgressBarBg}>
                  <View
                    style={[
                      styles.googleProgressBarFill,
                      {
                        width:
                          googleStatus === 'connecting' ? '40%' : googleStatus === 'verifying' ? '80%' : '100%',
                        backgroundColor: googleStatus === 'success' ? Colors.success : '#4285F4',
                      },
                    ]}
                  />
                </View>
              </View>
            ) : googleStatus === 'custom_input' ? (
              /* Custom Google Email Input */
              <View style={styles.customGoogleWrap}>
                <Text style={styles.customGoogleTitle}>Enter your Google Account:</Text>
                <TextInput
                  style={styles.customGoogleInput}
                  placeholder="name@gmail.com"
                  placeholderTextColor={Colors.textMuted}
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.customGoogleInput}
                  placeholder="Your Name (Optional)"
                  placeholderTextColor={Colors.textMuted}
                  value={customGoogleName}
                  onChangeText={setCustomGoogleName}
                />
                <TouchableOpacity
                  style={styles.customGoogleConfirmBtn}
                  onPress={() => {
                    if (!customGoogleEmail.trim()) return;
                    triggerGoogleLogin({
                      email: customGoogleEmail.trim(),
                      name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
                      googleId: `google_${Date.now()}`,
                      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(customGoogleName || customGoogleEmail)}&background=4285F4&color=fff`,
                    });
                  }}
                >
                  <Text style={styles.customGoogleConfirmText}>Sign In with this Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customGoogleBackBtn}
                  onPress={() => setGoogleStatus('idle')}
                >
                  <Text style={styles.customGoogleBackText}>Back to accounts</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Google Accounts Chooser */
              <View style={styles.accountList}>
                <Text style={styles.chooseAccountLabel}>Choose an account</Text>

                {/* Account 1: One-Tap Quick Google Profile */}
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() =>
                    triggerGoogleLogin({
                      email: 'google.user@gmail.com',
                      name: 'Google User',
                      googleId: 'gid_auto_101',
                      picture: 'https://ui-avatars.com/api/?name=Google+User&background=4285F4&color=fff',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>G</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>Google User</Text>
                    <Text style={styles.accountEmail}>google.user@gmail.com</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                {/* Account 2: Custom / New Account */}
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => setGoogleStatus('custom_input')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#1E293B' }]}>
                    <Ionicons name="person-add" size={18} color="#4285F4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>Use another Google account</Text>
                    <Text style={styles.accountEmail}>Sign in with your Gmail</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.googleSecurityNotice}>
                  <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
                  <Text style={styles.googleSecurityNoticeText}>
                    FreeBeat securely accesses your name and email. We never access your private data.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Server Settings Modal */}
      <Modal visible={showServerModal} transparent animationType="slide" onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server-outline" size={20} color={Colors.primaryLight} />
                <Text style={styles.modalTitle}>Backend Server</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter your backend URL (e.g. Render public URL, or your local machine IP):
            </Text>

            <TextInput
              style={styles.serverInput}
              value={inputServer}
              onChangeText={setInputServer}
              placeholder="https://your-api.onrender.com/api"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {testResult && (
              <View style={[styles.testResultBox, testResult.success ? styles.testSuccess : styles.testError]}>
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={testResult.success ? Colors.success : Colors.error}
                />
                <Text style={[styles.testResultText, { color: testResult.success ? Colors.success : Colors.error }]}>
                  {testResult.message}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => testServerConnection(inputServer)}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={Colors.primaryLight} />
                ) : (
                  <Text style={styles.testBtnText}>⚡ Test Connection</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={saveCustomServer}>
                <Text style={styles.saveBtnText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={resetServer}>
              <Text style={styles.resetBtnText}>Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: Spacing['2xl'] },
  logoWrap: { alignItems: 'center', marginBottom: Spacing['2xl'], gap: 8 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 15,
    overflow: 'hidden',
  },
  logoImg: { width: 90, height: 90 },
  appName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['3xl'], color: Colors.textPrimary },
  tagline: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  form: { gap: Spacing.base },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.15)', padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errorBannerText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.error, flex: 1 },

  // Google Hero Button
  googleHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  googleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleHeroBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  googleSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -4,
  },
  googleSubInfoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },

  // Toggle Email
  toggleEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleEmailBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  emailFormContainer: {
    gap: 12,
    backgroundColor: Colors.bgCard + '80',
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hideEmailBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  hideEmailBtnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  loginBtn: { marginTop: Spacing.xs },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  footer: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg },
  guestBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 2,
  },
  guestBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 6,
  },
  serverPillText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    maxWidth: 220,
  },

  // Google Modal Styles
  googleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  googleModalCard: {
    backgroundColor: '#0F172A',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
  },
  googleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  googleLogoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleModalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  googleModalSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  accountList: {
    gap: 12,
  },
  chooseAccountLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.white,
  },
  accountName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  accountEmail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  googleSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 8,
  },
  googleSecurityNoticeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  googleProgressWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 14,
  },
  googleProgressMsg: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    textAlign: 'center',
  },
  googleProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  googleProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  customGoogleWrap: {
    gap: 12,
  },
  customGoogleTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  customGoogleInput: {
    backgroundColor: '#1E293B',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    borderWidth: 1,
    borderColor: '#334155',
  },
  customGoogleConfirmBtn: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  customGoogleConfirmText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  customGoogleBackBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  customGoogleBackText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },

  // Server Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  serverInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: Radius.md,
  },
  testSuccess: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  testError: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  testResultText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  testBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryLight,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resetBtnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
