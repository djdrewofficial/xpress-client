import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';

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
      setIg(s.instagram ?? '');
      setTt(s.tiktok ?? '');
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
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <KeyboardProvider>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: c.bg, borderColor: c.border }]}>
            {step === 1 ? (
              <>
                <Text style={styles.emoji}>📸</Text>
                <Text style={[styles.title, { color: c.text }]}>Let&apos;s connect!</Text>
                <Text style={[styles.sub, { color: c.textSecondary }]}>
                  Share your Instagram &amp; TikTok so we can tag you and feature your big day.
                </Text>

                <View style={{ gap: Space.sm, marginTop: Space.lg }}>
                  <Field label="Instagram" value={ig} onChange={setIg} c={c} />
                  <Field label="TikTok" value={tt} onChange={setTt} c={c} />
                </View>

                <Pressable onPress={() => resolve(false)} disabled={busy} style={[styles.primary, { backgroundColor: Brand.purple, opacity: busy ? 0.7 : 1 }]}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Save</Text>}
                </Pressable>
                <Pressable onPress={() => resolve(true)} disabled={busy} hitSlop={8} style={styles.skip}>
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

                <View style={{ gap: Space.sm, marginTop: Space.lg }}>
                  {state.company_instagram ? (
                    <Pressable onPress={() => Linking.openURL(state.company_instagram!)} style={[styles.follow, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
                      <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>📷  Follow on Instagram</Text>
                    </Pressable>
                  ) : null}
                  {state.company_tiktok ? (
                    <Pressable onPress={() => Linking.openURL(state.company_tiktok!)} style={[styles.follow, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
                      <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>🎵  Follow on TikTok</Text>
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
      </KeyboardProvider>
    </Modal>
  );
}

function Field({ label, value, onChange, c }: { label: string; value: string; onChange: (v: string) => void; c: ReturnType<typeof useC> }) {
  return (
    <View style={[styles.inputWrap, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Text style={{ color: c.textTertiary, fontWeight: '700', fontSize: 13, width: 78 }}>{label}</Text>
      <Text style={{ color: c.textTertiary, fontSize: 15 }}>@</Text>
      <TextInput
        style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 12 }}
        value={value.replace(/^@+/, '')}
        onChangeText={onChange}
        placeholder="yourhandle"
        placeholderTextColor={c.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000bb', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  card: { width: '100%', maxWidth: 420, borderRadius: Radius.xl, borderWidth: 1, padding: Space.xl, alignItems: 'center' },
  emoji: { fontSize: 38 },
  title: { fontSize: 24, fontFamily: Fonts.display, marginTop: Space.sm },
  sub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md },
  primary: { width: '100%', borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: Space.lg },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: Space.md, padding: 6 },
  follow: { width: '100%', borderWidth: 1, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
});
