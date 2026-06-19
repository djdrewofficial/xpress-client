import { supabase } from '@/lib/supabase';

/* The couple's vendor roster for an event. Writes into the shared directory
   (vendors) + the event link (event_vendors, which carries the per-event
   contact details the DJ needs to coordinate). */

export type VendorCategory = { id: string; name: string };
export type EventVendor = {
  id: string; // event_vendors id
  company: string;
  category: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

export async function listVendorCategories(): Promise<VendorCategory[]> {
  const { data } = await supabase.from('vendor_categories').select('id, name').eq('is_active', true).order('name');
  return (data ?? []) as VendorCategory[];
}

export async function listEventVendors(eventId: string): Promise<EventVendor[]> {
  const { data } = await supabase
    .from('event_vendors')
    .select('id, role, contact_name, contact_phone, contact_email, vendor:vendors(company_name, category)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((r) => {
    const v = (r as unknown as { vendor: { company_name: string; category: string | null } | null }).vendor;
    return {
      id: r.id,
      company: v?.company_name ?? 'Vendor',
      category: v?.category ?? r.role ?? null,
      contactName: r.contact_name ?? null,
      contactPhone: r.contact_phone ?? null,
      contactEmail: r.contact_email ?? null,
    };
  });
}

export async function addEventVendor(
  eventId: string,
  input: { categoryId: string | null; categoryName: string; company: string; contactName: string; contactEmail: string; contactPhone: string },
): Promise<EventVendor | null> {
  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({ company_name: input.company.trim(), category: input.categoryName || null, category_id: input.categoryId })
    .select('id')
    .single();
  if (error) throw error;

  const { data: ev, error: e2 } = await supabase
    .from('event_vendors')
    .insert({
      event_id: eventId,
      vendor_id: vendor.id,
      role: input.categoryName || 'Vendor',
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail.trim(),
      contact_phone: input.contactPhone.trim() || null,
    })
    .select('id')
    .single();
  if (e2) throw e2;

  return {
    id: ev.id,
    company: input.company.trim(),
    category: input.categoryName || null,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim() || null,
    contactEmail: input.contactEmail.trim(),
  };
}

export async function removeEventVendor(eventVendorId: string): Promise<void> {
  await supabase.from('event_vendors').delete().eq('id', eventVendorId);
}
