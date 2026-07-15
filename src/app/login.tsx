import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { GradientButton, useC } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { MovingBlobs } from '@/components/MovingBlobs';
import { Brand, Fonts, Radius, Space } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const c = useC();
  const router = useRouter();
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

  // The whole reset happens in-app on /auth/forgot-password (email → code → new
  // password). Prefill whatever they've already typed here.
  function forgotPassword() {
    router.push({ pathname: '/auth/forgot-password', params: { email: email.trim() } });
  }

  return (
    <LinearGradient colors={[Brand.purple, '#2c1d57']} style={{ flex: 1, overflow: 'hidden' }}>
      <MovingBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.form} behavior="padding">
          <View style={{ alignItems: 'center', marginBottom: Space.md }}>
            <Logo variant="full" height={88} tone="#ffffff" />
          </View>
          <Text style={styles.tagline}>The Ultimate Wedding Experience</Text>

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
            <Pressable onPress={forgotPassword} disabled={busy} hitSlop={10} style={styles.forgotBtn}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </Pressable>
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
  brandX: { color: '#fff', fontSize: 40, fontFamily: Fonts.display },
  brand: { color: '#fff', fontSize: 26, fontFamily: Fonts.display, textAlign: 'center', marginTop: Space.md },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: Space.lg },
  card: { backgroundColor: '#ffffff', borderRadius: Radius.xl, padding: Space.xl, gap: Space.md },
  input: { letterSpacing: 0, borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 14, fontSize: 16 },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
  forgotBtn: { alignSelf: 'center', marginTop: Space.xs, paddingVertical: Space.xs },
  forgot: { color: Brand.purple, fontSize: 14, fontWeight: '600' },
  help: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: Space.lg },
});
