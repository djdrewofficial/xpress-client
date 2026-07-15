import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { GradientButton, useC } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { MovingBlobs } from '@/components/MovingBlobs';
import { Brand, Radius, Space } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

/* In-app password reset — no deep link. We ask XOS to email a branded 8-digit
   code, verify it with Supabase (verifyOtp type "recovery"), then set the new
   password. Three steps, all on this one screen. */

type Phase = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const c = useC();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState((params.email ?? '').toString());
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError(null);
    setNotice(null);
    const addr = email.trim();
    if (!addr) return setError('Enter your email.');
    const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
    if (!base) return setError('App is not configured. Please try again later.');
    setBusy(true);
    try {
      const res = await fetch(`${base}/api/mobile/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setPhase('code');
      setNotice(`If ${addr} has an account, an 8-digit code is on its way.`);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  async function verifyCode() {
    setError(null);
    setNotice(null);
    const token = code.trim();
    if (token.length < 8) return setError('Enter the 8-digit code from your email.');
    setBusy(true);
    // Match the lowercased address XOS generated the code for.
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'recovery' });
    setBusy(false);
    if (e) return setError('That code is invalid or expired. Double-check it or send a new one.');
    setPhase('password');
  }

  async function updatePassword() {
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords don’t match.');
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    if (e) {
      setBusy(false);
      return setError(e.message);
    }
    // verifyOtp already signed us in; the new password is now set.
    router.replace('/');
  }

  const title = phase === 'email' ? 'Reset your password' : phase === 'code' ? 'Enter your code' : 'Set a new password';
  const subtitle =
    phase === 'email'
      ? "Enter your email and we'll send you a code."
      : phase === 'code'
        ? `We emailed an 8-digit code to ${email.trim()}.`
        : 'Choose a new password for your account.';

  return (
    <LinearGradient colors={[Brand.purple, '#2c1d57']} style={{ flex: 1, overflow: 'hidden' }}>
      <MovingBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.form} behavior="padding">
          <View style={{ alignItems: 'center', marginBottom: Space.md }}>
            <Logo variant="full" height={64} tone="#ffffff" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.card}>
            {phase === 'email' && (
              <TextInput
                style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
                placeholder="Email"
                placeholderTextColor={c.textTertiary}
                autoCapitalize="none"
                autoFocus
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={sendCode}
              />
            )}

            {phase === 'code' && (
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: c.cardAlt, color: c.text }]}
                placeholder="00000000"
                placeholderTextColor={c.textTertiary}
                keyboardType="number-pad"
                autoFocus
                maxLength={8}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
                onSubmitEditing={verifyCode}
              />
            )}

            {phase === 'password' && (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: c.cardAlt, color: c.text }]}
                  placeholder="New password"
                  placeholderTextColor={c.textTertiary}
                  secureTextEntry
                  autoFocus
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
                  onSubmitEditing={updatePassword}
                />
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}

            {phase === 'email' && (
              <GradientButton label={busy ? 'Sending…' : 'Send code'} onPress={sendCode} disabled={busy} style={{ marginTop: Space.sm }} />
            )}
            {phase === 'code' && (
              <>
                <GradientButton label={busy ? 'Verifying…' : 'Verify'} onPress={verifyCode} disabled={busy} style={{ marginTop: Space.sm }} />
                <Pressable onPress={sendCode} disabled={busy} hitSlop={10} style={styles.linkBtn}>
                  <Text style={styles.link}>Resend code</Text>
                </Pressable>
              </>
            )}
            {phase === 'password' && (
              <GradientButton label={busy ? 'Saving…' : 'Update password'} onPress={updatePassword} disabled={busy} style={{ marginTop: Space.sm }} />
            )}
          </View>

          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Text style={styles.back}>Back to sign in</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, justifyContent: 'center', paddingHorizontal: Space.xl, gap: Space.md },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 14, textAlign: 'center', marginBottom: Space.md, paddingHorizontal: Space.md },
  card: { backgroundColor: '#ffffff', borderRadius: Radius.xl, padding: Space.xl, gap: Space.md },
  input: { letterSpacing: 0, borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 14, fontSize: 16 },
  codeInput: { textAlign: 'center', fontSize: 26, fontWeight: '700', letterSpacing: 6 },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 14 },
  notice: { color: '#0f8f70', textAlign: 'center', fontSize: 14 },
  linkBtn: { alignSelf: 'center', marginTop: Space.xs, paddingVertical: Space.xs },
  link: { color: Brand.purple, fontSize: 14, fontWeight: '600' },
  backBtn: { alignSelf: 'center', marginTop: Space.lg, paddingVertical: Space.xs },
  back: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
});
