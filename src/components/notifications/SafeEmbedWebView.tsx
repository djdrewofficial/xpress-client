import { createElement, useMemo, useRef } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { allowWebViewNavigation, buildScreenDocument } from '@/lib/appNotificationRouting';

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
}: {
  bodyHtml: string;
  embedHtml: string | null;
  allowedOrigins: string[];
  background: string;
  ink: string;
  ink2: string;
}) {
  const origins = useMemo(() => allowedOrigins.filter(Boolean), [allowedOrigins]);
  const html = useMemo(
    () => buildScreenDocument({ bodyHtml, embedHtml, background, ink, ink2 }),
    [bodyHtml, embedHtml, background, ink, ink2],
  );
  const opened = useRef(new Set<string>());

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {createElement('iframe', {
          title: 'notification-embed',
          srcDoc: html,
          sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox',
          style: {
            border: '0',
            width: '100%',
            height: '100%',
            background,
          },
        })}
      </View>
    );
  }

  return (
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
      // No bridges — never evaluate staff HTML in the RN JS thread.
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
  );
}

function openExternalOnce(url: string, seen: Set<string>) {
  if (seen.has(url)) return;
  seen.add(url);
  Linking.openURL(url).catch(() => {});
  setTimeout(() => seen.delete(url), 1500);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
