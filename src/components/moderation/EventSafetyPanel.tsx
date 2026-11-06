import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import {
  listBlocks,
  loadEventContent,
  type EventContent,
  type ModerationKind,
  type ModerationPerson,
} from '@/lib/moderation';
import { Radius, Type } from '@/lib/theme';
import { SafetyLinks } from './SafetyLinks';
import { useModeration } from './useModeration';

/** Unblock list, people, song ideas, avoid notes, and likes for the open event. */
export function EventSafetyPanel({
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
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<ModerationPerson[]>([]);
  const [content, setContent] = useState<EventContent | null>(null);
  const [tick, setTick] = useState(0);
  const moderation = useModeration(eventId, () => setTick((n) => n + 1));

  const load = useCallback(async () => {
    const [blocks, feed] = await Promise.all([listBlocks(eventId), loadEventContent(eventId)]);
    if (!blocks.ok && blocks.kind === 'unavailable') setNotice('unavailable');
    else if (!feed.ok && feed.kind === 'unavailable') setNotice('unavailable');
    else setNotice(!blocks.ok && !feed.ok ? blocks.kind : null);
    setBlockedIds(blocks.ok ? blocks.data.blockedUserIds : []);
    setBlocked(blocks.ok ? blocks.data.blocked : []);
    setContent(feed.ok ? feed.data : null);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, reloadSignal, tick]);

  const visible = (hidden: boolean) => !hidden;
  const songs = content?.songs.filter((song) => visible(song.hidden)) ?? [];
  const likes = (content?.likes ?? []).filter((like) => visible(like.hidden) && like.userId !== userId);
  const labeledLikes = likes.filter((like) => like.label);
  const unlabeledBySong = new Map<string, typeof likes>();
  for (const like of likes) {
    if (like.label) continue;
    const list = unlabeledBySong.get(like.songId) ?? [];
    list.push(like);
    unlabeledBySong.set(like.songId, list);
  }
  const singleUnlabeled = [...unlabeledBySong.values()].filter((list) => list.length === 1).map((list) => list[0]);
  const ambiguousLikes = [...unlabeledBySong.values()].some((list) => list.length > 1);
  const namedBlocked = blocked.filter((person) => person.userId !== userId);
  const unlabeledBlocked = blockedIds.filter((id) => id !== userId && !namedBlocked.some((person) => person.userId === id));
  const ideas = (content?.songIdeas ?? []).filter((idea) => visible(idea.hidden));
  const avoid = content?.doNotPlayNotes && visible(content.doNotPlayNotes.hidden) && content.doNotPlayNotes.text?.trim()
    ? content.doNotPlayNotes
    : null;
  const songTitle = (songId: string) => songs.find((song) => song.id === songId)?.title ?? t('safety.likes');

  return (
    <View style={{ gap: 10 }}>
      <Text style={[Type.label, { color: c.ink3 }]}>{t('safety.heading')}</Text>
      {loading ? <ActivityIndicator color={c.accent} /> : null}
      {!loading && notice ? (
        <Text style={[Type.footnote, { color: c.ink2 }]}>{t(noticeCopy(notice))}</Text>
      ) : null}
      {!loading && !notice ? (
        <>
          <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.intro')}</Text>
          {ambiguousLikes || unlabeledBlocked.length > 1 ? (
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.namesUnavailable')}</Text>
          ) : null}
          <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.blockedPeople')}</Text>
          {namedBlocked.length === 0 && unlabeledBlocked.length === 0 ? (
            <Text style={[Type.footnote, { color: c.ink3 }]}>{t('safety.noBlocked')}</Text>
          ) : null}
          {namedBlocked.map((person) => (
            <Card key={person.userId}>
              <Text style={[Type.callout, { color: c.ink }]}>{person.label}</Text>
              <SafetyLinks
                blockLabel={t('safety.unblockNamed', { name: person.label })}
                onBlock={() => moderation.askUnblock(person.userId, person.label)}
              />
            </Card>
          ))}
          {namedBlocked.length === 0 && unlabeledBlocked.length === 1 ? (
            <Card>
              <Text style={[Type.callout, { color: c.ink }]}>{t('safety.blockedOne')}</Text>
              <SafetyLinks blockLabel={t('safety.unblock')} onBlock={() => moderation.askUnblock(unlabeledBlocked[0], null)} />
            </Card>
          ) : null}

          {ideas.length > 0 ? <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.songIdeas')}</Text> : null}
          {ideas.map((idea) => {
            const mine = idea.addedBy === userId;
            return (
              <Card key={idea.id}>
                <Text style={[Type.callout, { color: c.ink }]}>{[idea.title, idea.artist].filter(Boolean).join(' · ') || t('safety.songIdeas')}</Text>
                {idea.note ? <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={3}>{idea.note}</Text> : null}
                <SafetyLinks
                  reportLabel={mine ? undefined : t('safety.reportIdea')}
                  onReport={mine ? undefined : () => moderation.openReport({ targetType: 'song_idea', targetId: idea.id })}
                  blockLabel={idea.addedBy && !mine
                    ? (idea.addedByLabel ? t('safety.blockNamed', { name: idea.addedByLabel }) : t('safety.blockAdded'))
                    : undefined}
                  onBlock={idea.addedBy && !mine ? () => moderation.askBlock(idea.addedBy as string, idea.addedByLabel) : undefined}
                  guestLabel={canManage && idea.addedBy && !mine
                    ? (idea.addedByLabel ? t('safety.removeGuestNamed', { name: idea.addedByLabel }) : t('safety.removeGuest'))
                    : undefined}
                  onRemoveGuest={canManage && idea.addedBy && !mine ? () => moderation.askRemoveGuest(idea.addedBy as string, idea.addedByLabel) : undefined}
                  hideLabel={canManage || mine ? t('safety.remove') : undefined}
                  onHide={canManage || mine ? () => moderation.askHide({ targetType: 'song_idea', targetId: idea.id }) : undefined}
                />
              </Card>
            );
          })}

          {avoid ? (
            <Card>
              <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.avoid')}</Text>
              <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={4}>{avoid.text}</Text>
              <SafetyLinks
                reportLabel={avoid.updatedBy === userId ? undefined : t('safety.reportAvoid')}
                onReport={avoid.updatedBy === userId ? undefined : () => moderation.openReport({ targetType: 'do_not_play_note', targetId: eventId })}
                hideLabel={canManage || avoid.updatedBy === userId ? t('safety.remove') : undefined}
                onHide={canManage || avoid.updatedBy === userId ? () => moderation.askHide({ targetType: 'do_not_play_note', targetId: eventId }) : undefined}
                blockLabel={avoid.updatedBy && avoid.updatedBy !== userId
                  ? (avoid.updatedByLabel ? t('safety.blockNamed', { name: avoid.updatedByLabel }) : t('safety.block'))
                  : undefined}
                onBlock={avoid.updatedBy && avoid.updatedBy !== userId ? () => moderation.askBlock(avoid.updatedBy as string, avoid.updatedByLabel) : undefined}
                guestLabel={canManage && avoid.updatedBy && avoid.updatedBy !== userId
                  ? (avoid.updatedByLabel ? t('safety.removeGuestNamed', { name: avoid.updatedByLabel }) : t('safety.removeGuest'))
                  : undefined}
                onRemoveGuest={canManage && avoid.updatedBy && avoid.updatedBy !== userId ? () => moderation.askRemoveGuest(avoid.updatedBy as string, avoid.updatedByLabel) : undefined}
              />
            </Card>
          ) : null}

          {labeledLikes.length + singleUnlabeled.length > 0 ? <Text style={[Type.subhead, { color: c.ink }]}>{t('safety.likes')}</Text> : null}
          {labeledLikes.map((like) => (
            <Card key={`${like.songId}:${like.userId}`}>
              <Text style={[Type.callout, { color: c.ink }]}>{songTitle(like.songId)}</Text>
              <Text style={[Type.footnote, { color: c.ink2 }]}>{like.label}</Text>
              <SafetyLinks
                reportLabel={t('safety.reportLikeNamed', { name: like.label ?? '' })}
                onReport={() => moderation.openReport({ targetType: 'song_like', targetId: like.songId, targetUserId: like.userId })}
                blockLabel={t('safety.blockNamed', { name: like.label ?? '' })}
                onBlock={() => moderation.askBlock(like.userId, like.label)}
                hideLabel={canManage ? t('safety.hideLikeNamed', { name: like.label ?? '' }) : undefined}
                onHide={canManage ? () => moderation.askHide({ targetType: 'song_like', targetId: like.songId, targetUserId: like.userId }) : undefined}
                guestLabel={canManage ? t('safety.removeGuestNamed', { name: like.label ?? '' }) : undefined}
                onRemoveGuest={canManage ? () => moderation.askRemoveGuest(like.userId, like.label) : undefined}
              />
            </Card>
          ))}
          {singleUnlabeled.map((like) => (
            <Card key={`${like.songId}:${like.userId}`}>
              <Text style={[Type.callout, { color: c.ink }]}>{songTitle(like.songId)}</Text>
              <SafetyLinks
                reportLabel={t('safety.reportLike')}
                onReport={() => moderation.openReport({ targetType: 'song_like', targetId: like.songId, targetUserId: like.userId })}
                blockLabel={t('safety.block')}
                onBlock={() => moderation.askBlock(like.userId, null)}
                hideLabel={canManage ? t('safety.hideLike') : undefined}
                onHide={canManage ? () => moderation.askHide({ targetType: 'song_like', targetId: like.songId, targetUserId: like.userId }) : undefined}
                guestLabel={canManage ? t('safety.removeGuest') : undefined}
                onRemoveGuest={canManage ? () => moderation.askRemoveGuest(like.userId, null) : undefined}
              />
            </Card>
          ))}
        </>
      ) : null}
      {moderation.sheet}
    </View>
  );
}

function noticeCopy(kind: ModerationKind): 'safety.unavailable' | 'safety.session' | 'safety.forbidden' | 'safety.notFound' | 'safety.failed' {
  if (kind === 'unavailable') return 'safety.unavailable';
  if (kind === 'session') return 'safety.session';
  if (kind === 'forbidden') return 'safety.forbidden';
  if (kind === 'notFound') return 'safety.notFound';
  return 'safety.failed';
}

function Card({ children }: { children: ReactNode }) {
  const c = useC();
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: Radius.md, padding: 12, gap: 6 }}>
      {children}
    </View>
  );
}
