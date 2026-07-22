import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/lib/auth';
import { getMyEvents, type EventLite } from '@/lib/planning';

/* One shared "which event am I looking at" for the whole signed-in app. Couples
   usually have one event; some have several. Staff pick an event from the events
   list and land in that same planner. The selection is remembered per user so a
   relaunch reopens where they left off. */

type EventState = {
  loading: boolean;
  /** Events the user can switch between inline (couples/guests). Empty for staff — they use the events list. */
  events: EventLite[];
  /** The currently-selected event (name/date/cover for the header + screens). */
  event: EventLite | null;
  eventId: string | null;
  /** Select an event (from the switcher or the staff list) and remember it. */
  selectEvent: (e: EventLite) => void;
  reload: () => Promise<void>;
};

const EventContext = createContext<EventState>({
  loading: true,
  events: [],
  event: null,
  eventId: null,
  selectEvent: () => {},
  reload: async () => {},
});

const keyFor = (uid: string) => `xos.selectedEvent.${uid}`;

export function EventProvider({ children }: PropsWithChildren) {
  const { profile, session } = useAuth();
  const uid = session?.user.id ?? null;
  const [events, setEvents] = useState<EventLite[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EventLite | null>(null); // resolves the header title for staff picks
  const [loading, setLoading] = useState(true);

  const persist = useCallback(
    (id: string | null) => {
      if (!uid) return;
      if (id) AsyncStorage.setItem(keyFor(uid), id).catch(() => {});
      else AsyncStorage.removeItem(keyFor(uid)).catch(() => {});
    },
    [uid],
  );

  const selectEvent = useCallback(
    (e: EventLite) => {
      setSelected(e);
      setEventId(e.id);
      persist(e.id);
    },
    [persist],
  );

  const load = useCallback(async () => {
    if (!profile || !uid) {
      setEvents([]);
      setEventId(null);
      setSelected(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const saved = await AsyncStorage.getItem(keyFor(uid)).catch(() => null);

    // Staff don't get an inline switcher — they choose from the events list, and
    // always start there on a fresh launch. The selection lives only for the
    // session (set via selectEvent when they open a card).
    if (profile.accountType === 'staff') {
      setEvents([]);
      setSelected(null);
      setEventId(null);
      setLoading(false);
      return;
    }

    const list = await getMyEvents({ clientId: profile.clientId, eventGuestId: profile.eventGuestId });
    setEvents(list);
    const initial = (saved ? list.find((e) => e.id === saved) : undefined) ?? list[0] ?? null;
    setSelected(initial);
    setEventId(initial?.id ?? null);
    if (initial) persist(initial.id);
    setLoading(false);
  }, [profile, uid, persist]);

  useEffect(() => {
    load();
  }, [load]);

  const event = useMemo(
    () => events.find((e) => e.id === eventId) ?? (selected && selected.id === eventId ? selected : null),
    [events, eventId, selected],
  );

  return (
    <EventContext.Provider value={{ loading, events, event, eventId, selectEvent, reload: load }}>
      {children}
    </EventContext.Provider>
  );
}

export const useEvent = () => useContext(EventContext);
