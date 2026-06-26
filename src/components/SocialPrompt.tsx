import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Brand, Fonts, Radius, Space } from '@/lib/theme';
import { getSocialPromptState, saveSocialHandles, type SocialPromptState } from '@/lib/social';

const cleanHandle = (s: string) => s.trim().replace(/^@+/, '');

export function SocialPrompt() {
  const c = useC();
  const { session } = useAuth();
  const [state, setState] = useState<SocialPromptState | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [ig, setIg] = useState('');
  const [tt, setTt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getSocialPromptState().then((s) => {
      if (cancelled || !s?.should_show) return;
      setIg(cleanHandle(s.instagram ?? ''));
      setTt(cleanHandle(s.tiktok ?? ''));
      setState(s);
    });
    return () => { cancelled = true; };
  }, [session]);

  if (!state) return null;

  const hasFollow = !!(state.company_instagram || state.company_tiktok);

  const resolve = async (skip: boolean) => {
    setBusy(true);
    await saveSocialHandles(skip ? null : cleanHandle(ig) || null, skip ? null : cleanHandle(tt) || null);
    setBusy(false);
    if (hasFollow) setStep(2);
    else setState(null);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.bg, borderColor: c.border }]}>
          {step === 1 ? (
            <>
              <Text style={styles.emoji}>📸</Text>
              <Text style={[styles.title, { color: c.text }]}>Let&apos;s connect!</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Share your Instagram &amp; TikTok so we can tag you and feature your big day.
              </Text>

              <View style={styles.fields}>
                <Field label="Instagram" value={ig} onChange={setIg} c={c} />
                <Field label="TikTok" value={tt} onChange={setTt} c={c} />
              </View>

              <Pressable onPress={() => resolve(false)} disabled={busy} style={[styles.primary, { backgroundColor: Brand.purple, opacity: busy ? 0.7 : 1 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Save</Text>}
              </Pressable>
              <Pressable onPress={() => resolve(true)} disabled={busy} hitSlop={10} style={styles.skip}>
                <Text style={{ color: c.textTertiary, fontSize: 14, fontWeight: '600' }}>I don&apos;t have these</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>✨</Text>
              <Text style={[styles.title, { color: c.text }]}>Follow along!</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Follow us for inspo, real weddings, and behind-the-scenes.
              </Text>

              <View style={styles.fields}>
                {state.company_instagram ? (
                  <Pressable onPress={() => Linking.openURL(state.company_instagram!)} style={[styles.followBtn, { backgroundColor: '#E1306C' }]}>
                    <Text style={styles.followTxt}>📷  Follow on Instagram</Text>
                  </Pressable>
                ) : null}
                {state.company_tiktok ? (
                  <Pressable onPress={() => Linking.openURL(state.company_tiktok!)} style={[styles.followBtn, { backgroundColor: '#111' }]}>
                    <Text style={styles.followTxt}>🎵  Follow on TikTok</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable onPress={() => setState(null)} style={[styles.primary, { backgroundColor: Brand.purple }]}>
                <Text style={styles.primaryTxt}>Done</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChange, c }: { label: string; value: string; onChange: (v: string) => void; c: ReturnType<typeof useC> }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={[styles.fieldLab, { color: c.textTertiary }]}>{label.toUpperCase()}</Text>
      <View style={[styles.inputWrap, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
        <Text style={{ color: c.textTertiary, fontSize: 16, fontWeight: '600' }}>@</Text>
        <TextInput
          style={[styles.input, { color: c.text }]}
          value={value}
          onChangeText={(t) => onChange(t.replace(/^@+/, ''))}
          placeholder="yourhandle"
          placeholderTextColor={c.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000bb', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  card: { width: '100%', maxWidth: 420, borderRadius: Radius.xl, borderWidth: 1, padding: Space.xl, alignItems: 'center' },
  emoji: { fontSize: 40 },
  title: { fontSize: 25, fontFamily: Fonts.display, marginTop: Space.sm },
  sub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  fields: { width: '100%', gap: Space.md, marginTop: Space.lg },
  fieldLab: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, height: 50 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  primary: { width: '100%', borderRadius: Radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: Space.lg },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: Space.md, padding: 8 },
  followBtn: { width: '100%', borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center' },
  followTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
