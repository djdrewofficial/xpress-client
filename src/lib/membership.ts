import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-event role. One login can be a host of one event and a guest of another.
 * A stored role wins. An event_guest account with no stored role for this event is a guest.
 */

export type AppEventRole = 'host' | 'guest' | 'staff';

const memory = new Map<string, string>();
let accountType: string | null = null;

function storageKey(uid: string, eventId: string) {
  return `xpress.memberRole.${uid}.${eventId}`;
}

export function noteAccountType(next: string | null) {
  accountType = next;
}

export function resetMembershipMemory() {
  memory.clear();
  accountType = null;
}

export async function hydrateMembership(uid: string) {
  memory.clear();
  const prefix = `xpress.memberRole.${uid}.`;
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((key) => key.startsWith(prefix));
  if (!mine.length) return;
  const pairs = await AsyncStorage.multiGet(mine);
  for (const [key, value] of pairs) {
    if (value) memory.set(key.slice(prefix.length), value);
  }
}

export async function rememberMembership(uid: string, eventId: string, role: string) {
  memory.set(eventId, role);
  await AsyncStorage.setItem(storageKey(uid, eventId), role);
}

/** Guest when this event was joined as a guest, or the account itself is an event guest. */
export function roleForEvent(eventId: string): string | null {
  return memory.get(eventId) ?? (accountType === 'event_guest' ? 'guest' : null);
}

/** Role for the event on screen. Staff stays staff on every event. */
export function viewerRole(
  event: { id: string; role?: string | null } | null | undefined,
  accountType: string | null | undefined,
): AppEventRole | null {
  if (accountType === 'staff') return 'staff';
  if (event?.role === 'host' || event?.role === 'guest') return event.role;
  if (event) {
    const stored = memory.get(event.id);
    if (stored === 'host' || stored === 'guest') return stored;
  }
  if (accountType === 'event_guest') return 'guest';
  if (accountType === 'client') return 'host';
  return null;
}

/** Hosts and staff plan the event. Guests only fill open sections. */
export function managesEvent(
  event: { id: string; role?: string | null } | null | undefined,
  accountType: string | null | undefined,
): boolean {
  const role = viewerRole(event, accountType);
  return role === 'host' || role === 'staff';
}
