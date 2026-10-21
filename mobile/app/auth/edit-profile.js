import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import Button from '../../components/Button';
import { showAlert } from '../../utils/alert';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim() || username.length < 3) {
      showAlert('Error', 'Username must be at least 3 characters.');
      return;
    }
    setLoading(true);
    const res = await updateUser({ username });
    setLoading(false);
    if (res.success) {
      showAlert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      showAlert('Error', res.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.field}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Your username"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.field, { opacity: 0.5 }]}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} />
            <TextInput style={styles.input} value={user?.email || ''} editable={false} />
          </View>
          <Button title="Save Changes" onPress={handleSave} loading={loading} size="lg" style={{ marginTop: Spacing.base }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing['2xl'], paddingTop: 60 },
  back: { marginBottom: Spacing.xl },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['2xl'], color: Colors.textPrimary, marginBottom: Spacing['2xl'] },
  form: { gap: Spacing.base },
  label: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base, color: Colors.textPrimary, padding: 0 },
});
