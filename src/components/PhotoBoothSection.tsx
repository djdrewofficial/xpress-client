import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

const PER_PAGE = 24;

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
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
    async (nextPage: number, replace: boolean) => {
      const id = ++reqId.current;
      if (replace) setLoading(true); else setLoadingMore(true);
      const items = await fetchBoothTemplates({
        page: nextPage,
        per_page: PER_PAGE,
        type: 'static', // exclude welcome screens + animated overlays
        tags: active.tags,
        layout: active.layout,
        no_of_images: active.no_of_images,
      });
      if (id !== reqId.current) return;
      setHasMore(items.length >= PER_PAGE);
      setDesigns((prev) => (replace ? items : [...prev, ...items]));
      setPage(nextPage);
      setLoading(false);
      setLoadingMore(false);
    },
    [active],
  );

  useEffect(() => { loadDesigns(1, true); }, [loadDesigns]);

  const setFilter = (key: 'tags' | 'layout' | 'no_of_images', value: string) =>
    setActive((p) => ({ ...p, [key]: value }));

  const chooseBackdrop = (b: Backdrop) => {
    setBackdropId(b.id);
    if (userId) saveBackdrop(eventId, b.id, userId);
  };
  const chooseDesign = (d: BoothDesign) => {
    setDesign(d);
    if (userId) saveBoothDesign(eventId, d, userId);
  };

  const cardW = Math.min(280, width * 0.72);

  return (
    <View style={{ gap: Space.xl }}>
      <View style={[styles.why, { backgroundColor: Brand.purple + '14', borderColor: Brand.purple + '33' }]}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>📸 Design your photo booth</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
          Swipe through our backdrops and photo-strip designs, then tap to pick your favorites. Your choices go straight to our team.
        </Text>
      </View>

      {/* ── Backdrops ── */}
      <View style={{ gap: Space.sm }}>
        <Text style={[styles.lab, { color: c.textTertiary }]}>BACKDROP{backdropId ? ' · SELECTED' : ''}</Text>
        {backdrops.length === 0 ? (
          <Text style={{ color: c.textTertiary, fontSize: 13, paddingVertical: Space.md }}>No backdrops available yet — check back soon!</Text>
        ) : (
          <FlatList
            data={backdrops}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardW + Space.md}
            decelerationRate="fast"
            contentContainerStyle={{ gap: Space.md, paddingRight: Space.lg }}
            renderItem={({ item: b }) => {
              const sel = b.id === backdropId;
              return (
                <Pressable onPress={() => chooseBackdrop(b)} style={[styles.bdCard, Shadow.card, { width: cardW, borderColor: sel ? Brand.purple : c.border, backgroundColor: c.card }]}>
                  <Image source={{ uri: b.image_url }} style={{ width: '100%', height: cardW * 1.25 }} contentFit="cover" />
                  {sel && <View style={styles.check}><Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text></View>}
                  <View style={styles.bdLabel}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{b.name}</Text>
                    {b.category ? <Text style={{ color: '#ffffffcc', fontSize: 11 }} numberOfLines={1}>{b.category}</Text> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* ── Designs ── */}
      <View style={{ gap: Space.sm }}>
        <Text style={[styles.lab, { color: c.textTertiary }]}>PHOTO-STRIP DESIGN{design ? ` · ${(design.type_name ?? 'SELECTED').toUpperCase()}` : ''}</Text>

        {/* Filters */}
        <FilterRow label="Theme" options={CATEGORIES} active={active.tags} onPick={(v) => setFilter('tags', v)} c={c} />
        <FilterRow label="Size" options={LAYOUTS} active={active.layout} onPick={(v) => setFilter('layout', v)} c={c} />
        <FilterRow label="Photos" options={PHOTO_COUNTS} active={active.no_of_images} onPick={(v) => setFilter('no_of_images', v)} c={c} />

        {loading ? (
          <ActivityIndicator color={Brand.purple} style={{ marginVertical: Space.lg }} />
        ) : designs.length === 0 ? (
          <Text style={{ color: c.textTertiary, fontSize: 13, paddingVertical: Space.md }}>No designs match these options.</Text>
        ) : (
          <FlatList
            data={designs}
            keyExtractor={(d, i) => `${d.src}-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Space.sm, paddingRight: Space.lg }}
            onEndReachedThreshold={0.5}
            onEndReached={() => { if (hasMore && !loadingMore) loadDesigns(page + 1, false); }}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={Brand.purple} style={{ marginLeft: Space.md, alignSelf: 'center' }} /> : null}
            renderItem={({ item: d }) => {
              const sel = design?.src === d.src;
              return (
                <Pressable onPress={() => chooseDesign(d)} style={[styles.dCard, { borderColor: sel ? Brand.purple : c.border, backgroundColor: c.cardAlt }]}>
                  <Image source={{ uri: d.src }} style={{ width: 130, height: 200 }} contentFit="contain" />
                  {sel && <View style={styles.check}><Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text></View>}
                  {(d.no_of_images || d.type_name) ? (
                    <View style={styles.dLabel}>
                      {d.no_of_images ? <Text style={styles.tag}>{d.no_of_images}</Text> : null}
                      {d.type_name ? <Text style={styles.tag} numberOfLines={1}>{d.type_name}</Text> : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
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
  bdCard: { borderRadius: Radius.lg, borderWidth: 2, overflow: 'hidden' },
  bdLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Space.sm, backgroundColor: '#00000066' },
  dCard: { borderRadius: Radius.md, borderWidth: 2, overflow: 'hidden' },
  dLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 5, backgroundColor: '#00000066' },
  tag: { color: '#fff', fontSize: 9, fontWeight: '700', backgroundColor: '#ffffff33', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  check: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.purple, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
});
