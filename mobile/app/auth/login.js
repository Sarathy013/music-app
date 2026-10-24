import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { getCustomApiUrl, setCustomApiUrl } from '../../services/api';
import { API_BASE_URL } from '../../constants/config';
import Button from '../../components/Button';

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
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

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
            <LinearGradient colors={[Colors.primary, Colors.accentGlow]} style={styles.logo}>
              <Text style={styles.logoEmoji}>🎵</Text>
            </LinearGradient>
            <Text style={styles.appName}>FreeBeat</Text>
            <Text style={styles.tagline}>Welcome back</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
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
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Button
              title="Create Account"
              onPress={() => router.push('/auth/register')}
              variant="ghost"
              size="lg"
            />
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
  logoWrap: { alignItems: 'center', marginBottom: Spacing['3xl'], gap: 10 },
  logo: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 15,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['3xl'], color: Colors.textPrimary },
  tagline: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  form: { gap: Spacing.base },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.15)', padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errorBannerText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.error, flex: 1 },
  loginBtn: { marginTop: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  footer: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  guestBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 4,
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
    marginTop: 8,
  },
  serverPillText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    maxWidth: 220,
  },
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
    gap: 10,
    marginTop: 4,
  },
  testBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryLight,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },
  resetBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  resetBtnText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
