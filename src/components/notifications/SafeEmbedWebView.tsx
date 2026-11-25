import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Button, useC } from '@/components/ui';
import { allowWebViewNavigation, buildScreenDocument } from '@/lib/appNotificationRouting';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';

/**
 * Sandboxed WebView for staff-authored body + embed HTML.
 * - JS enabled so iframe booking widgets (e.g. HighLevel) work
 * - No RN↔JS bridges / onMessage handlers
 * - Navigation limited to allowedOrigins; other https links open externally
 * - On web, react-native-webview is unavailable — use a sandboxed iframe instead
 */
export function SafeEmbedWebView({
  bodyHtml,
  embedHtml,
  allowedOrigins,
  background,
  ink,
  ink2,
  bookingUrl,
  minHeight = 420,
}: {
  bodyHtml: string;
  embedHtml: string | null;
  allowedOrigins: string[];
  background: string;
  ink: string;
  ink2: string;
  /** Used for the "Open in browser" fallback when the embed fails. */
  bookingUrl?: string | null;
  minHeight?: number;
}) {
  const c = useC();
  const { t } = useT();
  const origins = useMemo(() => allowedOrigins.filter(Boolean), [allowedOrigins]);
  const html = useMemo(
    () => buildScreenDocument({ bodyHtml, embedHtml, background, ink, ink2 }),
    [bodyHtml, embedHtml, background, ink, ink2],
  );
  const opened = useRef(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [html]);

  // Web iframe has no reliable load/error for srcDoc; clear the spinner shortly.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [html]);

  const openBooking = () => {
    const url = (bookingUrl ?? '').trim();
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        Shadow.card,
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          minHeight,
        },
      ]}>
      {failed ? (
        <View style={styles.fallback}>
          <Text style={[Type.title, { color: c.ink, textAlign: 'center' }]}>{t('notif.embedFailedTitle')}</Text>
          <Text style={[Type.body, { color: c.ink2, textAlign: 'center' }]}>{t('notif.embedFailedBody')}</Text>
          {bookingUrl ? (
            <Button label={t('notif.openBrowser')} onPress={openBooking} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          ) : null}
        </View>
      ) : (
        <View style={[styles.fill, { minHeight }]}>
          {Platform.OS === 'web' ? (
            <View style={styles.fill}>
              {createElement('iframe', {
                title: 'notification-embed',
                srcDoc: html,
                sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox',
                style: {
                  border: '0',
                  width: '100%',
                  height: '100%',
                  minHeight,
                  background,
                },
              })}
            </View>
          ) : (
            <WebView
              originWhitelist={['*', ...origins]}
              source={{ html, baseUrl: 'https://xos.xpressdjs.com' }}
              style={styles.fill}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              nestedScrollEnabled
              onLoadStart={() => {
                setLoading(true);
                setFailed(false);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              onHttpError={() => {
                setLoading(false);
                setFailed(true);
              }}
              onShouldStartLoadWithRequest={(req): boolean => {
                const decision = allowWebViewNavigation(req.url, origins);
                if (decision === 'allow') return true;
                if (decision === 'external') {
                  openExternalOnce(req.url, opened.current);
                  return false;
                }
                return false;
              }}
              onNavigationStateChange={(nav: WebViewNavigation): void => {
                const decision = allowWebViewNavigation(nav.url, origins);
                if (decision === 'external') openExternalOnce(nav.url, opened.current);
              }}
            />
          )}
          {loading ? (
            <View style={[styles.loading, { backgroundColor: c.surface }]} pointerEvents="none">
              <ActivityIndicator color={c.accent} size="large" />
              <Text style={[Type.footnote, { color: c.ink3, marginTop: 10, fontFamily: Fonts.medium }]}>
                {t('notif.embedLoading')}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function openExternalOnce(url: string, seen: Set<string>) {
  if (seen.has(url)) return;
  seen.add(url);
  Linking.openURL(url).catch(() => {});
  setTimeout(() => seen.delete(url), 1500);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flex: 1,
  },
  fill: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
});
