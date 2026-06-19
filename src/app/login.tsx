import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientButton, useC } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { Brand, Radius, Space } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const c = useC();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (e) setError(e.message);
    setBusy(false);
  }

  return (
    <LinearGradient colors={[Brand.purple, '#2c1d57']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ alignItems: 'center', marginBottom: Space.md }}>
            <Logo variant="full" height={54} tone="#ffffff" />
          </View>
          <Text style={styles.tagline}>Plan your perfect night</Text>

          <View style={styles.card}>
            <TextInput
              style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
              placeholder="Email"
              placeholderTextColor={c.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
              placeholder="Password"
              placeholderTextColor={c.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={signIn}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <GradientButton label={busy ? '' : 'Sign in'} onPress={signIn} disabled={busy} style={{ marginTop: Space.sm }} />
            {busy && <ActivityIndicator color={Brand.purple} style={{ marginTop: -38 }} />}
          </View>

          <Text style={styles.help}>Use the invite link we emailed you to set your password.</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, justifyContent: 'center', paddingHorizontal: Space.xl, gap: Space.md },
  brandMark: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#000', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  brandX: { color: '#fff', fontSize: 34, fontWeight: '800' },
  brand: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: Space.md },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: Space.lg },
  card: { backgroundColor: '#ffffff', borderRadius: Radius.xl, padding: Space.xl, gap: Space.md },
  input: { borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 14, fontSize: 16 },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
  help: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: Space.lg },
});
