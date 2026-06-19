import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card, useC } from '@/components/ui';
import { AiPicks } from '@/components/AiPicks';
import { Brand, Radius, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { addSong, loadSection, saveAnswer, questionVisible, type QuestionRow, type SongRow } from '@/lib/planning';
import { supabase } from '@/lib/supabase';

export default function SectionScreen() {
  const c = useC();
  const router = useRouter();
  const { session } = useAuth();
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const [meta, setMeta] = useState<{ title: string; icon: string | null; intro: string | null; songs_enabled: boolean } | null>(null);
  const [eventName, setEventName] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || !eventId) return;
    const [{ data: m }, { data: ev }, sec] = await Promise.all([
      supabase.from('planning_sections').select('title, icon, intro, songs_enabled').eq('id', id).maybeSingle(),
      supabase.from('events').select('name').eq('id', eventId).maybeSingle(),
      loadSection(eventId, id),
    ]);
    setMeta(m ?? { title: 'Section', icon: null, intro: null, songs_enabled: false });
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ color: Brand.purpleLight, fontSize: 16 }}>‹ Back</Text></Pressable>
          {visible.length > 0 && <Text style={{ color: c.textTertiary, fontSize: 13 }}>{answeredCount}/{visible.length}</Text>}
        </View>
        <ScrollView contentContainerStyle={{ padding: Space.lg, paddingBottom: Space.xxl * 2, gap: Space.lg }}>
          <View>
            <Text style={[styles.title, { color: c.text }]}>{meta?.icon ? `${meta.icon} ` : ''}{meta?.title}</Text>
            {meta?.intro ? <Text style={{ color: c.textSecondary, marginTop: 4 }}>{meta.intro}</Text> : null}
          </View>

          {meta?.songs_enabled && (
            <AiPicks
              eventId={eventId}
              eventName={eventName}
              sectionTitle={meta.title}
              existingTitles={new Set(songs.map((s) => s.title.toLowerCase()))}
              onAdd={async (rec) => {
                const row = await addSong(eventId, id, { title: rec.title, artist: rec.artist, artwork_url: rec.artwork_url, preview_url: rec.preview_url });
                if (row) setSongs((prev) => [...prev, row]);
              }}
            />
          )}

          {songs.length > 0 && (
            <View style={{ gap: Space.sm }}>
              <Text style={[styles.lab, { color: c.textTertiary }]}>SONGS</Text>
              {songs.map((s) => (
                <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.sm }}>
                  {s.artwork_url ? (
                    <Image source={{ uri: s.artwork_url }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}><Text>🎵</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '600' }} numberOfLines={1}>{s.must_play ? '⭐ ' : ''}{s.title}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 13 }} numberOfLines={1}>{s.artist}</Text>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {visible.length > 0 && (
            <View style={{ gap: Space.xl }}>
              {songs.length > 0 && <Text style={[styles.lab, { color: c.textTertiary }]}>QUESTIONS</Text>}
              {visible.map((q) => (
                <QuestionField
                  key={q.id}
                  q={q}
                  value={answers[q.id] ?? ''}
                  onChange={(v) => setLocal(q.id, v)}
                  onPersist={(v) => persist(q.id, v)}
                  onPick={(v) => pick(q.id, v)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuestionField({
  q,
  value,
  onChange,
  onPersist,
  onPick,
}: {
  q: QuestionRow;
  value: string;
  onChange: (v: string) => void;
  onPersist: (v: string) => void;
  onPick: (v: string) => void;
}) {
  const c = useC();
  const answered = value.trim() !== '';
  const opts = q.options.map((o) => (typeof o === 'string' ? o : o.label));

  return (
    <View style={{ gap: Space.sm }}>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>
        {answered ? '✅ ' : ''}{q.prompt}
      </Text>
      {q.help_text ? <Text style={{ color: c.textTertiary, fontSize: 12, marginTop: -4 }}>{q.help_text}</Text> : null}

      {q.answer_type === 'long' || q.answer_type === 'short' ? (
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }, q.answer_type === 'long' && { minHeight: 90, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          onBlur={() => onPersist(value)}
          multiline={q.answer_type === 'long'}
          placeholder="Type your answer…"
          placeholderTextColor={c.textTertiary}
        />
      ) : q.answer_type === 'yesno' ? (
        <View style={{ flexDirection: 'row', gap: Space.sm }}>
          {['Yes', 'No'].map((o) => <Chip key={o} label={o} active={value === o} onPress={() => onPick(o)} />)}
        </View>
      ) : q.answer_type === 'scale' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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
                <Text style={{ color: active ? Brand.purple : c.textSecondary, fontSize: 12, padding: 6 }} numberOfLines={1}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        // select / multiselect
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          {opts.map((o) => {
            const selected = q.answer_type === 'multiselect' ? value.split('|').includes(o) : value === o;
            return (
              <Chip
                key={o}
                label={o}
                active={selected}
                onPress={() => {
                  if (q.answer_type === 'multiselect') {
                    const set = new Set(value ? value.split('|').filter(Boolean) : []);
                    if (set.has(o)) set.delete(o); else set.add(o);
                    onPick(Array.from(set).join('|'));
                  } else onPick(o);
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function Chip({ label, active, onPress, square }: { label: string; active: boolean; onPress: () => void; square?: boolean }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      style={[
        { borderWidth: 1, borderRadius: square ? Radius.sm : Radius.pill, paddingVertical: 9, paddingHorizontal: square ? 0 : 16, minWidth: square ? 38 : undefined, alignItems: 'center' },
        active ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { borderColor: c.border, backgroundColor: c.card },
      ]}>
      <Text style={{ color: active ? '#fff' : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.md },
  title: { fontSize: 24, fontWeight: '800' },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Space.lg, paddingVertical: 12, fontSize: 16 },
  imgOpt: { width: 96, borderWidth: 2, borderRadius: Radius.md, overflow: 'hidden' },
});
