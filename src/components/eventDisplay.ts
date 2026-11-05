/** Pure display helpers for My Event and the staff events list. */

import { localeTag, translate, type Locale } from '@/lib/i18n';

export type ScheduleInput = {
  id: string;
  label: string | null;
  dueDate: string | null;
  amount: number;
  seq: number;
};

export type PaymentInput = {
  id: string;
  amount: number;
  paidAt: string | null;
  pending: boolean;
};

export type DecoratedInstallment = ScheduleInput & {
  paid: boolean;
  paidAt: string | null;
  seqLabel: string;
};

export type PlanProgress = { pct: number; answered: number; total: number };

export type StaffListItem = {
  id: string;
  eventDate: string | null;
  startTime: string | null;
  title: string;
  venueName: string | null;
  statusName: string | null;
  statusColor: string | null;
  statusTextColor: string | null;
  progress: PlanProgress | null;
  haystack: string;
};

export type StaffRowModel = {
  id: string;
  month: string;
  day: string;
  title: string;
  subtitle: string | null;
  status: string;
  tone: 'ready' | 'progress' | 'idle' | 'crm';
  statusColor: string | null;
  statusTextColor: string | null;
};

export type StaffMonthGroup = { title: string; rows: StaffRowModel[] };

const cents = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);

export function formatMoney(n: number, locale: Locale = 'en'): string {
  const value = Number.isFinite(n) ? n : 0;
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return value.toLocaleString(localeTag(locale), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

function parseDay(d: string | null | undefined): Date | null {
  if (!d) return null;
  const day = d.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(d: string | null | undefined, locale: Locale = 'en'): string | null {
  const date = parseDay(d);
  if (!date) return null;
  return date.toLocaleDateString(localeTag(locale), { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatMediumDate(d: string | null | undefined, locale: Locale = 'en'): string | null {
  const date = parseDay(d);
  if (!date) return null;
  return date.toLocaleDateString(localeTag(locale), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatEyebrow(name: string | null | undefined, date: string | null | undefined, locale: Locale = 'en'): string | null {
  const when = formatLongDate(date, locale)?.toUpperCase() ?? null;
  const who = name?.trim() ? name.trim().toUpperCase() : null;
  const line = [who, when].filter(Boolean).join(' · ');
  return line || null;
}

export function formatTime(t: string | null | undefined, locale: Locale = 'en'): string | null {
  if (!t) return null;
  const [hRaw, mRaw] = t.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h)) return null;
  const when = new Date();
  when.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  return when.toLocaleTimeString(localeTag(locale), { hour: 'numeric', minute: '2-digit' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'XE';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Call and Text share the office phone. Email renders only when an address exists. */
export function teamActions(phoneRaw: string, email: string | null | undefined): { call: boolean; text: boolean; email: boolean } {
  const phone = phoneRaw.replace(/[^\d+]/g, '');
  return { call: phone.length > 0, text: phone.length > 0, email: !!email?.trim() };
}

export function hiddenFinancialsBanner(reason: 'guest' | 'role' | 'event', locale: Locale = 'en'): string {
  if (reason === 'guest') return translate(locale, 'event.payGuest');
  if (reason === 'role') return translate(locale, 'event.payRole');
  return translate(locale, 'event.payEvent');
}

/** Apply cleared payments onto the schedule in order. Pending payments do not count. */
export function decorateSchedule(schedule: ScheduleInput[], payments: PaymentInput[]): DecoratedInstallment[] {
  const items = [...schedule].sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
  const pools = payments
    .filter((p) => !p.pending && p.amount > 0)
    .map((p) => ({ paidAt: p.paidAt, left: cents(p.amount) }));
  let i = 0;
  return items.map((item, index) => {
    let need = Math.max(0, cents(item.amount));
    let paidAt: string | null = null;
    while (need > 0 && i < pools.length) {
      const pool = pools[i];
      const take = Math.min(pool.left, need);
      pool.left -= take;
      need -= take;
      if (pool.paidAt) paidAt = pool.paidAt;
      if (pool.left <= 0) i += 1;
    }
    const paid = need <= 0;
    return {
      ...item,
      paid,
      paidAt: paid ? paidAt : null,
      seqLabel: String(index + 1).padStart(2, '0'),
    };
  });
}

export function nextPaymentLine(schedule: DecoratedInstallment[], balance: number, locale: Locale = 'en'): string | null {
  const next = schedule.find((item) => !item.paid);
  if (next) {
    const amount = formatMoney(next.amount, locale);
    const when = formatLongDate(next.dueDate, locale);
    return when
      ? translate(locale, 'event.nextDue', { amount, when })
      : translate(locale, 'event.nextAmount', { amount });
  }
  if (balance <= 0.009) return translate(locale, 'event.paidFull');
  return null;
}

export function planStatus(
  progress: PlanProgress | null,
  crmName: string | null,
  locale: Locale = 'en',
): { label: string; tone: StaffRowModel['tone'] } {
  if (progress && progress.total > 0) {
    if (progress.answered >= progress.total) return { label: translate(locale, 'staff.ready'), tone: 'ready' };
    if (progress.answered <= 0) return { label: translate(locale, 'staff.notStarted'), tone: 'idle' };
    const pct = Math.max(0, Math.min(100, Math.round(progress.pct)));
    return { label: translate(locale, 'staff.planning', { pct }), tone: 'progress' };
  }
  if (crmName?.trim()) return { label: crmName.trim(), tone: 'crm' };
  return { label: translate(locale, 'staff.notStarted'), tone: 'idle' };
}

export function staffMatches(item: StaffListItem, needle: string, locale: Locale = 'en'): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  const status = planStatus(item.progress, item.statusName, locale).label;
  const parts = [
    item.title,
    item.haystack,
    item.venueName,
    status,
    item.statusName,
    formatMediumDate(item.eventDate, locale),
    formatLongDate(item.eventDate, locale),
    item.eventDate ? monthTitle(item.eventDate, locale) : null,
    formatTime(item.startTime, locale),
  ];
  return parts.some((part) => part?.toLowerCase().includes(q));
}

export function sortStaffItems(items: StaffListItem[], segment: 'upcoming' | 'past'): StaffListItem[] {
  return [...items].sort((a, b) => {
    const ad = a.eventDate ?? '';
    const bd = b.eventDate ?? '';
    if (!ad && !bd) return a.title.localeCompare(b.title);
    if (!ad) return 1;
    if (!bd) return -1;
    const cmp = ad.localeCompare(bd);
    if (cmp !== 0) return segment === 'past' ? -cmp : cmp;
    return a.title.localeCompare(b.title);
  });
}

export function groupStaffRows(items: StaffListItem[], locale: Locale = 'en'): StaffMonthGroup[] {
  const groups: StaffMonthGroup[] = [];
  const index = new Map<string, StaffMonthGroup>();
  const undated: StaffRowModel[] = [];
  for (const item of items) {
    const parts = item.eventDate ? dayParts(item.eventDate, locale) : null;
    const row = toRow(item, parts, locale);
    if (!parts || !item.eventDate) {
      undated.push(row);
      continue;
    }
    const key = item.eventDate.slice(0, 7);
    let group = index.get(key);
    if (!group) {
      group = { title: monthTitle(item.eventDate, locale), rows: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
  }
  if (undated.length) groups.push({ title: translate(locale, 'staff.dateTbd'), rows: undated });
  return groups;
}

function monthTitle(date: string, locale: Locale): string {
  const parsed = parseDay(date);
  if (!parsed) return translate(locale, 'staff.dateTbd');
  return parsed.toLocaleDateString(localeTag(locale), { month: 'long', year: 'numeric' }).toUpperCase();
}

function dayParts(date: string, locale: Locale): { month: string; day: string } | null {
  const parsed = parseDay(date);
  if (!parsed) return null;
  return {
    month: parsed.toLocaleDateString(localeTag(locale), { month: 'short' }).replace('.', '').slice(0, 3).toUpperCase(),
    day: String(parsed.getDate()).padStart(2, '0'),
  };
}

function toRow(item: StaffListItem, parts: { month: string; day: string } | null, locale: Locale): StaffRowModel {
  const status = planStatus(item.progress, item.statusName, locale);
  const subtitle = [item.venueName, formatTime(item.startTime, locale)].filter(Boolean).join(' · ') || null;
  return {
    id: item.id,
    month: parts?.month ?? translate(locale, 'staff.tbd'),
    day: parts?.day ?? '–',
    title: item.title,
    subtitle,
    status: status.label,
    tone: status.tone,
    statusColor: item.statusColor,
    statusTextColor: item.statusTextColor,
  };
}

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
