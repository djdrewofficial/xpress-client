import { supabase } from '@/lib/supabase';

/* Read-only event package + payment summary + team contacts for the Account tab.
   Mirrors XOS's price logic: override -> locked -> live default; "Investment"
   wording; pending payments excluded from balance math. */

export type IncludedItem = { name: string; detail: string | null; price: number; qty: number };
export type PaymentMade = { id: string; amount: number; paidAt: string | null; method: string | null; reason: string | null; pending: boolean };
export type ScheduledItem = { id: string; label: string | null; dueDate: string | null; amount: number; seq: number };

/** Office contact for the "Contact our team" card. Set OFFICE_PHONE to enable Call/Text. */
export const OFFICE_PHONE = '';
export const OFFICE_EMAIL_FALLBACK = 'events@xpressdjs.com';

export type AccountData = {
  packageName: string | null;
  packageDescription: string | null;
  includedHours: number | null;
  packagePrice: number;
  addons: IncludedItem[];
  travelFee: number;
  overtimeFee: number;
  discounts: { label: string; amount: number }[];
  total: number;
  paid: number;
  balance: number;
  billingTerms: string | null;
  payments: PaymentMade[];
  schedule: ScheduledItem[];
  officeEmail: string | null;
  companyName: string | null;
  financialsVisible: boolean;
};

const num = (v: unknown): number => (typeof v === 'number' ? v : v ? Number(v) : 0) || 0;

export async function loadAccount(eventId: string, isGuest: boolean): Promise<AccountData> {
  const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();

  // Visibility: guests NEVER see financials; otherwise per-event override
  // (true/false) wins, else the event type's default.
  let typeHide = false;
  if (ev?.event_type_id) {
    const { data: et } = await supabase.from('event_types').select('hide_financials').eq('id', ev.event_type_id).maybeSingle();
    typeHide = !!et?.hide_financials;
  }
  const hidden = ev?.hide_financials ?? typeHide;
  const financialsVisible = !isGuest && !hidden;

  const [{ data: eAddons }, { data: company }] = await Promise.all([
    supabase.from('event_addons').select('addon_id, quantity, price_override, price_locked').eq('event_id', eventId),
    supabase.from('company_public').select('company_name, from_email, reply_to').maybeSingle(),
  ]);
  // Only pull money when it's allowed to be shown.
  const pays = financialsVisible
    ? (await supabase.from('payments').select('id, amount, status, paid_at, method, reason').eq('event_id', eventId).order('paid_at', { ascending: true })).data
    : null;
  const sched = financialsVisible
    ? (await supabase.from('scheduled_payments').select('id, seq, due_date, amount, label').eq('event_id', eventId).order('seq', { ascending: true })).data
    : null;

  // Package
  let packageName: string | null = null;
  let packageDescription: string | null = null;
  let includedHours: number | null = null;
  if (ev?.package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('name, client_facing_name, description, included_hours, default_price')
      .eq('id', ev.package_id)
      .maybeSingle();
    if (pkg) {
      packageName = pkg.client_facing_name || pkg.name;
      packageDescription = pkg.description ?? null;
      includedHours = pkg.included_hours ?? null;
    }
  }
  const pkgDefault = ev?.package_id && financialsVisible ? await packageDefaultPrice(ev.package_id) : 0;
  const packagePrice = financialsVisible ? num(ev?.package_price_override) || num(ev?.package_price_locked) || pkgDefault : 0;

  // Add-ons (resolve names + prices)
  const addonIds = (eAddons ?? []).map((a) => a.addon_id).filter(Boolean);
  const addonMeta = new Map<string, { name: string; description: string | null; default_price: number }>();
  if (addonIds.length) {
    const { data: meta } = await supabase.from('addons').select('id, name, client_facing_name, description, default_price').in('id', addonIds);
    for (const m of meta ?? []) addonMeta.set(m.id, { name: m.client_facing_name || m.name, description: m.description ?? null, default_price: num(m.default_price) });
  }
  const addons: IncludedItem[] = (eAddons ?? []).map((a) => {
    const m = addonMeta.get(a.addon_id);
    const unit = num(a.price_override) || num(a.price_locked) || (m?.default_price ?? 0);
    const qty = a.quantity ?? 1;
    return { name: m?.name ?? 'Add-on', detail: m?.description ?? null, price: financialsVisible ? unit * qty : 0, qty };
  });

  const travelFee = financialsVisible ? num(ev?.travel_fee) : 0;
  const overtimeFee = financialsVisible ? num(ev?.overtime_fee) : 0;
  const discounts = financialsVisible
    ? [
        { label: ev?.discount1_label || 'Discount', amount: num(ev?.discount1_amount) },
        { label: ev?.discount2_label || 'Discount', amount: num(ev?.discount2_amount) },
      ].filter((d) => d.amount > 0)
    : [];

  const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
  const discountTotal = discounts.reduce((s, d) => s + d.amount, 0);
  const total = packagePrice + addonsTotal + travelFee + overtimeFee - discountTotal;

  // Payments: approved counts toward paid; pending shown but excluded from math.
  const payments: PaymentMade[] = (pays ?? []).map((p) => ({
    id: p.id, amount: num(p.amount), paidAt: p.paid_at, method: p.method, reason: p.reason, pending: p.status === 'pending',
  }));
  const paid = payments.filter((p) => !p.pending).reduce((s, p) => s + p.amount, 0);
  const balance = total - paid;

  const schedule: ScheduledItem[] = (sched ?? []).map((s) => ({ id: s.id, label: s.label, dueDate: s.due_date, amount: num(s.amount), seq: s.seq ?? 0 }));

  return {
    packageName, packageDescription, includedHours, packagePrice, addons, travelFee, overtimeFee, discounts,
    total, paid, balance, billingTerms: financialsVisible ? ev?.billing_terms ?? null : null,
    payments, schedule,
    officeEmail: company?.reply_to || company?.from_email || null,
    companyName: company?.company_name ?? null,
    financialsVisible,
  };
}

async function packageDefaultPrice(packageId: string): Promise<number> {
  const { data } = await supabase.from('packages').select('default_price').eq('id', packageId).maybeSingle();
  return num(data?.default_price);
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
