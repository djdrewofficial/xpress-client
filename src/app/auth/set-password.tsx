import { useEffect } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Type } from '@/lib/theme';

/**
 * Legacy invite / reset links (xpressclient://auth/set-password).
 * There is no password form. If the link carries a session, we sign them in
 * and continue. Otherwise we send them to the one-time-code screen.
 */

const HASH_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
type HashType = (typeof HASH_TYPES)[number];

function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  for (const kv of raw.split('&')) {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

function isHashType(value: string): value is HashType {
  return (HASH_TYPES as readonly string[]).includes(value);
}

async function adoptInviteUrl(url: string): Promise<boolean> {
  try {
    const p = parseParams(url);
    if (p.access_token && p.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: p.access_token,
        refresh_token: p.refresh_token,
      });
      return !error;
    }
    if (p.token_hash && p.type && isHashType(p.type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: p.type });
      return !error;
    }
    if (p.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(p.code);
      return !error;
    }
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

export default function SetPasswordScreen() {
  const router = useRouter();
  const c = useC();
  const { t } = useT();

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    const finish = (ok: boolean) => {
      if (cancelled || settled) return;
      settled = true;
      router.replace(ok ? '/' : '/login');
    };
    const timer = setTimeout(() => finish(false), 1500);

    Linking.getInitialURL()
      .then(async (url) => {
        if (url && (await adoptInviteUrl(url))) finish(true);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', async (event) => {
      try {
        finish(await adoptInviteUrl(event.url));
      } catch {
        finish(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={c.accent} />
      <Text style={[Type.callout, { color: c.ink2 }]}>{t('auth.signingIn')}</Text>
    </View>
  );
}
