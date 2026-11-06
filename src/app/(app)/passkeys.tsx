import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, useC } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import { enrollPasskey, type PasskeyEnrollResult } from '@/lib/passkeyAuth';
import { supabase } from '@/lib/supabase';
import { Radius, Type } from '@/lib/theme';

type Row = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

const ENROLL_KEY: Record<Exclude<PasskeyEnrollResult, { ok: true }>['reason'], TranslationKey> = {
  cancelled: 'passkey.failed',
  unavailable: 'passkey.needUpdate',
  disabled: 'passkey.notReady',
  exists: 'passkey.exists',
  sso: 'passkey.sso',
  limit: 'passkey.limit',
  failed: 'passkey.failed',
};

/** The signed-in person's own passkeys. Removing one does not touch any other account. */
export default function PasskeysScreen() {
  const c = useC();
  const { t, locale } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    const result = await supabase.auth.passkey.list();
    if (result.error) {
      setRows([]);
      const code = `${result.error.code ?? ''} ${result.error.message ?? ''}`.toLowerCase();
      setNotice(code.includes('passkey_disabled') ? t('passkey.notReady') : t('passkey.failed'));
      return;
    }
    setRows(result.data ?? []);
    setNotice(null);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await enrollPasskey();
      if (!result.ok) {
        if (result.reason !== 'cancelled') setNotice(t(ENROLL_KEY[result.reason]));
        return;
      }
      setNotice(t('passkey.added'));
      await load();
    } finally {
      setBusy(false);
    }
  }

  function remove(row: Row) {
    Alert.alert(t('passkey.removeTitle'), t('passkey.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('passkey.remove'),
        style: 'destructive',
        onPress: async () => {
          const result = await supabase.auth.passkey.delete({ passkeyId: row.id });
          if (result.error) {
            setNotice(t('passkey.failed'));
            return;
          }
          setRows((prev) => (prev ?? []).filter((item) => item.id !== row.id));
          setNotice(t('passkey.removed'));
        },
      },
    ]);
  }

  async function saveName(row: Row) {
    const friendlyName = renameValue.trim().slice(0, 120);
    if (!friendlyName) return;
    const result = await supabase.auth.passkey.update({ passkeyId: row.id, friendlyName });
    if (result.error) {
      setNotice(t('passkey.failed'));
      return;
    }
    setRenameId(null);
    await load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Icon name="chev-l" size={24} color={c.ink} />
        </Pressable>
        <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>{t('passkey.settings')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <Text style={[Type.body, { color: c.ink2 }]}>{t('passkey.settingsHelp')}</Text>
        {notice ? <Text style={[Type.footnote, { color: c.ink2 }]}>{notice}</Text> : null}
        {rows == null ? <ActivityIndicator color={c.accent} /> : null}
        {rows && rows.length === 0 ? <Text style={[Type.footnote, { color: c.ink3 }]}>{t('passkey.empty')}</Text> : null}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          {(rows ?? []).map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[Type.callout, { color: c.ink }]}>{row.friendly_name || t('passkey.unnamed')}</Text>
                <Text style={[Type.footnote, { color: c.ink3 }]}>{formatWhen(row.created_at, locale)}</Text>
                {renameId === row.id ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <TextInput
                      value={renameValue}
                      onChangeText={setRenameValue}
                      maxLength={120}
                      style={[styles.input, { color: c.ink, borderColor: c.line }]}
                      accessibilityLabel={t('passkey.rename')}
                    />
                    <Pressable onPress={() => saveName(row)} hitSlop={8}>
                      <Text style={[Type.footnote, { color: c.accent }]}>{t('passkey.save')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <Pressable onPress={() => { setRenameId(row.id); setRenameValue(row.friendly_name || ''); }} hitSlop={8}>
                      <Text style={[Type.footnote, { color: c.accent }]}>{t('passkey.rename')}</Text>
                    </Pressable>
                    <Pressable onPress={() => remove(row)} hitSlop={8}>
                      <Text style={[Type.footnote, { color: c.redInk }]}>{t('passkey.remove')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
        <Button label={busy ? t('passkey.adding') : t('passkey.add')} onPress={add} disabled={busy} />
      </ScrollView>
    </View>
  );
}

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale === 'es' ? 'es-419' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
});
