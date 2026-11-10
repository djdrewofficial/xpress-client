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
import { Icon, useC } from '@/components/ui';
import { useDevLocale } from '@/lib/devLocale';
import { useT } from '@/lib/i18n';
import { Fonts, Radius, Type } from '@/lib/theme';
import type { WelcomeSnapshot } from '@/lib/welcome';

/**
 * Dev-only stills. Not linked from the app.
 * Open /dev/phase2?frame=login|signup|forgot|join|welcome|welcome-es|welcome-large|welcome-large-es|welcome-locked|welcome-offers|welcome-offers-es|privacy|music|song|my-event|my-event-es|music-ideas|music-ideas-swipe-left|music-ideas-swipe-right
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
    <View style={{ backgroundColor: c.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
      <Text style={[Type.subhead, { color: c.ink }]}>{t('sms.title')}</Text>
      <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>{t('welcome.smsLine')}</Text>
      <Text style={[Type.footnote, { color: c.ink3 }]}>{t('sms.needPhone')}</Text>
    </View>
  );
}

const sectionLabel = {
  fontFamily: 'Montserrat-SemiBold' as const,
  fontSize: 13,
  lineHeight: 18,
  letterSpacing: 1.4,
  textTransform: 'uppercase' as const,
};

function MyEventSafetyStill() {
  const c = useC();
  const { t } = useT();
  return (
    <View style={{ gap: 12 }}>
      <Text style={[sectionLabel, { color: c.ink2 }]}>{t('safety.heading')}</Text>
      <View style={{ backgroundColor: c.surface, borderRadius: Radius.lg, overflow: 'hidden' }}>
        <Text style={[Type.footnote, { color: c.ink2, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }]}>
          {t('safety.intro')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.reportRow')}</Text>
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.reportRowHint')}</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: c.line, marginLeft: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.blockedPeople')}</Text>
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.noBlocked')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function MusicIdeaCard({ title }: { title: string }) {
  const c = useC();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: Radius.lg,
        padding: 14,
        gap: 8,
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 8,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <Icon name="music" size={18} color="#fff" />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="play" size={14} color="#fff" />
        </View>
      </View>
      <Text style={[Type.callout, { color: c.ink, flex: 1 }]}>{title}</Text>
    </View>
  );
}

function ConfirmStill({
  tone,
  label,
  report,
}: {
  tone: 'remove' | 'must';
  label: string;
  report?: string;
}) {
  const { t } = useT();
  const bg = tone === 'remove' ? '#e0584f' : '#2e8b62';
  return (
    <View
      style={{
        borderRadius: Radius.lg,
        backgroundColor: bg,
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
      <Icon name={tone === 'remove' ? 'trash' : 'star'} size={18} color="#fff" />
      <Text style={{ flex: 1, color: '#fff', fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 }}>
        {label}
      </Text>
      {report ? (
        <Text style={{ color: '#fff', fontFamily: Fonts.semibold, fontSize: 13, textDecorationLine: 'underline' }}>
          {report}
        </Text>
      ) : null}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={t('common.cancel')}>
        <Icon name="close" size={16} color="#fff" />
      </View>
    </View>
  );
}

function MusicIdeasStill({ swipe = 'rest' }: { swipe?: 'rest' | 'left' | 'right' }) {
  const c = useC();
  const { t } = useT();
  const title = "Can't Help Falling in Love · Elvis Presley";
  return (
    <View style={{ gap: 32, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, backgroundColor: c.bg, flex: 1 }}>
      <View>
        <Text style={[Type.overline, { color: c.red }]}>{t('record.eyebrow')}</Text>
        <Text style={[Type.largeTitle, { color: c.ink }]}>{t('record.title')}</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={[sectionLabel, { color: c.ink2 }]}>{t('safety.songIdeas')}</Text>
        <Text style={[Type.footnote, { color: c.ink3 }]}>{t('safety.swipeHint')}</Text>
        {swipe === 'left' ? (
          <View style={{ gap: 10 }}>
            <ConfirmStill tone="remove" label={t('safety.tapToRemove')} report={t('safety.report')} />
            <MusicIdeaCard title="Shut Up and Dance · Walk the Moon" />
          </View>
        ) : swipe === 'right' ? (
          <View style={{ gap: 10 }}>
            <ConfirmStill tone="must" label={t('safety.tapToMustPlay')} />
            <MusicIdeaCard title="Shut Up and Dance · Walk the Moon" />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <MusicIdeaCard title={title} />
            <MusicIdeaCard title="Shut Up and Dance · Walk the Moon" />
            <MusicIdeaCard title="Dancing Queen · ABBA" />
          </View>
        )}
      </View>
      {swipe === 'rest' ? (
        <View style={{ gap: 12 }}>
          <Text style={[sectionLabel, { color: c.ink2 }]}>{t('safety.avoid')}</Text>
          <MusicIdeaCard title="No heavy metal. No explicit lyrics during dinner." />
        </View>
      ) : null}
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
  if (frame === 'music-ideas' || frame === 'music-ideas-es') {
    return (
      <PreviewFrame>
        <MusicIdeasStill />
      </PreviewFrame>
    );
  }
  if (frame === 'music-ideas-swipe-left' || frame === 'music-ideas-swipe-left-es') {
    return (
      <PreviewFrame>
        <MusicIdeasStill swipe="left" />
      </PreviewFrame>
    );
  }
  if (frame === 'music-ideas-swipe-right' || frame === 'music-ideas-swipe-right-es') {
    return (
      <PreviewFrame>
        <MusicIdeasStill swipe="right" />
      </PreviewFrame>
    );
  }
  return <SignInScreen />;
}
