import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { useC } from '@/components/ui';
import { Brand, Radius, Shadow, Space } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import {
  fetchBoothTemplates,
  getBoothSelection,
  listBackdrops,
  saveBackdrop,
  saveBoothDesign,
  type Backdrop,
  type BoothDesign,
} from '@/lib/photobooth';

const PER_PAGE = 12; // grid page size
const GAP = 10;

type Opt = { value: string; label: string };

// Curated, fixed option sets. Designs are always static (no welcome screens /
// animated overlays) and one of these themes + sizes + photo counts.
// TemplatesBooth `tags` filters by tag ID (slugs are ignored). IDs from /filters.
const CATEGORIES: Opt[] = [
  { value: '6', label: 'Wedding' },
  { value: '31', label: 'Minimalist' },
  { value: '258', label: 'Corporate' },
];
const LAYOUTS: Opt[] = [
  { value: '26strip', label: '2×6 Strip' },
  { value: '46postcard-l', label: '4×6 Horizontal' },
];
const PHOTO_COUNTS: Opt[] = [
  { value: '1images', label: '1 photo' },
  { value: '3images', label: '3 photos' },
];

export function PhotoBoothSection({ eventId }: { eventId: string }) {
  const c = useC();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);
  const [backdropId, setBackdropId] = useState<string | null>(null);
  const [design, setDesign] = useState<BoothDesign | null>(null);

  // All three required (single-select). Defaults: Wedding · 2×6 Strip · 3 photos.
  const [active, setActive] = useState<{ tags: string; layout: string; no_of_images: string }>({
    tags: '6', // Wedding
    layout: '26strip',
    no_of_images: '3images',
  });

  const [designs, setDesigns] = useState<BoothDesign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<BoothDesign | null>(null);
  const reqId = useRef(0);

  // Initial: selection + backdrops.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [sel, bds] = await Promise.all([getBoothSelection(eventId), listBackdrops()]);
      if (!alive) return;
      setBackdrops(bds);
      setBackdropId(sel?.backdrop_id ?? null);
      setDesign(sel?.design ?? null);
    })();
    return () => { alive = false; };
  }, [eventId]);

  const loadDesigns = useCallback(
    async (nextPage: number) => {
      const id = ++reqId.current;
      setLoading(true);
      const { designs: items, totalPages: tp } = await fetchBoothTemplates({
        page: nextPage,
        per_page: PER_PAGE,
        type: 'static', // exclude welcome screens + animated overlays
        tags: active.tags,
        layout: active.layout,
        no_of_images: active.no_of_images,
      });
      if (id !== reqId.current) return;
      setDesigns(items);
      setTotalPages(tp);
      setPage(nextPage);
      setLoading(false);
    },
    [active],
  );

  // Reload page 1 whenever filters change.
  useEffect(() => { loadDesigns(1); }, [loadDesigns]);

  const setFilter = (key: 'tags' | 'layout' | 'no_of_images', value: string) =>
    setActive((p) => ({ ...p, [key]: value }));

  const chooseBackdrop = (b: Backdrop) => {
    setBackdropId(b.id);
    if (userId) saveBackdrop(eventId, b.id, userId);
  };
  const applyDesign = (d: BoothDesign) => {
    setDesign(d);
    setPreview(null);
    if (userId) saveBoothDesign(eventId, d, userId);
  };
  // From the preview modal — confirm before replacing an existing pick.
  const useDesign = (d: BoothDesign) => {
    if (design && design.src !== d.src) {
      Alert.alert(
        'Replace your design?',
        'You already picked a photo-strip design. Using this one will replace your current selection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use This Design', style: 'destructive', onPress: () => applyDesign(d) },
        ],
      );
    } else {
      applyDesign(d);
    }
  };

  // Two-column grid sized to the screen (the section sits inside a ScrollView,
  // so we lay items out with flex-wrap rather than a nested FlatList).
  const cardW = Math.floor((width - Space.lg * 2 - GAP) / 2);

  return (
    <View style={{ gap: Space.xl }}>
      <View style={[styles.why, { backgroundColor: Brand.purple + '14', borderColor: Brand.purple + '33' }]}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>📸 Design your photo booth</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
          Browse our backdrops and photo-strip designs, then tap to pick your favorites. Your choices go straight to our team.
        </Text>
      </View>

      {/* ── Backdrops ── */}
      <View style={{ gap: Space.sm }}>
        <Text style={[styles.lab, { color: c.textTertiary }]}>BACKDROP{backdropId ? ' · SELECTED' : ''}</Text>
        {backdrops.length === 0 ? (
          <Text style={{ color: c.textTertiary, fontSize: 13, paddingVertical: Space.md }}>No backdrops available yet — check back soon!</Text>
        ) : (
          <View style={styles.grid}>
            {backdrops.map((b) => {
              const sel = b.id === backdropId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => chooseBackdrop(b)}
                  style={[styles.bdCard, Shadow.card, { width: cardW, borderColor: sel ? Brand.purple : c.border, backgroundColor: c.card }]}
                >
                  <Image source={{ uri: b.image_url }} style={{ width: '100%', height: cardW * 1.2 }} contentFit="cover" />
                  {sel && <View style={styles.check}><Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text></View>}
                  <View style={styles.bdLabel}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{b.name}</Text>
                    {b.category ? <Text style={{ color: '#ffffffcc', fontSize: 11 }} numberOfLines={1}>{b.category}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Designs ── */}
      <View style={{ gap: Space.sm }}>
        <Text style={[styles.lab, { color: c.textTertiary }]}>PHOTO-STRIP DESIGN{design ? ' · SELECTED' : ''}</Text>

        {/* Filters */}
        <FilterRow label="Theme" options={CATEGORIES} active={active.tags} onPick={(v) => setFilter('tags', v)} c={c} />
        <FilterRow label="Size" options={LAYOUTS} active={active.layout} onPick={(v) => setFilter('layout', v)} c={c} />
        <FilterRow label="Photos" options={PHOTO_COUNTS} active={active.no_of_images} onPick={(v) => setFilter('no_of_images', v)} c={c} />

        {loading ? (
          <ActivityIndicator color={Brand.purple} style={{ marginVertical: Space.xl }} />
        ) : designs.length === 0 ? (
          <Text style={{ color: c.textTertiary, fontSize: 13, paddingVertical: Space.md }}>No designs match these options.</Text>
        ) : (
          <>
            <View style={styles.grid}>
              {designs.map((d, i) => {
                const sel = design?.src === d.src;
                return (
                  <Pressable
                    key={`${d.src}-${i}`}
                    onPress={() => setPreview(d)}
                    style={[styles.dCard, { width: cardW, borderColor: sel ? Brand.purple : c.border, backgroundColor: c.cardAlt }]}
                  >
                    <Image source={{ uri: d.src }} style={{ width: '100%', height: cardW * 1.35, backgroundColor: '#fff' }} contentFit="contain" />
                    {sel && <View style={styles.check}><Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text></View>}
                    {d.no_of_images ? (
                      <View style={styles.dLabel}>
                        <Text style={styles.tag}>{d.no_of_images}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Pager */}
            <View style={styles.pager}>
              <Pressable
                onPress={() => loadDesigns(page - 1)}
                disabled={page <= 1}
                style={[styles.pageBtn, { backgroundColor: c.cardAlt, opacity: page <= 1 ? 0.4 : 1 }]}
              >
                <Text style={{ color: c.text, fontWeight: '700' }}>‹ Prev</Text>
              </Pressable>
              <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600' }}>Page {page} of {totalPages}</Text>
              <Pressable
                onPress={() => loadDesigns(page + 1)}
                disabled={page >= totalPages}
                style={[styles.pageBtn, { backgroundColor: c.cardAlt, opacity: page >= totalPages ? 0.4 : 1 }]}
              >
                <Text style={{ color: c.text, fontWeight: '700' }}>Next ›</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* ── Design preview modal ── */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPreview(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: c.card }]} onPress={() => {}}>
            {preview ? (
              <>
                <Image source={{ uri: preview.src }} style={{ width: '100%', height: 360, backgroundColor: '#fff' }} contentFit="contain" />
                <View style={{ padding: Space.lg, gap: Space.md }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {preview.no_of_images ? <Text style={[styles.metaTag, { backgroundColor: c.cardAlt, color: c.textSecondary }]}>{preview.no_of_images}</Text> : null}
                    {preview.layout_size ? <Text style={[styles.metaTag, { backgroundColor: c.cardAlt, color: c.textSecondary }]}>{preview.layout_size}</Text> : null}
                  </View>
                  {design?.src === preview.src ? (
                    <View style={styles.selectedNote}>
                      <Text style={{ color: '#10b981', fontWeight: '700' }}>✓ This is your selected design</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => useDesign(preview)} style={styles.useBtn}>
                      <Text style={styles.useBtnTxt}>Use This Design</Text>
                    </Pressable>
                  )}
                  {design && design.src !== preview.src ? (
                    <Text style={{ color: '#d9822b', fontSize: 12, textAlign: 'center' }}>This will replace your current selection.</Text>
                  ) : null}
                  <Pressable onPress={() => setPreview(null)} style={styles.closeBtn}>
                    <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FilterRow({
  label, options, active, onPick, c,
}: {
  label: string;
  options: Opt[];
  active: string | undefined;
  onPick: (v: string) => void;
  c: ReturnType<typeof useC>;
}) {
  if (options.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ width: 52, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: c.textTertiary }}>{label.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: Space.lg }}>
        {options.map((o) => {
          const on = active === o.value;
          return (
            <Pressable key={o.value} onPress={() => onPick(o.value)} style={[styles.chip, on ? { backgroundColor: Brand.purple, borderColor: Brand.purple } : { backgroundColor: c.cardAlt, borderColor: c.border }]}>
              <Text style={{ color: on ? '#fff' : c.text, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  why: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.md },
  lab: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  bdCard: { borderRadius: Radius.lg, borderWidth: 2, overflow: 'hidden' },
  bdLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Space.sm, backgroundColor: '#00000066' },
  dCard: { borderRadius: Radius.md, borderWidth: 2, overflow: 'hidden' },
  dLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 5, backgroundColor: '#00000066' },
  tag: { color: '#fff', fontSize: 9, fontWeight: '700', backgroundColor: '#ffffff33', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  check: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.purple, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.lg, marginTop: Space.md },
  pageBtn: { borderRadius: Radius.pill, paddingVertical: 9, paddingHorizontal: 18 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: Radius.lg, overflow: 'hidden' },
  metaTag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
  selectedNote: { backgroundColor: '#10b98122', borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  useBtn: { backgroundColor: Brand.purple, borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  useBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeBtn: { paddingVertical: 10, alignItems: 'center' },
});
