import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DeleteAccountSheet, InviteSentSheet } from '@/components/AccountSheets';
import { HostEventTools } from '@/components/HostEventTools';
import { InvitePersonSheet } from '@/components/InvitePersonSheet';
import { EventSwitcher } from '@/components/EventSwitcher';
import {
  MyEventView,
  type MyEventFinancials,
} from '@/components/MyEventView';
import { Sheet, useC } from '@/components/ui';
import {
  decorateSchedule,
  formatEyebrow,
  formatMediumDate,
  formatMoney,
  hiddenFinancialsBanner,
  initials,
  nextPaymentLine,
  teamActions,
} from '@/components/eventDisplay';
import { Type } from '@/lib/theme';
import { staffSeesFinancials, useAuth } from '@/lib/auth';
import { viewerRole } from '@/lib/membership';
import { appleAuthorizationCode, sessionUsesApple } from '@/lib/socialAuth';
import { useEvent } from '@/lib/events';
import {
  deleteAccount,
  loadAccount,
  OFFICE_EMAIL_FALLBACK,
  OFFICE_PHONE,
  type AccountData,
} from '@/lib/account';
import { readMarketingTexts, writeMarketingTexts } from '@/lib/language';
import { translate, useT, type Locale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const PRIVACY_URL = 'https://xos.xpressdjs.com/app-privacy';

export default function AccountScreen() {
  const c = useC();
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { event, events, loading: eventLoading } = useEvent();
  const eventId = event?.id ?? null;

  const [data, setData] = useState<AccountData | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [coupleName, setCoupleName] = useState<string | null>(null);
  const [guestRole, setGuestRole] = useState('Guest');
  const [team, setTeam] = useState<{ name: string; detail: string } | null>(null);
  const [accountName, setAccountName] = useState(profile?.firstName || 'Your account');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { locale, setLocale, t } = useT();
  const [marketing, setMarketing] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'confirm' | 'working' | 'done' | 'error'>('confirm');

  useEffect(() => {
    readMarketingTexts().then(setMarketing);
  }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    const isGuest = viewerRole(event, profile.accountType) === 'guest';
    const canSeeFinancials = profile.accountType === 'staff' ? staffSeesFinancials(profile) : true;
    try {
      const account = event ? await loadAccount(event.id, isGuest, canSeeFinancials) : null;
      const [venue, couple, role, person, name] = await Promise.all([
        event ? loadVenueName(event.venue_id) : Promise.resolve(null),
        event ? loadCoupleName(event.id, event.name) : Promise.resolve(null),
        isGuest && profile.eventGuestId ? loadGuestRole(profile.eventGuestId) : Promise.resolve('Guest'),
        event ? loadTeamPerson(event.id, account?.companyName ?? null, locale) : Promise.resolve(null),
        loadAccountName(profile, locale),
      ]);
      setData(account);
      setVenueName(venue);
      setCoupleName(couple);
      setGuestRole(role);
      setTeam(person);
      setAccountName(name);
    } finally {
      setLoading(false);
    }
  }, [profile, event, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onMarketing = useCallback((on: boolean) => {
    setMarketing(on);
    writeMarketingTexts(on).catch(() => {});
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeletePhase('working');
    // Apple only returns a fresh authorization code from another Sign in with Apple
    // prompt. Cancel still deletes the Xpress account. Revocation itself is server-side.
    const code = sessionUsesApple(session) ? await appleAuthorizationCode() : null;
    const ok = await deleteAccount({ appleAuthorizationCode: code });
    setDeletePhase(ok ? 'done' : 'error');
  }, [session]);

  const isStaff = profile?.accountType === 'staff';
  const emailAddress = (data?.officeEmail?.trim() || OFFICE_EMAIL_FALLBACK).trim();
  const actions = teamActions(OFFICE_PHONE, emailAddress);
  const phone = OFFICE_PHONE.replace(/[^\d+]/g, '');

  const financials: MyEventFinancials | null = data?.financialsVisible
    ? buildFinancials(data, locale)
    : null;
  const hiddenReason = !data || data.financialsVisible
    ? null
    : viewerRole(event, profile?.accountType) === 'guest'
      ? 'guest'
      : profile?.accountType === 'staff' && !staffSeesFinancials(profile)
        ? 'role'
        : 'event';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <MyEventView
        loading={loading || eventLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        eyebrow={event ? formatEyebrow(event.name, event.event_date, locale) : null}
        onBack={
          isStaff
            ? () => {
                if (router.canGoBack()) router.back();
                else router.push('/events');
              }
            : undefined
        }
        onSwitch={events.length > 1 ? () => setSwitcher(true) : undefined}
        hasEvent={!!event && !!data}
        financials={financials}
        banner={hiddenReason ? hiddenFinancialsBanner(hiddenReason, locale) : null}
        guest={
          viewerRole(event, profile?.accountType) === 'guest' && event
            ? { role: guestRole === 'Guest' || !guestRole ? t('common.guest') : guestRole, invitedBy: coupleName || event.name }
            : null
        }
        eventFacts={
          data && !data.financialsVisible
            ? { dateLabel: formatMediumDate(event?.event_date, locale) ?? t('common.dateTbd'), venue: venueName || event?.venueName || null }
            : null
        }
        packageInfo={
          data && viewerRole(event, profile?.accountType) !== 'guest'
            ? {
                name: data.packageName ?? t('event.customPackage'),
                detail:
                  data.packageDescription?.trim() ||
                  (data.includedHours ? t('event.hours', { count: data.includedHours }) : null),
              }
            : null
        }
        onPackage={() => setPackageOpen(true)}
        team={
          team
            ? {
                initials: initials(team.name),
                name: team.name,
                detail: team.detail,
                showCall: actions.call,
                showText: actions.text,
                showEmail: actions.email,
              }
            : null
        }
        onCall={() => Linking.openURL(`tel:${phone}`)}
        onText={() => Linking.openURL(`sms:${phone}`)}
        onEmail={() => Linking.openURL(`mailto:${emailAddress}`)}
        showInvite={false}
        hostTools={viewerRole(event, profile?.accountType) === 'host' && eventId ? <HostEventTools eventId={eventId} /> : null}
        onInvite={() => setShowInvite(true)}
        accountName={accountName}
        accountEmail={session?.user.email ?? null}
        onPrivacy={() => Linking.openURL(PRIVACY_URL)}
        onDisclosure={() => setDisclosure(true)}
        onSignOut={() => signOut()}
        onDelete={() => {
          setDeletePhase('confirm');
          setDeleteOpen(true);
        }}
        deleting={deletePhase === 'working'}
        language={locale}
        onLanguage={setLocale}
        marketing={marketing}
        onMarketing={onMarketing}
      />

      {events.length > 1 ? <EventSwitcher visible={switcher} onClose={() => setSwitcher(false)} /> : null}
      {eventId ? (
        <InvitePersonSheet
          visible={showInvite}
          eventId={eventId}
          onClose={() => setShowInvite(false)}
          onSent={(address) => setSentTo(address)}
        />
      ) : null}
      <InviteSentSheet visible={!!sentTo} email={sentTo ?? ''} onClose={() => setSentTo(null)} />
      <DeleteAccountSheet
        visible={deleteOpen}
        phase={deletePhase}
        onClose={() => {
          if (deletePhase === 'working') return;
          setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
        onDone={() => {
          setDeleteOpen(false);
          signOut();
        }}
      />
      <Sheet visible={disclosure} onClose={() => setDisclosure(false)} title={t('event.ai')}>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t('event.aiBody')}</Text>
      </Sheet>
      <Sheet visible={packageOpen} onClose={() => setPackageOpen(false)} title={data?.packageName ?? t('event.package')}>
        {data ? <PackageDetails data={data} /> : null}
      </Sheet>
    </View>
  );
}

function buildFinancials(data: AccountData, locale: Locale): MyEventFinancials {
  const schedule = decorateSchedule(data.schedule, data.payments);
  const pendingTotal = data.payments.filter((p) => p.pending).reduce((sum, p) => sum + p.amount, 0);
  const progress = data.total > 0 ? Math.max(0, Math.min(100, (data.paid / data.total) * 100)) : 0;
  const money = (n: number) => formatMoney(n, locale);
  return {
    balance: money(Math.max(0, data.balance)),
    nextLine: nextPaymentLine(schedule, data.balance, locale),
    paidLabel: translate(locale, 'event.paidOf', { amount: money(data.paid) }),
    ofLabel: translate(locale, 'event.ofTotal', { amount: money(data.total) }),
    progress,
    schedule: schedule.map((item) => {
      const paidWhen = formatMediumDate(item.paidAt, locale);
      const dueWhen = formatMediumDate(item.dueDate, locale);
      return {
        id: item.id,
        seqLabel: item.seqLabel,
        title: item.label?.trim() || translate(locale, 'event.paymentN', { n: item.seqLabel }),
        detail: item.paid
          ? (paidWhen ? translate(locale, 'event.paidOn', { when: paidWhen }) : translate(locale, 'event.paid'))
          : (dueWhen ? translate(locale, 'event.dueOn', { when: dueWhen }) : translate(locale, 'event.due')),
        paid: item.paid,
        amount: money(item.amount),
      };
    }),
    footnote: data.billingTerms,
    pendingNote:
      pendingTotal > 0
        ? translate(locale, 'event.pendingNote', { amount: money(pendingTotal) })
        : null,
  };
}

function PackageDetails({ data }: { data: AccountData }) {
  const c = useC();
  const { t, locale } = useT();
  const money = (n: number) => formatMoney(n, locale);
  const addonsTotal = data.addons.reduce((sum, a) => sum + a.price, 0);
  return (
    <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
      {data.includedHours ? (
        <Text style={[Type.footnote, { color: c.accent }]}>{t('event.hours', { count: data.includedHours })}</Text>
      ) : null}
      {data.packageDescription ? (
        <Text style={[Type.footnote, { color: c.ink2 }]}>{data.packageDescription}</Text>
      ) : null}
      {data.addons.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('event.included')}</Text>
          {data.addons.map((addon, index) => (
            <Line
              key={`${addon.name}-${index}`}
              label={`${addon.qty > 1 ? `${addon.qty}× ` : ''}${addon.name}`}
              value={data.financialsVisible ? money(addon.price) : ''}
            />
          ))}
        </View>
      ) : null}
      {data.financialsVisible ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('event.investment')}</Text>
          <Line label={t('event.packageLine')} value={money(data.packagePrice)} />
          {addonsTotal > 0 ? <Line label={t('event.addons')} value={money(addonsTotal)} /> : null}
          {data.travelFee > 0 ? <Line label={t('event.travel')} value={money(data.travelFee)} /> : null}
          {data.overtimeFee > 0 ? <Line label={t('event.overtime')} value={money(data.overtimeFee)} /> : null}
          {data.discounts.map((discount, index) => (
            <Line key={`${discount.label}-${index}`} label={discount.label} value={`– ${money(discount.amount)}`} accent={c.success} />
          ))}
          <Line label={t('event.total')} value={money(data.total)} />
          <Line label={t('event.paid')} value={money(data.paid)} accent={c.success} />
          <Line label={t('event.balanceLine')} value={money(data.balance)} />
        </View>
      ) : null}
      {data.financialsVisible && data.payments.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('event.paymentsMade')}</Text>
          {data.payments.map((payment) => (
            <Line
              key={payment.id}
              label={`${payment.reason || payment.method || t('event.payment')}${payment.pending ? ` · ${t('event.pending')}` : ''}`}
              value={money(payment.amount)}
              hint={formatMediumDate(payment.paidAt ? payment.paidAt.slice(0, 10) : null, locale) ?? undefined}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Line({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  const c = useC();
  return (
    <View style={styles.line}>
      <View style={{ flex: 1 }}>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{label}</Text>
        {hint ? <Text style={[Type.footnote, { color: c.ink3 }]}>{hint}</Text> : null}
      </View>
      {value ? <Text style={[Type.callout, { color: accent ?? c.ink }]}>{value}</Text> : null}
    </View>
  );
}

async function loadVenueName(venueId: string | null | undefined): Promise<string | null> {
  if (!venueId) return null;
  try {
    const byName = await supabase.from('venues').select('name').eq('id', venueId).maybeSingle();
    if (!byName.error) {
      const name = (byName.data as { name?: string | null } | null)?.name?.trim();
      return name || null;
    }
    const alt = await supabase.from('venues').select('venue_name').eq('id', venueId).maybeSingle();
    if (!alt.error) {
      const name = (alt.data as { venue_name?: string | null } | null)?.venue_name?.trim();
      return name || null;
    }
  } catch {
    /* venue is optional */
  }
  return null;
}

async function loadCoupleName(eventId: string, fallback: string | null): Promise<string | null> {
  try {
    const { data: ev } = await supabase.from('events').select('client_id, name').eq('id', eventId).maybeSingle();
    const clientId = (ev as { client_id?: string | null; name?: string | null } | null)?.client_id;
    if (clientId) {
      const { data: client, error } = await supabase
        .from('clients')
        .select('first_name, last_name')
        .eq('id', clientId)
        .maybeSingle();
      if (!error && client) {
        const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
        if (name) return name;
      }
    }
    return (ev as { name?: string | null } | null)?.name ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadGuestRole(guestId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from('event_guests').select('relationship').eq('id', guestId).maybeSingle();
    if (error || !data) return 'Guest';
    const relationship = (data as { relationship?: string | null }).relationship?.trim();
    return relationship || 'Guest';
  } catch {
    return 'Guest';
  }
}

async function loadTeamPerson(eventId: string, companyName: string | null, locale: Locale): Promise<{ name: string; detail: string }> {
  const company = companyName?.trim() || 'Xpress Entertainment';
  const fallback = { name: company, detail: translate(locale, 'event.teamFallback') };
  try {
    const { data, error } = await supabase
      .from('event_staff')
      .select('role, employee:employees(first_name, last_name)')
      .eq('event_id', eventId);
    if (error || !data?.length) return fallback;
    const rows = (data as unknown as {
      role: string | null;
      employee:
        | { first_name: string | null; last_name: string | null }
        | { first_name: string | null; last_name: string | null }[]
        | null;
    }[]).map((row) => ({
      role: row.role,
      employee: Array.isArray(row.employee) ? row.employee[0] ?? null : row.employee,
    }));
    const dj = rows.find((row) => /dj|mc|entertain/i.test(row.role ?? '')) ?? rows[0];
    const name = [dj.employee?.first_name, dj.employee?.last_name].filter(Boolean).join(' ') || company;
    const role = dj.role?.trim() || translate(locale, 'event.djFallback');
    return { name, detail: `${role} · ${company}` };
  } catch {
    return fallback;
  }
}

async function loadAccountName(profile: {
  firstName: string;
  clientId: string | null;
  eventGuestId: string | null;
  employeeId: string | null;
}, locale: Locale): Promise<string> {
  try {
    const table = profile.clientId ? 'clients' : profile.eventGuestId ? 'event_guests' : profile.employeeId ? 'employees' : null;
    const id = profile.clientId ?? profile.eventGuestId ?? profile.employeeId;
    if (table && id) {
      const { data, error } = await supabase.from(table).select('first_name, last_name').eq('id', id).maybeSingle();
      if (!error && data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        if (name) return name;
      }
    }
  } catch {
    /* the profile first name is enough */
  }
  return profile.firstName || translate(locale, 'event.yourAccount');
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
