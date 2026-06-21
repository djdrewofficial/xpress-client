import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { GradientButton, useC } from '@/components/ui';
import { Brand, Fonts, Radius, Space } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

/** Parse #fragment (or ?query) params from a deep link URL. */
function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  for (const kv of raw.split('&')) {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

type Phase = 'loading' | 'form' | 'error' | 'saving';

export default function SetPasswordScreen() {
  const c = useC();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function handle(url: string | null) {
      if (!url) return;
      const p = parseParams(url);
      if (p.access_token && p.refresh_token) {
        const { error: e } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
        if (mounted) setPhase(e ? 'error' : 'form');
      } else {
        const { data } = await supabase.auth.getSession();
        if (mounted) setPhase(data.session ? 'form' : 'error');
      }
    }
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => { mounted = false; sub.remove(); };
  }, []);

  async function save() {
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords don’t match.');
    setPhase('saving');
    const { error: e } = await supabase.auth.updateUser({ password });
    if (e) {
      setError(e.message);
      setPhase('form');
      return;
    }
    router.replace('/');
  }

  return (
    <LinearGradient colors={[Brand.purple, '#2c1d57']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.brand}>Set your password</Text>
          <Text style={styles.tagline}>Welcome to Xpress Entertainment</Text>

          {phase === 'loading' ? (
            <ActivityIndicator color="#fff" style={{ marginTop: Space.xl }} />
          ) : phase === 'error' ? (
            <View style={styles.card}>
              <Text style={{ color: c.textSecondary, textAlign: 'center' }}>
                This link has expired or is invalid. Ask your DJ to resend your invitation.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <TextInput
                style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
                placeholder="New password"
                placeholderTextColor={c.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
                placeholder="Confirm password"
                placeholderTextColor={c.textTertiary}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                onSubmitEditing={save}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <GradientButton label={phase === 'saving' ? 'Saving…' : 'Set password & continue'} onPress={save} disabled={phase === 'saving'} style={{ marginTop: Space.sm }} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Space.xl, gap: Space.md },
  brand: { color: '#fff', fontSize: 26, fontFamily: Fonts.display, textAlign: 'center' },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: Space.lg },
  card: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: Space.xl, gap: Space.md },
  input: { borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 14, fontSize: 16 },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
});
