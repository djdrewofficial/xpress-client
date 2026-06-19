import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { getMyEvents } from '@/lib/planning';
import { loadAccount, money, type AccountData, type TeamMember } from '@/lib/account';

const fmtDate = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);

export default function AccountScreen() {
  const c = useC();
  const { profile, session, signOut } = useAuth();
  const [data, setData] = useState<AccountData | null>(null);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const events = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    const ev = events[0] ?? null;
    setEventName(ev?.name ?? '');
    setData(ev ? await loadAccount(ev.id) : null);
    setLoading(false);
  }, [profile]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;

  const officeEmail = data?.officeEmail ?? 'info@xpressdjs.com';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: Space.lg, gap: Space.lg, paddingBottom: Space.xxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.purple} />}>
          <Text style={[styles.title, { color: c.text }]}>My Event</Text>

          {!data ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary }}>Your event details will appear here once your booking is set up.</Text>
            </View>
          ) : (
            <>
              {/* Package */}
              <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR PACKAGE</Text>
                <Text style={{ color: c.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{data.packageName ?? 'Custom Package'}</Text>
                {data.includedHours ? <Text style={{ color: Brand.purpleLight, fontSize: 13, fontWeight: '700', marginTop: 2 }}>{data.includedHours} hours of entertainment</Text> : null}
                {data.packageDescription ? <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: Space.sm }}>{data.packageDescription}</Text> : null}

                {data.addons.length > 0 && (
                  <View style={{ marginTop: Space.md, gap: Space.sm }}>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>WHAT'S INCLUDED</Text>
                    {data.addons.map((a, i) => (
                      <View key={i} style={styles.lineRow}>
                        <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>{a.qty > 1 ? `${a.qty}× ` : ''}{a.name}</Text>
                        <Text style={{ color: c.textSecondary, fontSize: 14 }}>{money(a.price)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Investment & payments */}
              <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR INVESTMENT</Text>
                <View style={{ marginTop: Space.sm, gap: 6 }}>
                  <Line label="Package" value={money(data.packagePrice)} c={c} />
                  {data.addons.length > 0 && <Line label="Add-ons" value={money(data.addons.reduce((s, a) => s + a.price, 0))} c={c} />}
                  {data.travelFee > 0 && <Line label="Travel" value={money(data.travelFee)} c={c} />}
                  {data.overtimeFee > 0 && <Line label="Overtime" value={money(data.overtimeFee)} c={c} />}
                  {data.discounts.map((d, i) => <Line key={i} label={d.label} value={`– ${money(d.amount)}`} c={c} accent="#22c55e" />)}
                </View>

                <View style={[styles.totalsRow, { borderColor: c.border }]}>
                  <Stat label="Total" value={money(data.total)} c={c} />
                  <Stat label="Paid" value={money(data.paid)} c={c} color="#22c55e" />
                  <Stat label="Balance" value={money(data.balance)} c={c} color={data.balance > 0 ? Brand.purpleLight : '#22c55e'} />
                </View>

                {data.schedule.length > 0 && (
                  <View style={{ marginTop: Space.md, gap: Space.sm }}>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>PAYMENT SCHEDULE</Text>
                    {data.schedule.map((s) => (
                      <View key={s.id} style={styles.lineRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontSize: 14 }}>{s.label || `Payment ${s.seq}`}</Text>
                          {s.dueDate ? <Text style={{ color: c.textTertiary, fontSize: 12 }}>Due {fmtDate(s.dueDate)}</Text> : null}
                        </View>
                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{money(s.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {data.payments.length > 0 && (
                  <View style={{ marginTop: Space.md, gap: Space.sm }}>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>PAYMENTS MADE</Text>
                    {data.payments.map((p) => (
                      <View key={p.id} style={styles.lineRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontSize: 14 }}>{p.reason || p.method || 'Payment'}</Text>
                          <Text style={{ color: c.textTertiary, fontSize: 12 }}>{fmtDate(p.paidAt ? p.paidAt.slice(0, 10) : null) ?? 'Recorded'}{p.pending ? ' · Pending' : ''}</Text>
                        </View>
                        <Text style={{ color: p.pending ? c.textTertiary : '#22c55e', fontSize: 14, fontWeight: '600' }}>{money(p.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {data.billingTerms ? <Text style={{ color: c.textTertiary, fontSize: 12, marginTop: Space.md, lineHeight: 17 }}>{data.billingTerms}</Text> : null}
              </View>

              {/* Contact team */}
              <View style={[styles.card, Shadow.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR TEAM</Text>
                {data.team.map((m) => <TeamRow key={m.id} m={m} c={c} />)}
                <Pressable onPress={() => Linking.openURL(`mailto:${officeEmail}`)} style={{ marginTop: Space.md }}>
                  <LinearGradient colors={[Brand.purple, Brand.purpleLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bigBtn}>
                    <Text style={styles.bigBtnTxt}>✉  Email our team</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <Pressable onPress={signOut} style={[styles.signOut, { borderColor: c.border }]}>
                <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Sign out</Text>
              </Pressable>
              <Text style={{ color: c.textTertiary, fontSize: 12, textAlign: 'center' }}>{profile?.firstName ? `${profile.firstName} · ` : ''}{session?.user.email}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Line({ label, value, c, accent }: { label: string; value: string; c: ReturnType<typeof useC>; accent?: string }) {
  return (
    <View style={styles.lineRow}>
      <Text style={{ color: c.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: accent ?? c.text, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, c, color }: { label: string; value: string; c: ReturnType<typeof useC>; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: c.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: color ?? c.text, fontSize: 17, fontWeight: '800', marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function TeamRow({ m, c }: { m: TeamMember; c: ReturnType<typeof useC> }) {
  const tel = (m.phone ?? '').replace(/[^\d+]/g, '');
  return (
    <View style={{ paddingVertical: Space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{m.name}</Text>
      {m.role ? <Text style={{ color: c.textTertiary, fontSize: 12, marginBottom: 6 }}>{m.role}</Text> : null}
      <View style={{ flexDirection: 'row', gap: Space.sm, marginTop: 4 }}>
        {tel ? <ContactBtn label="Call" onPress={() => Linking.openURL(`tel:${tel}`)} c={c} /> : null}
        {tel ? <ContactBtn label="Text" onPress={() => Linking.openURL(`sms:${tel}`)} c={c} /> : null}
        {m.email ? <ContactBtn label="Email" onPress={() => Linking.openURL(`mailto:${m.email}`)} c={c} /> : null}
      </View>
    </View>
  );
}

function ContactBtn({ label, onPress, c }: { label: string; onPress: () => void; c: ReturnType<typeof useC> }) {
  return (
    <Pressable onPress={onPress} style={[styles.contactBtn, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      <Text style={{ color: Brand.purpleLight, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.lg },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  totalsRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: Space.md, paddingTop: Space.md },
  contactBtn: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  bigBtn: { borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  bigBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signOut: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
});
