import { supabase } from '@/lib/supabase';

/* Social-handle prompt. The RPCs are SECURITY DEFINER and scope to the logged-in
   user: social_prompt_state stamps first sign-in + tells us whether to show the
   prompt (clients/guests only, 24h after first sign-in, not yet answered);
   save_social_handles writes the handles to their profile and marks it done. */

export type SocialPromptState = {
  should_show: boolean;
  instagram: string | null;
  tiktok: string | null;
  company_instagram: string | null;
  company_tiktok: string | null;
};

export async function getSocialPromptState(): Promise<SocialPromptState | null> {
  const { data, error } = await supabase.rpc('social_prompt_state');
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as SocialPromptState | undefined;
  return row ?? null;
}

export async function saveSocialHandles(instagram: string | null, tiktok: string | null): Promise<void> {
  await supabase.rpc('save_social_handles', { p_instagram: instagram, p_tiktok: tiktok });
}
