import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { MusicRecord } from '@/components/music/MusicRecord';
import { ContentColumn } from '@/components/ui';
import { useAddMusic } from '@/components/music/AddMusicSheet';
import { buildMusicRecord, defaultMoment, type MusicMoment } from '@/components/music/model';
import { EventSwitcher } from '@/components/EventSwitcher';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useEvent } from '@/lib/events';
import { loadEventSongs, loadOverview } from '@/lib/planning';

export default function MusicScreen() {
  const router = useRouter();
  const { t } = useT();
  const { profile } = useAuth();
  const { eventId, events, loading: eventLoading } = useEvent();
  const [moments, setMoments] = useState<MusicMoment[] | null>(null);
  const [switcher, setSwitcher] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) {
      setMoments([]);
      return;
    }
    try {
      const [overview, songs] = await Promise.all([loadOverview(eventId), loadEventSongs(eventId)]);
      setMoments(buildMusicRecord(overview.groups, songs));
    } catch {
      setMoments([]);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = useMemo(
    () => (moments ?? []).filter((m) => m.id !== 'do-not-play').map((m) => ({
      id: m.id,
      title: m.title,
      label: `${m.side}${m.index}`,
    })),
    [moments],
  );

  const music = useAddMusic({
    eventId: eventId ?? '',
    sections,
    onAdded: () => { load(); },
    onReload: () => { load(); },
  });

  const target = defaultMoment(moments ?? []);
  const isStaff = profile?.accountType === 'staff';
  const canSwitch = isStaff || events.length > 1;

  const requireMoment = (run: (moment: MusicMoment) => void) => {
    if (eventLoading || moments === null) return;
    if (!target) {
      Alert.alert(t('record.noMoments'), t('record.noMomentsBody'));
      return;
    }
    run(target);
  };

  const openMoment = (moment: MusicMoment) => {
    if (!eventId || moment.id === 'do-not-play') return;
    router.push({ pathname: '/section/[id]', params: { id: moment.id, eventId } });
  };

  return (
    <View style={{ flex: 1 }}>
      <ContentColumn fill>
      <MusicRecord
        moments={moments ?? []}
        loading={eventLoading || moments === null}
        onOpenMoment={openMoment}
        onAddToMoment={(moment) => music.open({ sectionId: moment.id, segment: 'search' })}
        onAddMusic={() => requireMoment((moment) => music.open({ sectionId: moment.id, segment: 'search' }))}
        onImport={() => requireMoment((moment) => music.open({ sectionId: moment.id, segment: 'import' }))}
        onSearch={() => requireMoment((moment) => music.open({ sectionId: moment.id, segment: 'search' }))}
        onSwitchEvent={canSwitch ? () => (isStaff ? router.push('/events') : setSwitcher(true)) : undefined}
      />
      </ContentColumn>
      {music.sheet}
      {events.length > 1 ? <EventSwitcher visible={switcher} onClose={() => setSwitcher(false)} /> : null}
    </View>
  );
}
