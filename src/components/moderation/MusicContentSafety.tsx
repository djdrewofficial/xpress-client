import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  loadEventContent,
  type EventSongIdea,
  type EventText,
  type ModerationKind,
} from '@/lib/moderation';
import { Radius, Shadow, Type } from '@/lib/theme';
import { SafetyLinks } from './SafetyLinks';
import { useModeration } from './useModeration';

/**
 * Song ideas and the Music-to-avoid note for the Music tab.
 * Uses the same report / remove / block / guest rules as My Event used to.
 */
export function MusicContentSafety({
  eventId,
  userId,
  canManage,
  reloadSignal = 0,
}: {
  eventId: string;
  userId: string;
  canManage: boolean;
  reloadSignal?: number;
}) {
  const c = useC();
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<ModerationKind | null>(null);
  const [ideas, setIdeas] = useState<EventSongIdea[]>([]);
  const [avoid, setAvoid] = useState<EventText | null>(null);
  const [tick, setTick] = useState(0);
  const seenEvent = useRef(eventId);
  const moderation = useModeration(eventId, () => setTick((n) => n + 1));

  const load = useCallback(async () => loadEventContent(eventId), [eventId]);

  useFocusEffect(
    useCallback(() => {
      setTick((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    let cancel = false;
    if (seenEvent.current !== eventId) {
      seenEvent.current = eventId;
      setIdeas([]);
      setAvoid(null);
    }
    setLoading(true);
    void load().then((feed) => {
      if (cancel) return;
      if (!feed.ok) {
        setNotice(feed.kind);
        setIdeas([]);
        setAvoid(null);
        setLoading(false);
        return;
      }
      setNotice(null);
      setIdeas(feed.data.songIdeas.filter((idea) => !idea.hidden));
      const note = feed.data.doNotPlayNotes;
      setAvoid(note && !note.hidden && note.text?.trim() ? note : null);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [load, reloadSignal, tick, eventId]);

  if (loading) {
    return (
      <View style={[styles.block, { backgroundColor: c.surface }, Shadow.card]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (notice) {
    return (
      <View style={[styles.block, { backgroundColor: c.surface }, Shadow.card]}>
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t(noticeCopy(notice))}</Text>
      </View>
    );
  }

  if (ideas.length === 0 && !avoid) return moderation.sheet;

  return (
    <View style={{ gap: 14 }}>
      {ideas.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('safety.songIdeas')}</Text>
          <View style={{ gap: 10 }}>
            {ideas.map((idea) => {
              const mine = idea.addedBy === userId;
              return (
                <Card key={idea.id}>
                  <Text style={[Type.callout, { color: c.ink }]}>
                    {[idea.title, idea.artist].filter(Boolean).join(' · ') || t('safety.songIdeas')}
                  </Text>
                  {idea.note ? (
                    <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={3}>
                      {idea.note}
                    </Text>
                  ) : null}
                  <SafetyLinks
                    reportLabel={mine ? undefined : t('safety.reportIdea')}
                    onReport={mine ? undefined : () => moderation.openReport({ targetType: 'song_idea', targetId: idea.id })}
                    blockLabel={
                      idea.addedBy && !mine
                        ? idea.addedByLabel
                          ? t('safety.blockNamed', { name: idea.addedByLabel })
                          : t('safety.blockAdded')
                        : undefined
                    }
                    onBlock={
                      idea.addedBy && !mine
                        ? () => moderation.askBlock(idea.addedBy as string, idea.addedByLabel)
                        : undefined
                    }
                    guestLabel={
                      canManage && idea.addedBy && !mine
                        ? idea.addedByLabel
                          ? t('safety.removeGuestNamed', { name: idea.addedByLabel })
                          : t('safety.removeGuest')
                        : undefined
                    }
                    onRemoveGuest={
                      canManage && idea.addedBy && !mine
                        ? () => moderation.askRemoveGuest(idea.addedBy as string, idea.addedByLabel)
                        : undefined
                    }
                    hideLabel={canManage || mine ? t('safety.remove') : undefined}
                    onHide={
                      canManage || mine
                        ? () => moderation.askHide({ targetType: 'song_idea', targetId: idea.id })
                        : undefined
                    }
                  />
                </Card>
              );
            })}
          </View>
        </View>
      ) : null}

      {avoid ? (
        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('safety.avoid')}</Text>
          <Card>
            <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={6}>
              {avoid.text}
            </Text>
            <SafetyLinks
              reportLabel={avoid.updatedBy === userId ? undefined : t('safety.reportAvoid')}
              onReport={
                avoid.updatedBy === userId
                  ? undefined
                  : () => moderation.openReport({ targetType: 'do_not_play_note', targetId: eventId })
              }
              hideLabel={canManage || avoid.updatedBy === userId ? t('safety.remove') : undefined}
              onHide={
                canManage || avoid.updatedBy === userId
                  ? () => moderation.askHide({ targetType: 'do_not_play_note', targetId: eventId })
                  : undefined
              }
              blockLabel={
                avoid.updatedBy && avoid.updatedBy !== userId
                  ? avoid.updatedByLabel
                    ? t('safety.blockNamed', { name: avoid.updatedByLabel })
                    : t('safety.block')
                  : undefined
              }
              onBlock={
                avoid.updatedBy && avoid.updatedBy !== userId
                  ? () => moderation.askBlock(avoid.updatedBy as string, avoid.updatedByLabel)
                  : undefined
              }
              guestLabel={
                canManage && avoid.updatedBy && avoid.updatedBy !== userId
                  ? avoid.updatedByLabel
                    ? t('safety.removeGuestNamed', { name: avoid.updatedByLabel })
                    : t('safety.removeGuest')
                  : undefined
              }
              onRemoveGuest={
                canManage && avoid.updatedBy && avoid.updatedBy !== userId
                  ? () => moderation.askRemoveGuest(avoid.updatedBy as string, avoid.updatedByLabel)
                  : undefined
              }
            />
          </Card>
        </View>
      ) : null}

      {moderation.sheet}
    </View>
  );
}

function noticeCopy(
  kind: ModerationKind,
): 'safety.unavailable' | 'safety.session' | 'safety.forbidden' | 'safety.notFound' | 'safety.failed' {
  if (kind === 'unavailable') return 'safety.unavailable';
  if (kind === 'session') return 'safety.session';
  if (kind === 'forbidden') return 'safety.forbidden';
  if (kind === 'notFound') return 'safety.notFound';
  return 'safety.failed';
}

function Card({ children }: { children: ReactNode }) {
  const c = useC();
  return (
    <View style={[Shadow.card, { borderRadius: Radius.lg, backgroundColor: c.surface, padding: 14, gap: 8 }]}>
      {children}
    </View>
  );
}

const styles = {
  block: { borderRadius: Radius.lg, padding: 14 },
};
