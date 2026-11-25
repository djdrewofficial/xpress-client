import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationPopup } from '@/components/notifications/NotificationPopup';
import { NotificationScreenView } from '@/components/notifications/NotificationScreenView';
import { ThemeSchemeOverride, useC } from '@/components/ui';
import { sampleBookingBodyHtml, sampleBookingEmbedHtml } from '@/lib/notificationEmbedSample';
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

  const chrome = (
    <PreviewChrome
      scheme={scheme}
      mode={mode}
      onScheme={setScheme}
      onMode={setMode}
      onShowPopup={() => setPopupOpen(true)}
    />
  );

  return (
    <ThemeSchemeOverride scheme={scheme}>
      <SafeAreaView style={{ flex: 1 }} edges={mode === 'embed' ? [] : ['top', 'bottom']}>
        {mode === 'embed' ? (
          <EmbedPreview chrome={chrome} />
        ) : (
          <>
            {chrome}
            <View style={{ flex: 1 }} />
            <NotificationPopup
              visible={popupOpen}
              brand={{ djName: 'DJ Alex' }}
              popup={{
                id: 'preview',
                title: 'Time to book your planning call',
                body: 'Pick a time that works for you. Your DJ set up a calendar just for your event.',
              }}
              onOpen={() => setPopupOpen(false)}
              onDismiss={() => setPopupOpen(false)}
            />
          </>
        )}
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
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.chrome,
        {
          backgroundColor: c.bg,
          borderBottomColor: c.line,
          paddingTop: mode === 'embed' ? insets.top + 12 : 12,
        },
      ]}>
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

function EmbedPreview({ chrome }: { chrome: ReactNode }) {
  const c = useC();
  return (
    <NotificationScreenView
      chrome={chrome}
      screen={{
        heading: 'Schedule with your DJ',
        bodyHtml: sampleBookingBodyHtml(),
        embedHtml: sampleBookingEmbedHtml({
          djName: 'DJ Alex',
          ink: c.ink,
          ink2: c.ink2,
          surface: c.bg,
        }),
        allowedOrigins: [],
        buttons: [],
        djName: 'DJ Alex',
        bookingUrl: 'https://xos.xpressdjs.com',
      }}
      onClose={() => {}}
      onButton={() => {}}
    />
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
});
