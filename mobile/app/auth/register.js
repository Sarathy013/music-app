import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';

function Field({ label, icon, value, onChange, placeholder, secure, keyboard, error }) {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[
        s.field,
        isFocused && s.fieldFocused,
        error && s.fieldErr,
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={isFocused ? Colors.primaryLight : Colors.textMuted}
        />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secure && !show}
          keyboardType={keyboard}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(!show)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={s.errText}>{error}</Text>}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!username.trim() || username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email required';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;
    const result = await register(username, email, password);
    if (result.success) router.replace('/(tabs)');
  };

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#180B35', '#080811', '#05050A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Sign up to start streaming completely free.</Text>
          </View>

          {/* Quick Google Sign Up Option */}
          <TouchableOpacity
            style={s.googlePillBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.88}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={s.googlePillText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with email</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={{ gap: Spacing.base }}>
            {error && (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={s.errBannerText}>{error}</Text>
              </View>
            )}

            <Field label="Username" icon="person-outline" value={username} onChange={setUsername} placeholder="yourname" error={errors.username} />
            <Field label="Email" icon="mail-outline" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" error={errors.email} />
            <Field label="Password" icon="lock-closed-outline" value={password} onChange={setPassword} placeholder="Min. 6 characters" secure error={errors.password} />
            <Field label="Confirm Password" icon="lock-closed-outline" value={confirm} onChange={setConfirm} placeholder="Repeat password" secure error={errors.confirm} />

            <TouchableOpacity
              style={s.submitBtn}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={s.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/login')} style={{ alignItems: 'center', marginTop: Spacing.md }}>
              <Text style={s.loginLink}>
                Already have an account? <Text style={s.loginLinkHighlight}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05050A',
  },
  container: {
    flexGrow: 1,
    padding: Spacing['2xl'],
    paddingTop: 54,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backBtn: {
    marginBottom: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 30,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#9CA3AF',
    marginTop: 6,
  },
  googlePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    gap: 10,
    marginBottom: Spacing.lg,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  googlePillText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: '#121212',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#26263A',
  },
  dividerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
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
  fieldErr: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    padding: 0,
  },
  errText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errBannerText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  submitBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  loginLink: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  loginLinkHighlight: {
    color: Colors.white,
    fontFamily: Typography.fontFamily.bold,
    textDecorationLine: 'underline',
  },
});
