import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { SmsConsentSetting } from '@/components/SmsConsentSetting';
import { Button, ContentColumn, ContinueAgreement, useC } from '@/components/ui';
import { LegalSheet } from '@/components/onboarding/LegalSheet';
import { WelcomeHero } from '@/components/onboarding/WelcomeHero';
import { coupleDisplayName } from '@/lib/coupleName';
import { formatEventEyebrow } from '@/lib/eventDate';
import { frameFor } from '@/lib/frame';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { useT } from '@/lib/i18n';
import { markWelcomeDone, recordLegalAcceptance, saveLocale } from '@/lib/preferences';
import { Fonts, Radius, Type } from '@/lib/theme';
import { loadWelcomeSnapshot, type WelcomeSnapshot } from '@/lib/welcome';
import { scaledType } from '@/lib/welcomeCopy';
import type { LegalDoc } from '@/lib/legal';

export function WelcomeScreen({
  onContinue,
  preview,
  previewSms = false,
  previewFontScale = 1,
  initialSheet = null,
}: {
  onContinue: () => void;
  /** Sample data for the dev preview. Skips network and does not record acceptance. */
  preview?: WelcomeSnapshot | null;
  /** Sample preview only. Starts promotional texts on without a server call. */
  previewSms?: boolean;
  /** Sample preview only. Does not change production type size. */
  previewFontScale?: number;
  initialSheet?: LegalDoc | null;
}) {
  const c = useC();
  const { width } = useWindowDimensions();
  const frame = frameFor(width);
  const { t, locale, setLocale } = useT();
  const { session, profile } = useAuth();
  const { event } = useEvent();
  const [snap, setSnap] = useState<WelcomeSnapshot | null>(preview ?? null);
  const [sheet, setSheet] = useState<LegalDoc | null>(initialSheet);
  const lock = useRef(false);
  const scale = previewFontScale;

  useEffect(() => {
    if (preview || !event) return;
    let cancelled = false;
    loadWelcomeSnapshot(event.id)
      .then((next) => {
        if (!cancelled) setSnap(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preview, event]);

  const preliminary = coupleDisplayName(profile?.firstName ? [profile.firstName] : [], event?.name ?? null);
  const names = snap?.names || preliminary;
  const date = snap?.date ?? event?.event_date ?? null;
  const venue = snap?.venue ?? event?.venueName ?? null;
  const progress = snap?.progress ?? null;
  const coverUrl = snap?.coverUrl ?? (preview ? null : event?.cover_photo_url ?? null);
  const langLabel = scaledType(Type.footnote, scale);
  const langChoice = scaledType({ fontSize: 15, lineHeight: 20 }, scale);

  async function finish() {
    if (lock.current) return;
    lock.current = true;
    try {
      if (!preview && session?.user.id) {
        await Promise.all([
          recordLegalAcceptance(session.user.id),
          saveLocale(locale, { uid: session.user.id, clientId: profile?.clientId ?? null }),
          markWelcomeDone(session.user.id),
        ]);
      }
    } catch {
      // Still let them in. Acceptance stays on the device once storage works.
    }
    onContinue();
    lock.current = false;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <WelcomeHero
          hello={t('welcome.hello')}
          name={names}
          invite={t('welcome.invite')}
          date={date}
          dateLabel={date ? formatEventEyebrow(date, locale) : undefined}
          venue={venue}
          progress={progress}
          coverUrl={coverUrl}
          locale={locale}
          fontScale={scale}
        />
        <View style={[sheetStyle, { backgroundColor: c.bg }]}>
          <ContentColumn>
            <View style={{ paddingHorizontal: frame.horizontalPadding, paddingTop: 28, paddingBottom: 20, gap: 22 }}>
              <View accessibilityLabel={t('welcome.langPrompt')} style={langRow}>
                <Text style={[langLabel, { color: c.ink3, fontFamily: Fonts.medium }]}>{t('welcome.language')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <LangChoice
                    label={t('welcome.english')}
                    selected={locale === 'en'}
                    scaleStyle={langChoice}
                    onPress={() => setLocale('en')}
                  />
                  <LangChoice
                    label={t('welcome.spanish')}
                    selected={locale === 'es'}
                    scaleStyle={langChoice}
                    onPress={() => setLocale('es')}
                  />
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: c.line }} />
              <SmsConsentSetting
                eventId={event?.id ?? null}
                onPrivacy={() => setSheet('privacy')}
                onTerms={() => setSheet('terms')}
                preview={!!preview}
                previewGranted={preview ? previewSms : false}
                fontScale={scale}
                layout="welcome"
              />
              <View style={{ gap: 12, marginTop: 4 }}>
                <ContinueAgreement
                  onTerms={() => setSheet('terms')}
                  onPrivacy={() => setSheet('privacy')}
                  fontScale={scale}
                />
                <Button label={t('welcome.continue')} onPress={finish} />
              </View>
            </View>
          </ContentColumn>
        </View>
      </ScrollView>
      <LegalSheet visible={sheet != null} doc={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

function LangChoice({
  label,
  selected,
  onPress,
  scaleStyle,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  scaleStyle: { fontSize: number; lineHeight: number };
}) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        borderRadius: Radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: selected ? c.accentTint : 'transparent',
      }}>
      <Text
        style={{
          fontFamily: selected ? Fonts.semibold : Fonts.medium,
          fontSize: scaleStyle.fontSize,
          lineHeight: scaleStyle.lineHeight,
          color: selected ? c.accent : c.ink2,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

const sheetStyle = {
  marginTop: -28,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
};
const langRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};
