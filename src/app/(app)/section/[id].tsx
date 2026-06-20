import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Bar, useC } from '@/components/ui';
import { SongPicker } from '@/components/SongPicker';
import { SectionSongs } from '@/components/SectionSongs';
import { VendorTeam } from '@/components/VendorTeam';
import { PhotoBoothSection } from '@/components/PhotoBoothSection';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { loadSection, saveAnswer, questionVisible, type QuestionRow, type SongRow } from '@/lib/planning';
import { supabase } from '@/lib/supabase';

export default function SectionScreen() {
  const c = useC();
  const router = useRouter();
  const { session } = useAuth();
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const [meta, setMeta] = useState<{ title: string; icon: string | null; intro: string | null; songs_enabled: boolean; ai_picks_enabled: boolean; module: string | null } | null>(null);
  const [eventName, setEventName] = useState('');
  const [picker, setPicker] = useState<'foryou' | 'search' | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || !eventId) return;
    const [{ data: m }, { data: ev }, sec] = await Promise.all([
      supabase.from('planning_sections').select('*').eq('id', id).maybeSingle(),
      supabase.from('events').select('name').eq('id', eventId).maybeSingle(),
      loadSection(eventId, id),
    ]);
    setMeta({
      title: m?.title ?? 'Section',
      icon: m?.icon ?? null,
      intro: m?.intro ?? null,
      songs_enabled: m?.songs_enabled ?? false,
      ai_picks_enabled: m?.ai_picks_enabled ?? false,
      module: m?.module ?? null,
    });
    setEventName(ev?.name ?? '');
    setQuestions(sec.questions);
    setSongs(sec.songs);
    const a: Record<string, string> = {};
    for (const q of sec.questions) a[q.id] = q.answer ?? '';
    setAnswers(a);
    setLoading(false);
  }, [id, eventId]);

  useEffect(() => { load(); }, [load]);

  function setLocal(qid: string, v: string) {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
  }
  function persist(qid: string, v: string) {
    if (session?.user.id) saveAnswer(eventId, qid, v, session.user.id);
  }
  function pick(qid: string, v: string) {
    setLocal(qid, v);
    persist(qid, v);
  }

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={Brand.purple} /></View>;
  }

  const visible = questions.filter((q) => questionVisible(q, answers));
  const answeredCount = visible.filter((q) => (answers[q.id] ?? '').trim() !== '').length;
  const pct = visible.length > 0 ? Math.round((answeredCount / visible.length) * 100) : 0;
  const isDoNotPlay = /do ?not play|don'?t play|dont play/i.test(meta?.title ?? '');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={{ color: Brand.purpleLight, fontSize: 16, fontWeight: '600' }}>‹</Text>
            <Text style={{ color: Brand.purpleLight, fontSize: 16 }}>Back</Text>
          </Pressable>
          {visible.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: c.cardAlt }]}>
              <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>{answeredCount}/{visible.length}</Text>
            </View>
          )}
        </View>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 2, gap: Space.lg }}>
          <View style={{ gap: Space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.sm }}>
              {meta?.icon ? <Text style={{ fontSize: 26 }}>{meta.icon}</Text> : null}
              <Text style={[styles.title, { color: c.text, flex: 1 }]}>{meta?.title}</Text>
            </View>
            {meta?.intro ? <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>{meta.intro}</Text> : null}
            {visible.length > 0 && (
              <View style={{ gap: 6, marginTop: 2 }}>
                <Bar pct={pct} height={6} track={c.cardAlt} />
                <Text style={{ color: c.textTertiary, fontSize: 12, fontWeight: '600' }}>
                  {answeredCount === visible.length ? '✓ All answered' : `${answeredCount} of ${visible.length} answered`}
                </Text>
              </View>
            )}
          </View>

          {meta?.module === 'photobooth' ? (
            <PhotoBoothSection eventId={eventId} />
          ) : meta?.module === 'vendors' ? (
            <VendorTeam eventId={eventId} />
          ) : (
            <>
              {meta?.songs_enabled && (
                <View style={{ flexDirection: 'row', gap: Space.sm }}>
                  {meta.ai_picks_enabled && (
                    <Pressable onPress={() => setPicker('foryou')} style={({ pressed }) => [styles.actionBtn, { backgroundColor: Brand.purple, opacity: pressed ? 0.9 : 1 }]}>
                      <Text style={styles.actionTxt}>✨ For You</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setPicker('search')} style={({ pressed }) => [styles.actionBtn, { backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}>
                    <Text style={[styles.actionTxt, { color: c.text }]}>＋ Add music</Text>
                  </Pressable>
                </View>
              )}

              {songs.length > 0 && (
                <View style={{ gap: Space.sm }}>
                  <Text style={[styles.lab, { color: c.textTertiary }]}>YOUR SONGS</Text>
                  <SectionSongs songs={songs} setSongs={setSongs} allowMustPlay={!isDoNotPlay} allowDoNotPlay={isDoNotPlay} />
                </View>
              )}

              {visible.length > 0 && (
                <View style={{ gap: Space.md }}>
                  {songs.length > 0 && <Text style={[styles.lab, { color: c.textTertiary }]}>QUESTIONS</Text>}
                  {visible.map((q, i) => (
                    <QuestionField
                      key={q.id}
                      q={q}
                      index={i + 1}
                      value={answers[q.id] ?? ''}
                      onChange={(v) => setLocal(q.id, v)}
                      onPersist={(v) => persist(q.id, v)}
                      onPick={(v) => pick(q.id, v)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {meta && (
          <SongPicker
            visible={picker !== null}
            mode={picker ?? 'search'}
            onClose={() => setPicker(null)}
            eventId={eventId}
            eventName={eventName}
            sectionId={id}
            sectionTitle={meta.title}
            existingTitles={new Set(songs.map((s) => s.title.toLowerCase()))}
            onAdded={(row) => setSongs((prev) => (prev.some((s) => s.id === row.id) ? prev : [...prev, row]))}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function QuestionField({
  q,
  index,
  value,
  onChange,
  onPersist,
  onPick,
}: {
  q: QuestionRow;
  index: number;
  value: string;
  onChange: (v: string) => void;
  onPersist: (v: string) => void;
  onPick: (v: string) => void;
}) {
  const c = useC();
  const answered = value.trim() !== '';
  const opts = q.options.map((o) => (typeof o === 'string' ? o : o.label));
  // Hierarchical options: a parent reveals its children once selected.
  const entries = q.options.map((o) =>
    typeof o === 'string' ? { label: o, children: [] as string[] } : { label: o.label, children: Array.isArray(o.children) ? o.children : [] },
  );
  const hasTree = entries.some((e) => e.children.length > 0);
  const selSet = new Set(value ? value.split('|').filter(Boolean) : []);
  const setMulti = (next: Set<string>) => onPick(Array.from(next).join('|'));
  const toggleVal = (v: string) => {
    const next = new Set(selSet);
    if (next.has(v)) next.delete(v); else next.add(v);
    setMulti(next);
  };
  const toggleParent = (e: { label: string; children: string[] }) => {
    const next = new Set(selSet);
    if (next.has(e.label)) { next.delete(e.label); e.children.forEach((ch) => next.delete(ch)); }
    else next.add(e.label);
    setMulti(next);
  };

  return (
    <View style={[styles.qCard, Shadow.card, { backgroundColor: c.card, borderColor: answered ? Brand.purple + '55' : c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }}>
        <View style={[styles.qNum, { backgroundColor: answered ? Brand.purple : c.cardAlt }]}>
          <Text style={{ color: answered ? '#fff' : c.textTertiary, fontSize: 12, fontWeight: '800' }}>{answered ? '✓' : index}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', lineHeight: 21 }}>{q.prompt}</Text>
          {q.help_text ? <Text style={{ color: c.textTertiary, fontSize: 12, lineHeight: 17 }}>{q.help_text}</Text> : null}
        </View>
      </View>

      <View style={{ marginTop: Space.md }}>
        {q.answer_type === 'long' || q.answer_type === 'short' ? (
          <TextInput
            style={[styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }, q.answer_type === 'long' && { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' }]}
            value={value}
            onChangeText={onChange}
            onBlur={() => onPersist(value)}
            multiline={q.answer_type === 'long'}
            placeholder="Type your answer…"
            placeholderTextColor={c.textTertiary}
          />
        ) : q.answer_type === 'yesno' ? (
          <View style={{ flexDirection: 'row', gap: Space.sm }}>
            {['Yes', 'No'].map((o) => <Chip key={o} label={o} active={value === o} onPress={() => onPick(o)} grow />)}
          </View>
        ) : q.answer_type === 'scale' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => <Chip key={n} label={n} active={value === n} onPress={() => onPick(n)} square />)}
          </View>
        ) : q.answer_type === 'image_select' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {q.options.map((o, i) => {
              const label = typeof o === 'string' ? o : o.label;
              const image = typeof o === 'string' ? null : o.image;
              const active = value === label;
              return (
                <Pressable key={i} onPress={() => onPick(label)} style={[styles.imgOpt, { borderColor: active ? Brand.purple : c.border }]}>
                  {image ? <Image source={{ uri: image }} style={{ width: 96, height: 96 }} /> : <View style={{ width: 96, height: 96, backgroundColor: c.cardAlt }} />}
                  <Text style={{ color: active ? Brand.purpleLight : c.textSecondary, fontSize: 12, padding: 6, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : q.answer_type === 'multiselect' && hasTree ? (
          <View style={{ gap: Space.sm }}>
            {entries.map((e) => {
              const sel = selSet.has(e.label);
              return (
                <View key={e.label} style={{ gap: 6 }}>
                  <Chip label={e.label} active={sel} onPress={() => toggleParent(e)} />
                  {sel && e.children.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: Space.md }}>
                      {e.children.map((ch) => <Chip key={ch} label={ch} active={selSet.has(ch)} onPress={() => toggleVal(ch)} />)}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {opts.map((o) => {
              const selected = q.answer_type === 'multiselect' ? selSet.has(o) : value === o;
              return (
                <Chip key={o} label={o} active={selected} onPress={() => (q.answer_type === 'multiselect' ? toggleVal(o) : onPick(o))} />
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress, square, grow }: { label: string; active: boolean; onPress: () => void; square?: boolean; grow?: boolean }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        square && { minWidth: 44, paddingHorizontal: 0, alignItems: 'center' },
        grow && { flex: 1, alignItems: 'center' },
        active ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { borderColor: c.border, backgroundColor: c.cardAlt },
      ]}>
      <Text style={{ color: active ? '#fff' : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  countPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.pill },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Space.sm },
  qCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.lg },
  qNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  actionBtn: { flex: 1, borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  actionTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, fontSize: 16 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 18 },
  imgOpt: { width: 96, borderWidth: 2, borderRadius: Radius.md, overflow: 'hidden' },
});
