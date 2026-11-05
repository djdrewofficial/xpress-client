import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DeleteAccountSheet, InviteSentSheet } from '@/components/AccountSheets';
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
import { useEvent } from '@/lib/events';
import {
  deleteAccount,
  loadAccount,
  OFFICE_EMAIL_FALLBACK,
  OFFICE_PHONE,
  type AccountData,
} from '@/lib/account';
import {
  readLanguage,
  readMarketingTexts,
  writeLanguage,
  writeMarketingTexts,
  type AppLanguage,
} from '@/lib/language';
import { supabase } from '@/lib/supabase';

const PRIVACY_URL = 'https://xos.xpressdjs.com/app-privacy';

const AI_DISCLOSURE =
  '“For You” song suggestions are AI-generated. To create them, the event details and music preferences you enter are sent to OpenAI to build recommendations. This information is never used for advertising.';

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
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [marketing, setMarketing] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhase, setDeletePhase] = useState<'confirm' | 'working' | 'done' | 'error'>('confirm');

  useEffect(() => {
    readLanguage().then(setLanguage);
    readMarketingTexts().then(setMarketing);
  }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    const isGuest = profile.accountType === 'event_guest';
    const canSeeFinancials = profile.accountType === 'staff' ? staffSeesFinancials(profile) : true;
    try {
      const account = event ? await loadAccount(event.id, isGuest, canSeeFinancials) : null;
      const [venue, couple, role, person, name] = await Promise.all([
        event ? loadVenueName(event.venue_id) : Promise.resolve(null),
        event ? loadCoupleName(event.id, event.name) : Promise.resolve(null),
        isGuest && profile.eventGuestId ? loadGuestRole(profile.eventGuestId) : Promise.resolve('Guest'),
        event ? loadTeamPerson(event.id, account?.companyName ?? null) : Promise.resolve(null),
        loadAccountName(profile),
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
  }, [profile, event]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onLanguage = useCallback((next: AppLanguage) => {
    setLanguage(next);
    writeLanguage(next).catch(() => {});
  }, []);

  const onMarketing = useCallback((on: boolean) => {
    setMarketing(on);
    writeMarketingTexts(on).catch(() => {});
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeletePhase('working');
    const ok = await deleteAccount();
    setDeletePhase(ok ? 'done' : 'error');
  }, []);

  const isStaff = profile?.accountType === 'staff';
  const emailAddress = (data?.officeEmail?.trim() || OFFICE_EMAIL_FALLBACK).trim();
  const actions = teamActions(OFFICE_PHONE, emailAddress);
  const phone = OFFICE_PHONE.replace(/[^\d+]/g, '');

  const financials: MyEventFinancials | null = data?.financialsVisible
    ? buildFinancials(data)
    : null;
  const hiddenReason = !data || data.financialsVisible
    ? null
    : profile?.accountType === 'event_guest'
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
        eyebrow={event ? formatEyebrow(event.name, event.event_date) : null}
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
        banner={hiddenReason ? hiddenFinancialsBanner(hiddenReason) : null}
        guest={
          profile?.accountType === 'event_guest' && event
            ? { role: guestRole || 'Guest', invitedBy: coupleName || event.name }
            : null
        }
        eventFacts={
          data && !data.financialsVisible
            ? { dateLabel: formatMediumDate(event?.event_date) ?? 'Date TBD', venue: venueName }
            : null
        }
        packageInfo={
          data
            ? {
                name: data.packageName ?? 'Custom Package',
                detail:
                  data.packageDescription?.trim() ||
                  (data.includedHours ? `${data.includedHours} hours of entertainment` : null),
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
        showInvite={profile?.accountType === 'client' && !!eventId}
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
        language={language}
        onLanguage={onLanguage}
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
      <Sheet visible={disclosure} onClose={() => setDisclosure(false)} title="AI disclosure">
        <Text style={[Type.footnote, { color: c.ink2 }]}>{AI_DISCLOSURE}</Text>
      </Sheet>
      <Sheet visible={packageOpen} onClose={() => setPackageOpen(false)} title={data?.packageName ?? 'Your package'}>
        {data ? <PackageDetails data={data} /> : null}
      </Sheet>
    </View>
  );
}

function buildFinancials(data: AccountData): MyEventFinancials {
  const schedule = decorateSchedule(data.schedule, data.payments);
  const pendingTotal = data.payments.filter((p) => p.pending).reduce((sum, p) => sum + p.amount, 0);
  const progress = data.total > 0 ? Math.max(0, Math.min(100, (data.paid / data.total) * 100)) : 0;
  return {
    balance: formatMoney(Math.max(0, data.balance)),
    nextLine: nextPaymentLine(schedule, data.balance),
    paidLabel: `${formatMoney(data.paid)} paid`,
    ofLabel: `of ${formatMoney(data.total)}`,
    progress,
    schedule: schedule.map((item) => ({
      id: item.id,
      seqLabel: item.seqLabel,
      title: item.label?.trim() || `Payment ${item.seqLabel}`,
      detail: item.paid
        ? `Paid${formatMediumDate(item.paidAt) ? ` ${formatMediumDate(item.paidAt)}` : ''}`
        : `Due${formatMediumDate(item.dueDate) ? ` ${formatMediumDate(item.dueDate)}` : ''}`,
      paid: item.paid,
      amount: formatMoney(item.amount),
    })),
    footnote: data.billingTerms,
    pendingNote:
      pendingTotal > 0
        ? `A pending payment of ${formatMoney(pendingTotal)} isn't included in the balance yet.`
        : null,
  };
}

function PackageDetails({ data }: { data: AccountData }) {
  const c = useC();
  const addonsTotal = data.addons.reduce((sum, a) => sum + a.price, 0);
  return (
    <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
      {data.includedHours ? (
        <Text style={[Type.footnote, { color: c.accent }]}>{data.includedHours} hours of entertainment</Text>
      ) : null}
      {data.packageDescription ? (
        <Text style={[Type.footnote, { color: c.ink2 }]}>{data.packageDescription}</Text>
      ) : null}
      {data.addons.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>What's included</Text>
          {data.addons.map((addon, index) => (
            <Line
              key={`${addon.name}-${index}`}
              label={`${addon.qty > 1 ? `${addon.qty}× ` : ''}${addon.name}`}
              value={data.financialsVisible ? formatMoney(addon.price) : ''}
            />
          ))}
        </View>
      ) : null}
      {data.financialsVisible ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>Your investment</Text>
          <Line label="Package" value={formatMoney(data.packagePrice)} />
          {addonsTotal > 0 ? <Line label="Add-ons" value={formatMoney(addonsTotal)} /> : null}
          {data.travelFee > 0 ? <Line label="Travel" value={formatMoney(data.travelFee)} /> : null}
          {data.overtimeFee > 0 ? <Line label="Overtime" value={formatMoney(data.overtimeFee)} /> : null}
          {data.discounts.map((discount, index) => (
            <Line key={`${discount.label}-${index}`} label={discount.label} value={`– ${formatMoney(discount.amount)}`} accent={c.success} />
          ))}
          <Line label="Total" value={formatMoney(data.total)} />
          <Line label="Paid" value={formatMoney(data.paid)} accent={c.success} />
          <Line label="Balance" value={formatMoney(data.balance)} />
        </View>
      ) : null}
      {data.financialsVisible && data.payments.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>Payments made</Text>
          {data.payments.map((payment) => (
            <Line
              key={payment.id}
              label={`${payment.reason || payment.method || 'Payment'}${payment.pending ? ' · Pending' : ''}`}
              value={formatMoney(payment.amount)}
              hint={formatMediumDate(payment.paidAt ? payment.paidAt.slice(0, 10) : null) ?? undefined}
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

async function loadTeamPerson(eventId: string, companyName: string | null): Promise<{ name: string; detail: string }> {
  const company = companyName?.trim() || 'Xpress Entertainment';
  const fallback = { name: company, detail: 'Your event team' };
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
    const role = dj.role?.trim() || 'Your DJ and MC';
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
}): Promise<string> {
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
  return profile.firstName || 'Your account';
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
