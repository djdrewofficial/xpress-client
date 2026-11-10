import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AccessibilityActionEvent,
  ActivityIndicator,
  Alert,
  Text,
  View,
} from 'react-native';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  hideContent,
  loadEventContent,
  type EventSongIdea,
  type EventText,
  type ModerationKind,
} from '@/lib/moderation';
import { moveSongIdeaToMustPlay } from '@/lib/moveSongIdeaToMustPlay';
import { Fonts, Radius, Shadow, Status, Type } from '@/lib/theme';
import { SafetyLinks } from './SafetyLinks';
import { SafetyCard, SwipeSafetyRow } from './SwipeSafetyRow';
import { useModeration } from './useModeration';

/**
 * Song ideas and the Music-to-avoid note for the Music tab.
 * Swipe left to remove/report; swipe right on ideas to add Must Play.
 */
export function MusicContentSafety({
  eventId,
  userId,
  canManage,
  mustPlaySectionId = null,
  onCatalogChanged,
  reloadSignal = 0,
}: {
  eventId: string;
  userId: string;
  canManage: boolean;
  /** Dance-floor / Open Dancing section id for Must Play swipes. */
  mustPlaySectionId?: string | null;
  /** Refresh the Music record after an idea is promoted. */
  onCatalogChanged?: () => void;
  reloadSignal?: number;
}) {
  const c = useC();
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<ModerationKind | null>(null);
  const [ideas, setIdeas] = useState<EventSongIdea[]>([]);
  const [avoid, setAvoid] = useState<EventText | null>(null);
  const [tick, setTick] = useState(0);
  const busy = useRef(false);
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

  async function removeTarget(
    target: { targetType: 'song_idea' | 'do_not_play_note'; targetId: string },
    optimistic: () => void,
  ) {
    if (busy.current) return;
    busy.current = true;
    optimistic();
    const result = await hideContent(eventId, target);
    busy.current = false;
    if (!result.ok) {
      setTick((n) => n + 1);
      moderation.explain(result);
      return;
    }
    Alert.alert(t('safety.removed'));
  }

  async function addIdeaToMustPlay(idea: EventSongIdea) {
    if (!mustPlaySectionId || busy.current) return;
    busy.current = true;
    setIdeas((prev) => prev.filter((row) => row.id !== idea.id));
    const result = await moveSongIdeaToMustPlay(eventId, mustPlaySectionId, idea);
    busy.current = false;
    if (!result.ok) {
      setTick((n) => n + 1);
      Alert.alert(t('common.couldntSave'), t('common.checkConnection'));
      return;
    }
    onCatalogChanged?.();
    if (!result.ideaHidden) setTick((n) => n + 1);
    Alert.alert(t('safety.addedMustPlay'));
  }

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
    <View style={{ gap: 32 }}>
      {ideas.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text style={[styles.sectionLabel, { color: c.ink2 }]}>{t('safety.songIdeas')}</Text>
          <Text style={[Type.footnote, { color: c.ink3 }]}>{t('safety.swipeHint')}</Text>
          <View style={{ gap: 10 }}>
            {ideas.map((idea) => {
              const mine = idea.addedBy === userId;
              const canRemove = canManage || mine;
              const canReport = !mine;
              const canMust = canManage && !!mustPlaySectionId;
              const title = [idea.title, idea.artist].filter(Boolean).join(' · ') || t('safety.songIdeas');

              const rightActions = [
                canReport
                  ? {
                      key: 'report',
                      label: t('safety.report'),
                      color: c.accent,
                      icon: 'shield' as const,
                      onPress: () => moderation.openReport({ targetType: 'song_idea', targetId: idea.id }),
                    }
                  : null,
                canRemove
                  ? {
                      key: 'remove',
                      label: t('safety.remove'),
                      color: Status.archive,
                      icon: 'trash' as const,
                      onPress: () =>
                        void removeTarget({ targetType: 'song_idea', targetId: idea.id }, () =>
                          setIdeas((prev) => prev.filter((row) => row.id !== idea.id)),
                        ),
                    }
                  : null,
              ].filter((item): item is NonNullable<typeof item> => item != null);

              const leftActions = canMust
                ? [
                    {
                      key: 'must',
                      label: t('record.mustPlay'),
                      color: c.success,
                      icon: 'star' as const,
                      onPress: () => void addIdeaToMustPlay(idea),
                    },
                  ]
                : [];

              const a11yActions = [
                canRemove ? { name: 'remove', label: t('safety.remove') } : null,
                canMust ? { name: 'mustPlay', label: t('moment.markMust') } : null,
                canReport ? { name: 'report', label: t('safety.reportIdea') } : null,
              ].filter((item): item is { name: string; label: string } => item != null);

              const onA11y = ({ nativeEvent }: AccessibilityActionEvent) => {
                if (nativeEvent.actionName === 'remove' && canRemove) {
                  void removeTarget({ targetType: 'song_idea', targetId: idea.id }, () =>
                    setIdeas((prev) => prev.filter((row) => row.id !== idea.id)),
                  );
                } else if (nativeEvent.actionName === 'mustPlay' && canMust) {
                  void addIdeaToMustPlay(idea);
                } else if (nativeEvent.actionName === 'report' && canReport) {
                  moderation.openReport({ targetType: 'song_idea', targetId: idea.id });
                }
              };

              return (
                <SwipeSafetyRow
                  key={idea.id}
                  accessibilityLabel={title}
                  accessibilityActions={a11yActions}
                  onAccessibilityAction={onA11y}
                  leftActions={leftActions}
                  rightActions={rightActions}>
                  <SafetyCard>
                    <Text style={[Type.callout, { color: c.ink }]}>{title}</Text>
                    {idea.note ? (
                      <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={3}>
                        {idea.note}
                      </Text>
                    ) : null}
                    <SafetyLinks
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
                    />
                  </SafetyCard>
                </SwipeSafetyRow>
              );
            })}
          </View>
        </View>
      ) : null}

      {avoid ? (
        <View style={{ gap: 12 }}>
          <Text style={[styles.sectionLabel, { color: c.ink2 }]}>{t('safety.avoid')}</Text>
          {(() => {
            const mine = avoid.updatedBy === userId;
            const canRemove = canManage || mine;
            const canReport = !mine;
            const rightActions = [
              canReport
                ? {
                    key: 'report',
                    label: t('safety.report'),
                    color: c.accent,
                    icon: 'shield' as const,
                    onPress: () =>
                      moderation.openReport({ targetType: 'do_not_play_note', targetId: eventId }),
                  }
                : null,
              canRemove
                ? {
                    key: 'remove',
                    label: t('safety.remove'),
                    color: Status.archive,
                    icon: 'trash' as const,
                    onPress: () =>
                      void removeTarget({ targetType: 'do_not_play_note', targetId: eventId }, () =>
                        setAvoid(null),
                      ),
                  }
                : null,
            ].filter((item): item is NonNullable<typeof item> => item != null);

            const a11yActions = [
              canRemove ? { name: 'remove', label: t('safety.remove') } : null,
              canReport ? { name: 'report', label: t('safety.reportAvoid') } : null,
            ].filter((item): item is { name: string; label: string } => item != null);

            return (
              <SwipeSafetyRow
                accessibilityLabel={t('safety.avoid')}
                accessibilityActions={a11yActions}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === 'remove' && canRemove) {
                    void removeTarget({ targetType: 'do_not_play_note', targetId: eventId }, () =>
                      setAvoid(null),
                    );
                  } else if (nativeEvent.actionName === 'report' && canReport) {
                    moderation.openReport({ targetType: 'do_not_play_note', targetId: eventId });
                  }
                }}
                rightActions={rightActions}>
                <SafetyCard>
                  <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={6}>
                    {avoid.text}
                  </Text>
                  <SafetyLinks
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
                </SafetyCard>
              </SwipeSafetyRow>
            );
          })()}
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

const styles = {
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  block: { borderRadius: Radius.lg, padding: 14 },
};
