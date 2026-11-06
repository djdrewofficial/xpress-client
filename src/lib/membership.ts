import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Role returned by event-link or join-code redeem, remembered on this device.
 * `event_guest` accounts are guests even when no redeem has been stored yet.
 * Hosts and partners are not filtered.
 */

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
