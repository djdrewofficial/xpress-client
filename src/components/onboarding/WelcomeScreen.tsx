import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AiConsentSetting } from '@/components/AiConsentSetting';
import { SmsConsentSetting } from '@/components/SmsConsentSetting';
import { Button, ContentColumn, CountdownHero, LanguageCard, LegalLine, useC, useScheme } from '@/components/ui';
import { LegalSheet } from '@/components/onboarding/LegalSheet';
import { coupleDisplayName } from '@/lib/coupleName';
import { formatEventEyebrow } from '@/lib/eventDate';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { viewerRole } from '@/lib/membership';
import { useT } from '@/lib/i18n';
import { markWelcomeDone, recordLegalAcceptance, saveLocale } from '@/lib/preferences';
import { Type } from '@/lib/theme';
import { loadWelcomeSnapshot, type WelcomeSnapshot } from '@/lib/welcome';
import type { LegalDoc } from '@/lib/legal';

export function WelcomeScreen({
  onContinue,
  preview,
  initialSheet = null,
}: {
  onContinue: () => void;
  /** Sample data for the dev preview. Skips network and does not record acceptance. */
  preview?: WelcomeSnapshot | null;
  initialSheet?: LegalDoc | null;
}) {
  const c = useC();
  const scheme = useScheme();
  const { t, locale, setLocale } = useT();
  const { session, profile } = useAuth();
  const { event } = useEvent();
  const [snap, setSnap] = useState<WelcomeSnapshot | null>(preview ?? null);
  const [sheet, setSheet] = useState<LegalDoc | null>(initialSheet);
  const lock = useRef(false);

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

  const headline = names ? t('welcome.helloNames', { names }) : t('welcome.hello');
  const nameAt = names ? headline.lastIndexOf(names) : -1;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 18 }}>
        <ContentColumn>
        <View style={{ gap: 8 }}>
          <Text style={[Type.largeTitle, { color: c.ink }]}>
            {nameAt >= 0 ? headline.slice(0, nameAt) : headline}
            {nameAt >= 0 ? <Text style={[Type.accent, { color: c.accent }]}>{names}</Text> : null}
          </Text>
          <Text style={[Type.body, { color: c.ink2 }]}>{t('welcome.sub')}</Text>
        </View>

        {date ? (
          <CountdownHero
            date={date}
            venue={venue}
            dateLabel={formatEventEyebrow(date, locale)}
            progress={progress == null ? undefined : progress}
            size="large"
            locale={locale}
            showMoment={false}
          />
        ) : null}

        <View style={{ gap: 12 }}>
          <Text style={[Type.headline, { color: c.ink }]}>{t('welcome.langPrompt')}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <LanguageCard
              label={t('welcome.english')}
              selected={locale === 'en'}
              selectedLabel={t('welcome.selected')}
              onPress={() => setLocale('en')}
            />
            <LanguageCard
              label={t('welcome.spanish')}
              selected={locale === 'es'}
              selectedLabel={t('welcome.selected')}
              onPress={() => setLocale('es')}
            />
          </View>
        </View>

        {event && viewerRole(event, profile?.accountType) === 'host' ? (
          event.contractClient ? (
            <AiConsentSetting eventId={event.id} onPrivacy={() => setSheet('privacy')} preview={!!preview} />
          ) : (
            <Text style={[Type.footnote, { color: c.ink3 }]}>{t('ai.notContractClient')}</Text>
          )
        ) : null}
        <SmsConsentSetting
          eventId={event?.id ?? null}
          onPrivacy={() => setSheet('privacy')}
          onTerms={() => setSheet('terms')}
          preview={!!preview}
        />
        </ContentColumn>
      </ScrollView>

      <ContentColumn>
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <LegalLine language={locale} onTerms={() => setSheet('terms')} onPrivacy={() => setSheet('privacy')} />
        <Button label={t('welcome.continue')} onPress={finish} />
      </View>
      </ContentColumn>

      <LegalSheet visible={sheet != null} doc={sheet} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
