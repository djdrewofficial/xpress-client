import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationPopup } from '@/components/notifications/NotificationPopup';
import { SafeEmbedWebView } from '@/components/notifications/SafeEmbedWebView';
import { ThemeSchemeOverride, useC } from '@/components/ui';
import { Fonts, Radius, Type, type Scheme } from '@/lib/theme';

/**
 * Dev-only preview for notification popup + embed screen (screenshots).
 * Not linked from production UI. Production builds redirect away.
 */
export default function DevNotificationsRoute() {
  if (!__DEV__) return <Redirect href="/login" />;
  return <DevNotificationsBody />;
}

function DevNotificationsBody() {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const initialScheme: Scheme = params.get('scheme') === 'dark' ? 'dark' : 'light';
  const initialMode: 'popup' | 'embed' = params.get('mode') === 'embed' ? 'embed' : 'popup';
  const [scheme, setScheme] = useState<Scheme>(initialScheme);
  const [mode, setMode] = useState<'popup' | 'embed'>(initialMode);
  const [popupOpen, setPopupOpen] = useState(true);

  return (
    <ThemeSchemeOverride scheme={scheme}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <PreviewChrome
          scheme={scheme}
          mode={mode}
          onScheme={setScheme}
          onMode={setMode}
          onShowPopup={() => setPopupOpen(true)}
        />
        {mode === 'embed' ? <EmbedPreview /> : null}
        {mode === 'popup' ? (
          <NotificationPopup
            visible={popupOpen}
            popup={{
              id: 'preview',
              title: 'Time to book your planning call',
              body: 'Pick a time that works — your DJ left a calendar just for you.',
            }}
            onOpen={() => setPopupOpen(false)}
            onDismiss={() => setPopupOpen(false)}
          />
        ) : null}
      </SafeAreaView>
    </ThemeSchemeOverride>
  );
}

function PreviewChrome({
  scheme,
  mode,
  onScheme,
  onMode,
  onShowPopup,
}: {
  scheme: Scheme;
  mode: 'popup' | 'embed';
  onScheme: (s: Scheme) => void;
  onMode: (m: 'popup' | 'embed') => void;
  onShowPopup: () => void;
}) {
  const c = useC();
  return (
    <View style={[styles.chrome, { backgroundColor: c.bg, borderBottomColor: c.line }]}>
      <Text style={[Type.headline, { color: c.ink }]}>Notifications preview</Text>
      <View style={styles.row}>
        <Chip label="Light" selected={scheme === 'light'} onPress={() => onScheme('light')} />
        <Chip label="Dark" selected={scheme === 'dark'} onPress={() => onScheme('dark')} />
        <Chip label="Popup" selected={mode === 'popup'} onPress={() => onMode('popup')} />
        <Chip label="Embed" selected={mode === 'embed'} onPress={() => onMode('embed')} />
        {mode === 'popup' ? <Chip label="Show" selected={false} onPress={onShowPopup} /> : null}
      </View>
    </View>
  );
}

function EmbedPreview() {
  const c = useC();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.nav, { borderBottomColor: c.line }]}>
        <Text style={[styles.navTitle, { color: c.ink }]}>Schedule with your DJ</Text>
      </View>
      <SafeEmbedWebView
        bodyHtml="<p>Choose a planning-meeting time below. This calendar is just for your event.</p>"
        embedHtml={`<iframe src="https://api.leadconnectorhq.com/widget/booking/example" title="Booking" style="width:100%;min-height:640px;border:0;"></iframe>`}
        allowedOrigins={['https://api.leadconnectorhq.com']}
        background={c.bg}
        ink={c.ink}
        ink2={c.ink2}
      />
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        backgroundColor: selected ? c.accentTint : c.surface2,
      }}>
      <Text style={{ color: selected ? c.accent : c.ink2, fontFamily: Fonts.semibold, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chrome: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nav: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontFamily: Fonts.semibold, fontSize: 16, textAlign: 'center' },
});
