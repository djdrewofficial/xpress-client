import { useLayoutEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JoinEventScreen } from '@/components/JoinEventScreen';
import { MyEventView } from '@/components/MyEventView';
import { FirstSongStep } from '@/components/onboarding/FirstSongStep';
import { MusicStep } from '@/components/onboarding/MusicStep';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { ForgotPasswordScreen } from '@/components/sign-in/ForgotPasswordScreen';
import { SignInScreen } from '@/components/sign-in/SignInScreen';
import { SignUpScreen } from '@/components/sign-in/SignUpScreen';
import { useC } from '@/components/ui';
import { useDevLocale } from '@/lib/devLocale';
import { useT } from '@/lib/i18n';
import { Radius, Type } from '@/lib/theme';
import type { WelcomeSnapshot } from '@/lib/welcome';

/**
 * Dev-only stills. Not linked from the app.
 * Open /dev/phase2?frame=login|signup|forgot|join|welcome|welcome-es|welcome-large|welcome-large-es|welcome-locked|welcome-offers|welcome-offers-es|privacy|music|song|my-event|my-event-es
 * Welcome/My Event stills accept chrome=iphone|iphonese|ipad for device insets. Sample data only.
 */

const SAMPLE: WelcomeSnapshot = {
  names: 'Alex',
  date: '2027-10-16',
  venue: null,
  progress: 95,
};

const IPHONE_METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const IPHONE_SE_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 667 },
  insets: { top: 20, left: 0, right: 0, bottom: 0 },
};

const IPAD_METRICS = {
  frame: { x: 0, y: 0, width: 834, height: 1194 },
  insets: { top: 24, left: 0, right: 0, bottom: 20 },
};

function PreviewFrame({ children }: { children: ReactNode }) {
  const { chrome } = useLocalSearchParams<{ chrome?: string }>();
  const value = Array.isArray(chrome) ? chrome[0] : chrome;
  const metrics = value === 'ipad' ? IPAD_METRICS : value === 'iphonese' ? IPHONE_SE_METRICS : value === 'iphone' ? IPHONE_METRICS : null;
  if (!metrics) return children;
  return <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>;
}

function MyEventSmsStill() {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
      <Text style={[Type.subhead, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]}>{t('sms.body')}</Text>
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.needPhone')}</Text>
    </View>
  );
}

function MyEventSafetyStill() {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={[Type.label, { color: c.ink3 }]}>{t('safety.heading')}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.intro')}</Text>
      </View>
      <Text style={[Type.subhead, { color: c.ink, marginTop: 2 }]}>{t('safety.blockedPeople')}</Text>
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('safety.noBlocked')}</Text>
      <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.songIdeas')}</Text>
      <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: Radius.md, padding: 12, gap: 6 }}>
        <Text style={[Type.callout, { color: c.ink }]}>Sample First Dance · Sample Artist</Text>
        <Text style={[Type.footnote, { color: c.accent }]}>{t('safety.reportIdea')}</Text>
        <Text style={[Type.footnote, { color: c.red }]}>{t('safety.remove')}</Text>
      </View>
      <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: Radius.md, padding: 12, gap: 6 }}>
        <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.avoid')}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]}>No reggaeton, no line dances.</Text>
        <Text style={[Type.footnote, { color: c.accent }]}>{t('safety.reportAvoid')}</Text>
        <Text style={[Type.footnote, { color: c.red }]}>{t('safety.remove')}</Text>
      </View>
    </View>
  );
}

function MyEventStill() {
  const { t, locale } = useT();
  return (
    <MyEventView
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      eyebrow="ALEX · OCTOBER 16, 2027"
      hasEvent
      financials={{
        balance: '$2,400',
        nextLine: t('event.nextAmount', { amount: '$1,200' }),
        paidLabel: t('event.paidOf', { amount: '$2,400' }),
        ofLabel: t('event.ofTotal', { amount: '$4,800' }),
        progress: 50,
        schedule: [
          { id: '1', seqLabel: '1', title: t('event.paymentN', { n: '1' }), detail: t('event.paid'), paid: true, amount: '$2,400' },
          { id: '2', seqLabel: '2', title: t('event.paymentN', { n: '2' }), detail: t('event.due'), paid: false, amount: '$1,200' },
        ],
        footnote: null,
        pendingNote: null,
      }}
      banner={null}
      guest={null}
      eventFacts={{ dateLabel: 'Sat · October 16, 2027', venue: 'Sample Venue' }}
      packageInfo={{ name: t('event.customPackage'), detail: t('event.hours', { count: 6 }) }}
      onPackage={() => {}}
      team={{ initials: 'JD', name: 'Jordan DJ', detail: t('common.staff'), showCall: true, showText: true, showEmail: true }}
      onCall={() => {}}
      onText={() => {}}
      onEmail={() => {}}
      showInvite={false}
      onInvite={() => {}}
      accountName="Alex"
      accountEmail="alex@example.com"
      onPrivacy={() => {}}
      onTerms={() => {}}
      onDeletion={() => {}}
      onSignOut={() => {}}
      onDelete={() => {}}
      deleting={false}
      language={locale === 'es' ? 'es' : 'en'}
      onLanguage={() => {}}
      smsConsent={<MyEventSmsStill />}
      safety={<MyEventSafetyStill />}
    />
  );
}

export default function Phase2Preview() {
  useDevLocale();
  const params = useLocalSearchParams<{ frame?: string }>();
  const frame = typeof params.frame === 'string' ? params.frame : 'login';
  const spanish = frame.endsWith('-es');
  const { setLocale } = useT();

  useLayoutEffect(() => {
    setLocale(spanish ? 'es' : 'en');
  }, [spanish, setLocale]);

  if (!__DEV__) return <Redirect href="/login" />;

  if (frame === 'signup' || frame === 'signup-es') return <SignUpScreen />;
  if (frame === 'forgot' || frame === 'forgot-es') return <ForgotPasswordScreen />;
  if (frame === 'join' || frame === 'join-es') return <JoinEventScreen onJoined={async () => {}} />;
  if (
    frame === 'welcome' ||
    frame === 'welcome-es' ||
    frame === 'welcome-large' ||
    frame === 'welcome-large-es' ||
    frame === 'welcome-offers' ||
    frame === 'welcome-offers-es' ||
    frame === 'welcome-locked' ||
    frame === 'welcome-locked-es'
  ) {
    return (
      <PreviewFrame>
        <WelcomeScreen
          preview={SAMPLE}
          previewSms={frame.startsWith('welcome-offers')}
          previewLocked={frame.startsWith('welcome-locked')}
          previewFontScale={frame.includes('large') ? 1.35 : 1}
          onContinue={() => {}}
        />
      </PreviewFrame>
    );
  }
  if (frame === 'privacy' || frame === 'privacy-es') {
    return <WelcomeScreen preview={SAMPLE} initialSheet="privacy" onContinue={() => {}} />;
  }
  if (frame === 'music' || frame === 'music-es') {
    return <MusicStep onSkip={() => {}} onContinue={() => {}} />;
  }
  if (frame === 'song') {
    return <FirstSongStep preview onSkip={() => {}} onDone={() => {}} />;
  }
  if (frame === 'my-event' || frame === 'my-event-es') {
    return (
      <PreviewFrame>
        <MyEventStill />
      </PreviewFrame>
    );
  }
  return <SignInScreen />;
}
