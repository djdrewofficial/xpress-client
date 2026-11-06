import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, useC } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  clipboardOfferPending,
  httpsJoinToken,
  markClipboardOffered,
  redeemEventLink,
  tokenFromJoinUrl,
} from '@/lib/eventLinks';
import { formatJoinEntry, redeemJoinCode } from '@/lib/joinCode';
import { rememberMembership } from '@/lib/membership';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';

function failureKey(status: number, kind: 'link' | 'code'): TranslationKey {
  if (status === 429) return 'joinEvent.rate';
  if (status === 503 || status === 501 || status === 0) return 'joinEvent.setup';
  if (status === 403) return 'joinEvent.forbidden';
  if (status === 400 || status === 404) return kind === 'link' ? 'joinEvent.badLink' : 'joinEvent.badCode';
  return 'joinEvent.generic';
}

export function JoinEventScreen({
  initialError,
  onJoined,
}: {
  initialError?: TranslationKey | null;
  onJoined: (eventId: string, role: string) => Promise<void>;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { session, signOut, reloadProfile } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState<TranslationKey | null>(initialError ?? null);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await clipboardOfferPending())) return;
      const text = await Clipboard.getStringAsync().catch(() => '');
      const token = httpsJoinToken(text);
      if (cancelled) return;
      if (token) setOffer(token);
      else await markClipboardOffered();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismissOffer() {
    setOffer(null);
    await markClipboardOffered();
  }

  async function useClipboard() {
    const token = offer;
    setOffer(null);
    await markClipboardOffered();
    if (!token) {
      setError('joinEvent.emptyClipboard');
      return;
    }
    const next = `https://xos.xpressdjs.com/j/${token}`;
    setValue(next);
    await submit(next);
  }

  async function submit(raw?: string) {
    if (busy) return;
    const entry = (raw ?? value).trim();
    const linkToken = tokenFromJoinUrl(entry);
    const compact = entry.replace(/[^A-Za-z0-9]/g, '');
    if (!linkToken && compact.length < 8) {
      setError('joinEvent.badCode');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = linkToken ? await redeemEventLink(linkToken) : await redeemJoinCode(entry);
      if (!result.ok) {
        if (result.status === 400 || result.status === 404) {
          // A bad token should not keep retrying itself.
        }
        setError(failureKey(result.status, linkToken ? 'link' : 'code'));
        return;
      }
      if (session?.user.id) await rememberMembership(session.user.id, result.data.eventId, result.data.role);
      await onJoined(result.data.eventId, result.data.role);
      await reloadProfile();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
            gap: 16,
          }}>
          <Text style={[Type.largeTitle, { color: c.ink }]}>{t('joinEvent.title')}</Text>
          <Text style={[Type.body, { color: c.ink2 }]}>{t('joinEvent.help')}</Text>
          {offer ? (
            <View style={[styles.offer, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[Type.callout, { color: c.ink }]}>{t('joinEvent.clipboard')}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={useClipboard} hitSlop={8}>
                  <Text style={[Type.subhead, { color: c.accent }]}>{t('joinEvent.use')}</Text>
                </Pressable>
                <Pressable onPress={dismissOffer} hitSlop={8}>
                  <Text style={[Type.subhead, { color: c.ink3 }]}>{t('joinEvent.notNow')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={(next) => {
              setValue(formatJoinEntry(next));
              setError(null);
            }}
            placeholder={t('joinEvent.ph')}
            placeholderTextColor={c.ink3}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }]}
            accessibilityLabel={t('joinEvent.title')}
          />
          {error ? <Text style={[Type.footnote, { color: c.redInk }]}>{t(error)}</Text> : null}
          <Button label={busy ? t('joinEvent.joining') : t('joinEvent.submit')} onPress={() => submit()} disabled={busy} />
          <View style={{ flex: 1 }} />
          <Button label={t('event.signOut')} variant="ghost" onPress={() => signOut()} disabled={busy} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  offer: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 10 },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 18,
  },
});
