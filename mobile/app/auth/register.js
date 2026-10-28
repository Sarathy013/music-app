import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import Button from '../../components/Button';

function Field({ label, icon, value, onChange, placeholder, secure, keyboard, error }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.field, error && s.fieldErr]}>
        <Ionicons name={icon} size={20} color={Colors.textMuted} />
        <TextInput
          style={s.input} value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={Colors.textMuted}
          secureTextEntry={secure && !show} keyboardType={keyboard}
          autoCapitalize="none" autoCorrect={false}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(!show)}>
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
    <LinearGradient colors={[Colors.bg, '#1A0A2E', Colors.bg]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join FreeBeat — it&apos;s completely free.</Text>
          </View>

          <View style={{ gap: Spacing.base }}>
            {error && (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={s.errBannerText}>{error}</Text>
              </View>
            )}
            <Field label="Username" icon="person-outline" value={username} onChange={setUsername} placeholder="coolname" error={errors.username} />
            <Field label="Email" icon="mail-outline" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" error={errors.email} />
            <Field label="Password" icon="lock-closed-outline" value={password} onChange={setPassword} placeholder="Min. 6 characters" secure error={errors.password} />
            <Field label="Confirm Password" icon="lock-closed-outline" value={confirm} onChange={setConfirm} placeholder="Repeat password" secure error={errors.confirm} />
            <Button title="Create Account" onPress={handleRegister} loading={isLoading} size="lg" style={{ marginTop: Spacing.sm }} />
            <TouchableOpacity onPress={() => router.push('/auth/login')} style={{ alignItems: 'center', marginTop: Spacing.sm }}>
              <Text style={s.loginLink}>Already have an account? <Text style={{ color: Colors.primaryLight }}>Log in</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing['2xl'], paddingTop: 60 },
  header: { marginBottom: Spacing['2xl'] },
  backBtn: { marginBottom: Spacing.lg },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['3xl'], color: Colors.textPrimary },
  subtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textSecondary, marginTop: 4 },
  label: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  fieldErr: { borderColor: Colors.error },
  input: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textPrimary, padding: 0 },
  errText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.error },
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.15)', padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errBannerText: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.error },
  loginLink: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
});
