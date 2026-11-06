import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, useC } from '@/components/ui';
import { formatJoinCodeInput, joinErrorKind, redeemJoinCode, type JoinErrorKind } from '@/lib/eventAccess';
import { useAuth } from '@/lib/auth';
import { useT, type TranslationKey } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';

const JOIN_ERROR_KEY: Record<JoinErrorKind, TranslationKey> = {
  badCode: 'join.badCode',
  rate: 'join.tooMany',
  staff: 'join.staff',
  guest: 'join.guest',
  format: 'join.badFormat',
  forbidden: 'join.forbidden',
  setup: 'join.setup',
  generic: 'join.generic',
};

/**
 * Enter a partner join code. Used when a signed-in person has no event,
 * and from the "Have a join code?" link.
 */
export function JoinCodeScreen({
  onBack,
  allowSignOut,
  onRefresh,
  onJoined,
}: {
  onBack?: () => void;
  allowSignOut?: boolean;
  /** Re-check invites. Used on the no-event screen so a text invite can land without a code. */
  onRefresh?: () => Promise<void>;
  onJoined: (eventId: string, alreadyMember: boolean) => Promise<void>;
}) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { profile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const compact = code.replace(/-/g, '');

  async function submit() {
    if (busy || compact.length < 8) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await redeemJoinCode(code);
    if (!result.ok) {
      setBusy(false);
      if (result.status === 429 && result.retryAfter && result.retryAfter < 3600) {
        const minutes = Math.max(1, Math.ceil(result.retryAfter / 60));
        setError(t('join.waitMinutes', { count: minutes }));
        return;
      }
      setError(t(JOIN_ERROR_KEY[joinErrorKind(result.status, result.error, profile?.accountType ?? null)]));
      return;
    }
    if (result.data.alreadyMember) setNotice(t('join.already'));
    try {
      await onJoined(result.data.eventId, result.data.alreadyMember);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                tintColor={c.accent}
                onRefresh={async () => {
                  setRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setRefreshing(false);
                  }
                }}
              />
            ) : undefined
          }
          contentContainerStyle={{
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
            gap: 18,
            flexGrow: 1,
          }}>
          <View style={styles.titleRow}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
                <Icon name="chev-l" size={24} color={c.ink} />
              </Pressable>
            ) : null}
            <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>{t('join.title')}</Text>
          </View>
          <Text style={[Type.body, { color: c.ink2 }]}>{t('join.help')}</Text>
          <TextInput
            value={code}
            onChangeText={(value) => {
              setCode(formatJoinCodeInput(value));
              setError(null);
            }}
            placeholder={t('join.ph')}
            placeholderTextColor={c.ink3}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={9}
            style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }]}
            accessibilityLabel={t('join.title')}
          />
          {error ? <Text style={[Type.footnote, { color: c.danger }]}>{error}</Text> : null}
          {notice ? <Text style={[Type.footnote, { color: c.ink2 }]}>{notice}</Text> : null}
          <Button label={busy ? t('join.joining') : t('join.submit')} onPress={submit} disabled={busy || compact.length < 8} />
          <View style={{ flex: 1 }} />
          {allowSignOut ? <Button label={t('event.signOut')} variant="ghost" onPress={() => signOut()} disabled={busy} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 64,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 32,
    letterSpacing: 2,
  },
});
