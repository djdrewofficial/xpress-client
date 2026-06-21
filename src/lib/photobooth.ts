import { supabase } from '@/lib/supabase';

/* Photo Booth planner module data layer (mobile).
   - Backdrops are XOS-managed; read directly via Supabase (RLS exposes active ones).
   - Designs come live from TemplatesBooth through the XOS proxy (/api/mobile/booth-*),
     which injects the premium API key server-side — never shipped to the app.
   - The couple's selection persists in event_photobooth_selection (scoped RLS). */

export type Backdrop = { id: string; name: string; image_url: string; category: string | null };

export type BoothDesign = {
  src: string;
  post_url: string | null;
  layout_size: string | null;
  image_type: string | null;
  no_of_images: string | null;
  type: string | null;
  type_name: string | null;
  video_url?: string | null;
  poster?: string | null;
};

export type BoothSelection = { backdrop_id: string | null; design: BoothDesign | null } | null;

export type FilterOption = { value: string; label: string };
export type BoothFilters = {
  layout: FilterOption[];
  image_type: FilterOption[];
  no_of_images: FilterOption[];
};

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Backdrops + selection (direct Supabase) ──────────────────────────────────

export async function listBackdrops(): Promise<Backdrop[]> {
  const { data } = await supabase
    .from('photobooth_backdrops')
    .select('id, name, image_url, category')
    .eq('is_active', true)
    .order('sort_order');
  return (data ?? []) as Backdrop[];
}

export async function getBoothSelection(eventId: string): Promise<BoothSelection> {
  const { data } = await supabase
    .from('event_photobooth_selection')
    .select('backdrop_id, design')
    .eq('event_id', eventId)
    .maybeSingle();
  return (data as BoothSelection) ?? null;
}

export async function saveBackdrop(eventId: string, backdropId: string | null, userId: string): Promise<void> {
  await supabase
    .from('event_photobooth_selection')
    .upsert(
      { event_id: eventId, backdrop_id: backdropId, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'event_id' },
    );
}

export async function saveBoothDesign(eventId: string, design: BoothDesign | null, userId: string): Promise<void> {
  await supabase
    .from('event_photobooth_selection')
    .upsert(
      { event_id: eventId, design, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'event_id' },
    );
}

// ── Designs (XOS proxy → TemplatesBooth) ─────────────────────────────────────

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    for (const key of ['data', 'templates', 'items', 'results', 'rows']) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function normalizeDesigns(payload: unknown): BoothDesign[] {
  return pickArray(payload)
    .map((raw) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const s = (k: string) => (o[k] == null ? null : String(o[k]));
      return {
        src: s('src') ?? s('thumbnail') ?? s('image') ?? '',
        post_url: s('post_url'),
        layout_size: s('layout_size'),
        image_type: s('image_type'),
        no_of_images: s('no_of_images'),
        type: s('type'),
        type_name: s('type_name'),
        video_url: s('video_url'),
        poster: s('poster'),
      } as BoothDesign;
    })
    .filter((d) => d.src);
}

export async function fetchBoothTemplates(params: Record<string, string | number>): Promise<BoothDesign[]> {
  const base = apiBase();
  if (!base) return [];
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== '' && v != null) qs.set(k, String(v));
  try {
    const res = await fetch(`${base}/api/mobile/booth-templates?${qs.toString()}`, { headers: await authHeader() });
    if (!res.ok) return [];
    return normalizeDesigns(await res.json());
  } catch {
    return [];
  }
}

/** TemplatesBooth /filters returns value→label maps (layout_size/image_type/
    no_of_images/type/text_display) and an array for tags. Normalize either to
    {value,label}[]. */
function toOpts(v: unknown): FilterOption[] {
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        x && typeof x === 'object'
          ? {
              value: String((x as Record<string, unknown>).value ?? (x as Record<string, unknown>).slug ?? ''),
              label: String((x as Record<string, unknown>).label ?? (x as Record<string, unknown>).name ?? (x as Record<string, unknown>).value ?? ''),
            }
          : { value: String(x), label: String(x) },
      )
      .filter((o) => o.value);
  }
  if (v && typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>).map(([value, label]) => ({ value, label: String(label) }));
  }
  return [];
}

export async function fetchBoothFilters(): Promise<BoothFilters> {
  const empty: BoothFilters = { layout: [], image_type: [], no_of_images: [] };
  const base = apiBase();
  if (!base) return empty;
  try {
    const res = await fetch(`${base}/api/mobile/booth-filters`, { headers: await authHeader() });
    if (!res.ok) return empty;
    const o = (await res.json()) as Record<string, unknown>;
    return { layout: toOpts(o.layout_size ?? o.layout), image_type: toOpts(o.image_type), no_of_images: toOpts(o.no_of_images) };
  } catch {
    return empty;
  }
}
