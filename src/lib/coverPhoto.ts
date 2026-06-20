import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/* Couple-uploaded event header photo. Picks from the library, then POSTs it to
   the XOS mobile API (which verifies access and stores it via the admin client —
   clients can't write events.cover_photo_url directly under RLS). */

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

async function authToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Open the photo library and return the chosen asset (or null if cancelled). */
export async function pickCoverImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo access is needed to choose a header photo.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 10],
    quality: 0.85,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0];
}

/** Upload the asset as the event's cover photo. Returns the public URL. */
export async function uploadCoverPhoto(eventId: string, asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const base = apiBase();
  if (!base) throw new Error('App is not configured (EXPO_PUBLIC_API_URL).');
  const token = await authToken();
  if (!token) throw new Error('You are signed out.');

  const name = asset.fileName || `cover.${(asset.mimeType ?? 'image/jpeg').split('/')[1] || 'jpg'}`;
  const form = new FormData();
  form.append('eventId', eventId);
  // React Native FormData file shape
  form.append('photo', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);

  const res = await fetch(`${base}/api/mobile/cover-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // let fetch set the multipart boundary
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
  return json.url ?? '';
}
