import { Redirect } from 'expo-router';

import { Gallery } from '@/components/ui/Gallery';

/**
 * Dev-only component gallery. Not linked from any screen and not auto-opened.
 * Production builds redirect away so the route never presents.
 */
export default function DevGalleryRoute() {
  if (!__DEV__) return <Redirect href="/login" />;
  return <Gallery />;
}
