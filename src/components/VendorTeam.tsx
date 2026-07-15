import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { addEventVendor, listEventVendors, listVendorCategories, removeEventVendor, type EventVendor, type VendorCategory } from '@/lib/vendors';

const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function VendorTeam({ eventId }: { eventId: string }) {
  const c = useC();
  const [vendors, setVendors] = useState<EventVendor[] | null>(null);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [v, cats] = await Promise.all([listEventVendors(eventId), listVendorCategories()]);
    setVendors(v);
    setCategories(cats);
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ gap: Space.lg }}>
      {/* Why this matters */}
      <View style={[styles.why, { backgroundColor: Brand.purple + '14', borderColor: Brand.purple + '33' }]}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>🤝 Why we ask for this</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
          Add everyone working your day — photographer, planner, venue, florist, and more. Having each vendor's contact
          info lets our team reach out and coordinate timing directly with them, so your day flows seamlessly —
          especially when you don't have a separate planner pulling everyone together.
        </Text>
      </View>

      {vendors === null ? (
        <ActivityIndicator color={Brand.purple} style={{ marginTop: Space.lg }} />
      ) : (
        <>
          {vendors.map((v) => (
            <VendorCard key={v.id} v={v} c={c} onRemove={async () => { setVendors((p) => (p ?? []).filter((x) => x.id !== v.id)); await removeEventVendor(v.id); }} />
          ))}
          {vendors.length === 0 && !adding ? (
            <Text style={{ color: c.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: Space.md }}>No vendors added yet.</Text>
          ) : null}

          {adding ? (
            <AddVendorForm
              categories={categories}
              c={c}
              onCancel={() => setAdding(false)}
              onSave={async (input) => {
                const row = await addEventVendor(eventId, input);
                if (row) setVendors((p) => [...(p ?? []), row]);
                setAdding(false);
              }}
            />
          ) : (
            <Pressable onPress={() => setAdding(true)} style={[styles.addBtn, { borderColor: Brand.purple }]}>
              <Text style={{ color: Brand.purple, fontWeight: '700', fontSize: 15 }}>＋ Add a vendor</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function VendorCard({ v, c, onRemove }: { v: EventVendor; c: ReturnType<typeof useC>; onRemove: () => void }) {
  const tel = (v.contactPhone ?? '').replace(/[^\d+]/g, '');
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }}>
        <View style={{ flex: 1 }}>
          {v.category ? <Text style={{ color: Brand.purpleLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{v.category.toUpperCase()}</Text> : null}
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{v.company}</Text>
          {v.contactName ? <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }}>{v.contactName}</Text> : null}
        </View>
        <Pressable onPress={onRemove} hitSlop={10}><Text style={{ color: c.textTertiary, fontSize: 16 }}>✕</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: Space.sm, marginTop: Space.sm, flexWrap: 'wrap' }}>
        {tel ? <Chip label="Call" onPress={() => Linking.openURL(`tel:${tel}`)} c={c} /> : null}
        {tel ? <Chip label="Text" onPress={() => Linking.openURL(`sms:${tel}`)} c={c} /> : null}
        {v.contactEmail ? <Chip label="Email" onPress={() => Linking.openURL(`mailto:${v.contactEmail}`)} c={c} /> : null}
      </View>
    </View>
  );
}

function Chip({ label, onPress, c }: { label: string; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function AddVendorForm({
  categories, c, onCancel, onSave,
}: {
  categories: VendorCategory[];
  c: ReturnType<typeof useC>;
  onCancel: () => void;
  onSave: (input: { categoryId: string | null; categoryName: string; company: string; contactName: string; contactEmail: string; contactPhone: string }) => Promise<void>;
}) {
  const [cat, setCat] = useState<VendorCategory | null>(null);
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!company.trim()) return setErr('Business name is required.');
    if (!contactName.trim()) return setErr('Contact name is required.');
    if (!emailValid(email)) return setErr('A valid email is required.');
    setErr(null);
    setSaving(true);
    try {
      await onSave({ categoryId: cat?.id ?? null, categoryName: cat?.name ?? '', company, contactName, contactEmail: email, contactPhone: phone });
    } catch {
      setSaving(false);
      setErr('Could not save. Please try again.');
    }
  };

  const inputStyle = [styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }];

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border, gap: Space.sm }]}>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>Add a vendor</Text>

      <Text style={[styles.fieldLab, { color: c.textTertiary }]}>CATEGORY</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {categories.map((k) => {
          const active = cat?.id === k.id;
          return (
            <Pressable key={k.id} onPress={() => setCat(k)} style={[styles.catChip, active ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: '600' }}>{k.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field lab="BUSINESS NAME *" c={c}><TextInput style={inputStyle} value={company} onChangeText={setCompany} placeholder="e.g. Bella Photography" placeholderTextColor={c.textTertiary} /></Field>
      <Field lab="CONTACT NAME *" c={c}><TextInput style={inputStyle} value={contactName} onChangeText={setContactName} placeholder="Who we'll be reaching out to" placeholderTextColor={c.textTertiary} /></Field>
      <Field lab="EMAIL *" c={c}><TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="name@email.com" placeholderTextColor={c.textTertiary} autoCapitalize="none" keyboardType="email-address" /></Field>
      <Field lab="PHONE" c={c}><TextInput style={inputStyle} value={phone} onChangeText={setPhone} placeholder="(optional)" placeholderTextColor={c.textTertiary} keyboardType="phone-pad" /></Field>

      {err ? <Text style={{ color: '#e0584f', fontSize: 13 }}>{err}</Text> : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: Space.sm, marginTop: 4 }}>
        <Pressable onPress={onCancel} style={[styles.smallBtn, { backgroundColor: c.cardAlt }]}><Text style={{ color: c.textSecondary, fontWeight: '600' }}>Cancel</Text></Pressable>
        <Pressable onPress={submit} disabled={saving} style={[styles.smallBtn, { backgroundColor: Brand.purple, minWidth: 90, alignItems: 'center' }]}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function Field({ lab, c, children }: { lab: string; c: ReturnType<typeof useC>; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.fieldLab, { color: c.textTertiary }]}>{lab}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  why: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
  addBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 16 },
  catChip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  fieldLab: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: { letterSpacing: 0, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 11, fontSize: 15 },
  smallBtn: { borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 18 },
});
