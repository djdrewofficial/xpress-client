import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button, useC, useScheme } from '@/components/ui';
import { SongPicker } from '@/components/SongPicker';
import { useAuth } from '@/lib/auth';
import { useEvent } from '@/lib/events';
import { useT } from '@/lib/i18n';
import { loadOverview, setMustPlay, type SectionRow, type SongRow } from '@/lib/planning';
import { Type } from '@/lib/theme';

/**
 * First-song step kept from the earlier onboarding work: add one dance-floor
 * track, mark it must-play, then celebrate. The old welcome slide is gone.
 */
export function FirstSongStep({
  onSkip,
  onDone,
  preview = false,
}: {
  onSkip: () => void;
  onDone: () => void;
  /** Dev preview: show the prompt without touching the network. */
  preview?: boolean;
}) {
  const c = useC();
  const scheme = useScheme();
  const { t } = useT();
  const { profile } = useAuth();
  const { event } = useEvent();
  const canManage = profile?.accountType === 'staff' || profile?.accountType === 'client';
  const [starter, setStarter] = useState<SectionRow | null>(null);
  const [ready, setReady] = useState(preview || !canManage);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [added, setAdded] = useState<SongRow | null>(null);

  useEffect(() => {
    if (preview || !event || !canManage) {
      setStarter(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    loadOverview(event.id)
      .then((ov) => {
        if (cancelled) return;
        const musicable = ov.sections.filter((s) => s.songs_enabled && !s.locked);
        const target =
          musicable.find((s) => /dancing playlist/i.test(s.title)) ??
          musicable.find((s) => /open dancing/i.test(s.title)) ??
          musicable.find((s) => /dance ?floor/i.test(s.title)) ??
          musicable.find((s) => /\bdancing\b/i.test(s.title)) ??
          musicable[0] ??
          null;
        setStarter(target);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [preview, event, canManage]);

  const title = added ? t('song.addedTitle') : t('song.title');
  const accent = t('song.titleAccent');
  const showAccent = !added && title.includes('{{accent}}');
  const [before, after = ''] = title.split('{{accent}}');

  async function onSongAdded(row: SongRow) {
    setAdded(row);
    try {
      await setMustPlay(row.id, true);
    } catch {
      // The song is already saved; must-play can be set again from the section.
    }
    setPickerOpen(false);
  }

  const canAdd = !preview && !!event && !!starter && canManage;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
          <Text style={[Type.callout, { color: c.ink2 }]}>{t('song.skip')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, gap: 16, flexGrow: 1 }}>
        <Text style={[Type.overline, { color: c.red }]}>{t('song.eyebrow')}</Text>
        <Text style={[Type.largeTitle, { color: c.ink }]}>
          {showAccent ? before : title}
          {showAccent ? <Text style={[Type.accent, { color: c.accent }]}>{accent}</Text> : null}
          {showAccent ? after : null}
        </Text>
        <Text style={[Type.body, { color: c.ink2 }]}>
          {added ? t('song.addedBody', { title: added.title }) : ready && !canAdd && !preview ? t('song.noSection') : t('song.body')}
        </Text>
        {added && starter ? (
          <Text style={[Type.footnote, { color: c.ink3 }]}>{t('song.saved', { section: starter.title })}</Text>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 10 }}>
        {added ? (
          <>
            <Button label={t('song.continue')} arrow="chev-r" onPress={onDone} />
            {canAdd ? <Button label={t('song.another')} variant="ghost" onPress={() => setPickerOpen(true)} /> : null}
          </>
        ) : canAdd || preview ? (
          <Button label={t('song.add')} onPress={() => { if (canAdd) setPickerOpen(true); }} />
        ) : (
          <Button label={t('song.continue')} arrow="chev-r" onPress={onDone} disabled={!ready} />
        )}
      </View>
      {event && starter ? (
        <SongPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          eventId={event.id}
          sectionId={starter.id}
          sectionTitle={starter.title}
          existingTitles={new Set()}
          onAdded={onSongAdded}
        />
      ) : null}
    </SafeAreaView>
  );
}
