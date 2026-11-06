import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiBase, authorizedFetch } from '@/lib/api';

/* Couple-uploaded "official timeline from the planner". Picks a PDF/image and
   uploads it to the event's private files via the XOS mobile endpoint. */

export type PlannerTimelineFile = { id: string; name: string; created_at: string } | null;

export async function getPlannerTimeline(eventId: string): Promise<PlannerTimelineFile> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await authorizedFetch(`${base}/api/mobile/planner-timeline?eventId=${encodeURIComponent(eventId)}`);
    const json = (await res.json().catch(() => ({}))) as { file?: PlannerTimelineFile };
    return res.ok ? json.file ?? null : null;
  } catch {
    return null;
  }
}

/** Where the couple's timeline comes from. */
export type PlannerSource = 'files' | 'gallery';

/** Pick a timeline — a PDF/image from Files, or a photo from the gallery — and
    upload it. Returns the saved name, null if cancelled, or throws with a message
    on failure. */
export async function pickAndUploadPlannerTimeline(eventId: string, source: PlannerSource = 'files'): Promise<{ name: string } | null> {
  let file: { uri: string; name: string; type: string } | null = null;

  if (source === 'gallery') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo access is needed to pick from your library. You can enable it in Settings.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    const ext = (a.mimeType ?? 'image/jpeg').split('/')[1] || 'jpg';
    file = { uri: a.uri, name: a.fileName || `planner-timeline.${ext}`, type: a.mimeType || 'image/jpeg' };
  } else {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
    if (picked.canceled || !picked.assets?.length) return null;
    const a = picked.assets[0];
    file = { uri: a.uri, name: a.name || 'planner-timeline.pdf', type: a.mimeType || 'application/pdf' };
  }

  return uploadPlannerFile(eventId, file);
}

async function uploadPlannerFile(eventId: string, file: { uri: string; name: string; type: string }): Promise<{ name: string }> {
  const base = apiBase();
  if (!base) throw new Error('Not signed in.');

  const form = new FormData();
  form.append('eventId', eventId);
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await authorizedFetch(`${base}/api/mobile/planner-timeline`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; error?: string };
    if (res.status === 403) throw new Error(json.error || 'Guests cannot upload the planner timeline.');
    if (!res.ok || !json.ok) throw new Error(json.error || 'Upload failed.');
    return { name: json.name || file.name || 'Timeline' };
  } catch (e) {
    if (controller.signal.aborted) throw new Error('Upload timed out — please check your connection.');
    throw e instanceof Error ? e : new Error('Upload failed.');
  } finally {
    clearTimeout(timer);
  }
}
