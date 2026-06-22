import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';

/* Couple-uploaded "official timeline from the planner". Picks a PDF/image and
   uploads it to the event's private files via the XOS mobile endpoint. */

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export type PlannerTimelineFile = { id: string; name: string; created_at: string } | null;

export async function getPlannerTimeline(eventId: string): Promise<PlannerTimelineFile> {
  const base = apiBase();
  const t = await token();
  if (!base || !t) return null;
  try {
    const res = await fetch(`${base}/api/mobile/planner-timeline?eventId=${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = (await res.json().catch(() => ({}))) as { file?: PlannerTimelineFile };
    return res.ok ? json.file ?? null : null;
  } catch {
    return null;
  }
}

/** Pick a PDF/image and upload it. Returns the saved name, or null if cancelled,
    or throws with a message on failure. */
export async function pickAndUploadPlannerTimeline(eventId: string): Promise<{ name: string } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;
  const asset = picked.assets[0];

  const base = apiBase();
  const t = await token();
  if (!base || !t) throw new Error('Not signed in.');

  const form = new FormData();
  form.append('eventId', eventId);
  form.append('file', { uri: asset.uri, name: asset.name || 'planner-timeline.pdf', type: asset.mimeType || 'application/pdf' } as unknown as Blob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${base}/api/mobile/planner-timeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; error?: string };
    if (!res.ok || !json.ok) throw new Error(json.error || 'Upload failed.');
    return { name: json.name || asset.name || 'Timeline' };
  } catch (e) {
    if (controller.signal.aborted) throw new Error('Upload timed out — please check your connection.');
    throw e instanceof Error ? e : new Error('Upload failed.');
  } finally {
    clearTimeout(timer);
  }
}
