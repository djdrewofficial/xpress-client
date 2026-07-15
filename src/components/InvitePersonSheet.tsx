import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';

import { useC } from '@/components/ui';
import { Brand, Radius, Space } from '@/lib/theme';
import { inviteGuest } from '@/lib/people';

const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const RELATIONSHIPS = ['Partner', 'Fiancé(e)', 'Wedding Planner', 'Parent', 'Sibling', 'Friend', 'Other'];

export function InvitePersonSheet({ visible, eventId, onClose, onInvited }: {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onInvited?: () => void;
}) {
  const c = useC();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setFirst(''); setLast(''); setEmail(''); setRelationship(''); setErr(null); setBusy(false); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!first.trim() || !last.trim()) return setErr('First and last name are required.');
    if (!emailValid(email)) return setErr('A valid email is required.');
    if (!relationship.trim()) return setErr('Let us know their relationship to the wedding.');
    setErr(null);
    setBusy(true);
    const res = await inviteGuest({ eventId, firstName: first, lastName: last, email, relationship });
    setBusy(false);
    if (res.ok) {
      onInvited?.();
      reset();
      onClose();
      Alert.alert('Invite sent ✓', `We emailed ${email.trim()} a link to set their password and join your event.`);
    } else {
      setErr(res.error ?? 'Could not send the invite.');
    }
  };

  const inputStyle = [styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardProvider>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: c.bg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '92%' }}>
              <View style={styles.head}>
                <Pressable onPress={close}><Text style={{ color: c.textSecondary, fontSize: 15 }}>Cancel</Text></Pressable>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>Invite someone</Text>
                <Pressable onPress={submit} disabled={busy}>
                  {busy ? <ActivityIndicator color={Brand.purple} /> : <Text style={{ color: Brand.purple, fontWeight: '800', fontSize: 15 }}>Send</Text>}
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: Space.lg, gap: Space.md }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
                  Invite your partner or wedding planner to help plan your event. We&apos;ll email them a link to set a password and sign in.
                </Text>

                <View style={{ flexDirection: 'row', gap: Space.sm }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>FIRST NAME</Text>
                    <TextInput style={inputStyle} value={first} onChangeText={setFirst} placeholder="First" placeholderTextColor={c.textTertiary} autoCapitalize="words" />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.lab, { color: c.textTertiary }]}>LAST NAME</Text>
                    <TextInput style={inputStyle} value={last} onChangeText={setLast} placeholder="Last" placeholderTextColor={c.textTertiary} autoCapitalize="words" />
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={[styles.lab, { color: c.textTertiary }]}>EMAIL</Text>
                  <TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="name@email.com" placeholderTextColor={c.textTertiary} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[styles.lab, { color: c.textTertiary }]}>RELATIONSHIP TO THE WEDDING</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {RELATIONSHIPS.map((r) => {
                      const active = relationship.trim().toLowerCase() === r.toLowerCase();
                      return (
                        <Pressable key={r} onPress={() => setRelationship(r === 'Other' ? '' : r)} style={[styles.chip, active ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { backgroundColor: c.cardAlt, borderColor: c.border }]}>
                          <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: '600' }}>{r}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput style={inputStyle} value={relationship} onChangeText={setRelationship} placeholder="e.g. Partner, Wedding Planner, Maid of Honor…" placeholderTextColor={c.textTertiary} autoCapitalize="words" />
                </View>

                {err ? <Text style={{ color: '#e0584f', fontSize: 13 }}>{err}</Text> : null}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.lg, paddingVertical: Space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.2)' },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: { letterSpacing: 0, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 11, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
});
