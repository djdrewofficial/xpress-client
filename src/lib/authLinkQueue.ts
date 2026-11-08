import * as Linking from 'expo-linking';

/**
 * Captures the launch URL as soon as the root layout is imported, including
 * links that arrive while the splash is still up. IncomingLinks subscribes
 * after that splash and drains anything buffered.
 */

type UrlListener = (url: string) => void;

const listeners = new Set<UrlListener>();
const buffer: string[] = [];

function publish(url: string | null) {
  if (!url) return;
  if (listeners.size === 0) {
    buffer.push(url);
    return;
  }
  for (const listener of listeners) listener(url);
}

export function subscribeAuthUrls(listener: UrlListener): () => void {
  listeners.add(listener);
  const pending = buffer.splice(0, buffer.length);
  for (const url of pending) listener(url);
  return () => {
    listeners.delete(listener);
  };
}

try {
  Linking.getInitialURL().then(publish).catch(() => {});
  Linking.addEventListener('url', (event) => publish(event.url));
} catch {
  // A static web render has no Linking bridge. Cold start on device still subscribes.
}
