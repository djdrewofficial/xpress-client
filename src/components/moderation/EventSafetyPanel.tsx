import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, Sheet, useC } from '@/components/ui';
import { useT, type TranslationKey } from '@/lib/i18n';
import {
  listBlocks,
  loadEventContent,
  type EventContent,
  type ModerationKind,
  type ModerationPerson,
} from '@/lib/moderation';
import { REPORT_CONCERNS, targetForConcern, type ReportConcern } from '@/lib/reportConcerns';
import { Fonts, Radius, Shadow, Type } from '@/lib/theme';
import { SafetyLinks } from './SafetyLinks';
import { useModeration } from './useModeration';

const CONCERN_KEY: Record<ReportConcern, TranslationKey> = {
  answers: 'safety.concern.answers',
  notes: 'safety.concern.notes',
  songs: 'safety.concern.songs',
  person: 'safety.concern.person',
  cover: 'safety.concern.cover',
  other: 'safety.concern.other',
};

/**
 * My Event help card: event-level Report content, blocked list, and like review.
 * Per-question "Report answer" links were removed — reporting still uses submitReport.
 */
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
  const [sheet, setSheet] = useState<'concern' | 'person' | 'likes' | 'blocked' | null>(null);
  const [concern, setConcern] = useState<ReportConcern | null>(null);
  const seenEvent = useRef(eventId);
  const moderation = useModeration(eventId, () => setTick((n) => n + 1));

  const load = useCallback(async () => {
    const [blocks, feed] = await Promise.all([listBlocks(eventId), loadEventContent(eventId)]);
    return { blocks, feed };
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      setTick((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    let cancel = false;
    if (seenEvent.current !== eventId) {
      seenEvent.current = eventId;
      setContent(null);
      setBlocked([]);
      setBlockedIds([]);
    }
    setLoading(true);
    void load().then(({ blocks, feed }) => {
      if (cancel) return;
      if (!blocks.ok && blocks.kind === 'unavailable') setNotice('unavailable');
      else if (!feed.ok && feed.kind === 'unavailable') setNotice('unavailable');
      else setNotice(!blocks.ok && !feed.ok ? blocks.kind : null);
      setBlockedIds(blocks.ok ? blocks.data.blockedUserIds : []);
      setBlocked(blocks.ok ? blocks.data.blocked : []);
      setContent(feed.ok ? feed.data : null);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [load, reloadSignal, tick, eventId]);

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
  const unlabeledBlocked = blockedIds.filter(
    (id) => id !== userId && !namedBlocked.some((person) => person.userId === id),
  );
  const blockedCount = namedBlocked.length + (namedBlocked.length === 0 && unlabeledBlocked.length === 1 ? 1 : unlabeledBlocked.length > 1 ? unlabeledBlocked.length : 0);
  const songTitle = (songId: string) => songs.find((song) => song.id === songId)?.title ?? t('safety.likes');
  const reportItems = labeledLikes.length + singleUnlabeled.length;
  const people = (content?.people ?? []).filter((person) => person.userId !== userId);

  function startReport() {
    setConcern(null);
    setSheet('concern');
  }

  function pickConcern(next: ReportConcern) {
    setConcern(next);
    if (next === 'songs' && reportItems > 0) {
      setSheet('likes');
      return;
    }
    if (next === 'person') {
      if (people.length === 0) {
        setSheet(null);
        moderation.openReport(targetForConcern('person'));
        return;
      }
      setSheet('person');
      return;
    }
    setSheet(null);
    moderation.openReport(targetForConcern(next, { eventId }));
  }

  function pickPerson(person: ModerationPerson) {
    setSheet(null);
    moderation.openReport(targetForConcern('person', { personId: person.userId }));
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.sectionLabel, { color: c.ink2 }]}>{t('safety.heading')}</Text>
      <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
        {loading ? (
          <View style={styles.pad}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : notice ? (
          <View style={styles.pad}>
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t(noticeCopy(notice))}</Text>
          </View>
        ) : (
          <>
            <Text style={[Type.footnote, { color: c.ink2, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }]}>
              {t('safety.intro')}
            </Text>
            <Row
              title={t('safety.reportContent')}
              detail={t('safety.reportContentHint')}
              onPress={startReport}
            />
            {reportItems > 0 ? (
              <>
                <View style={[styles.div, { backgroundColor: c.line, marginLeft: 14 }]} />
                <Row
                  title={t('safety.reportRow')}
                  detail={t('safety.reportRowCount', { count: reportItems })}
                  onPress={() => setSheet('likes')}
                />
              </>
            ) : null}
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 14 }]} />
            <Row
              title={t('safety.blockedPeople')}
              detail={
                blockedCount > 0
                  ? t('safety.blockedCount', { count: blockedCount })
                  : t('safety.noBlocked')
              }
              onPress={() => setSheet('blocked')}
            />
          </>
        )}
      </View>

      <Sheet visible={sheet === 'concern'} onClose={() => setSheet(null)} title={t('safety.concernTitle')}>
        <View style={{ gap: 10, paddingBottom: 8 }}>
          <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.concernHelp')}</Text>
          {REPORT_CONCERNS.map((item) => (
            <Pressable
              key={item}
              onPress={() => pickConcern(item)}
              accessibilityRole="button"
              style={[
                styles.reason,
                {
                  borderColor: concern === item ? c.accent : c.line,
                  backgroundColor: concern === item ? c.accentTint : c.surface,
                },
              ]}>
              <Text style={[Type.callout, { color: c.ink }]}>{t(CONCERN_KEY[item])}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'person'} onClose={() => setSheet(null)} title={t('safety.concern.person')}>
        <View style={{ gap: 12, paddingBottom: 8 }}>
          {people.length === 0 ? (
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.reportEmpty')}</Text>
          ) : null}
          {people.map((person) => (
            <Pressable
              key={person.userId}
              onPress={() => pickPerson(person)}
              accessibilityRole="button"
              style={[styles.reason, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Text style={[Type.callout, { color: c.ink }]}>{person.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'likes'} onClose={() => setSheet(null)} title={t('safety.reportRow')}>
        <View style={{ gap: 12, paddingBottom: 8 }}>
          {ambiguousLikes ? (
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.namesUnavailable')}</Text>
          ) : null}
          {reportItems === 0 ? (
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.reportEmpty')}</Text>
          ) : null}
          {labeledLikes.map((like) => (
            <MiniCard key={`${like.songId}:${like.userId}`}>
              <Text style={[Type.callout, { color: c.ink }]}>{songTitle(like.songId)}</Text>
              <Text style={[Type.footnote, { color: c.ink2 }]}>{like.label}</Text>
              <SafetyLinks
                reportLabel={t('safety.reportLikeNamed', { name: like.label ?? '' })}
                onReport={() =>
                  moderation.openReport({
                    targetType: 'song_like',
                    targetId: like.songId,
                    targetUserId: like.userId,
                  })
                }
                blockLabel={t('safety.blockNamed', { name: like.label ?? '' })}
                onBlock={() => moderation.askBlock(like.userId, like.label)}
                hideLabel={canManage ? t('safety.hideLikeNamed', { name: like.label ?? '' }) : undefined}
                onHide={
                  canManage
                    ? () =>
                        moderation.askHide({
                          targetType: 'song_like',
                          targetId: like.songId,
                          targetUserId: like.userId,
                        })
                    : undefined
                }
                guestLabel={canManage ? t('safety.removeGuestNamed', { name: like.label ?? '' }) : undefined}
                onRemoveGuest={canManage ? () => moderation.askRemoveGuest(like.userId, like.label) : undefined}
              />
            </MiniCard>
          ))}
          {singleUnlabeled.map((like) => (
            <MiniCard key={`${like.songId}:${like.userId}`}>
              <Text style={[Type.callout, { color: c.ink }]}>{songTitle(like.songId)}</Text>
              <SafetyLinks
                reportLabel={t('safety.reportLike')}
                onReport={() =>
                  moderation.openReport({
                    targetType: 'song_like',
                    targetId: like.songId,
                    targetUserId: like.userId,
                  })
                }
                blockLabel={t('safety.block')}
                onBlock={() => moderation.askBlock(like.userId, null)}
                hideLabel={canManage ? t('safety.hideLike') : undefined}
                onHide={
                  canManage
                    ? () =>
                        moderation.askHide({
                          targetType: 'song_like',
                          targetId: like.songId,
                          targetUserId: like.userId,
                        })
                    : undefined
                }
                guestLabel={canManage ? t('safety.removeGuest') : undefined}
                onRemoveGuest={canManage ? () => moderation.askRemoveGuest(like.userId, null) : undefined}
              />
            </MiniCard>
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'blocked'} onClose={() => setSheet(null)} title={t('safety.blockedPeople')}>
        <View style={{ gap: 12, paddingBottom: 8 }}>
          {unlabeledBlocked.length > 1 ? (
            <Text style={[Type.footnote, { color: c.ink2 }]}>{t('safety.namesUnavailable')}</Text>
          ) : null}
          {namedBlocked.length === 0 && unlabeledBlocked.length === 0 ? (
            <Text style={[Type.footnote, { color: c.ink3 }]}>{t('safety.noBlocked')}</Text>
          ) : null}
          {namedBlocked.map((person) => (
            <MiniCard key={person.userId}>
              <Text style={[Type.callout, { color: c.ink }]}>{person.label}</Text>
              <SafetyLinks
                blockLabel={t('safety.unblockNamed', { name: person.label })}
                onBlock={() => moderation.askUnblock(person.userId, person.label)}
              />
            </MiniCard>
          ))}
          {namedBlocked.length === 0 && unlabeledBlocked.length === 1 ? (
            <MiniCard>
              <Text style={[Type.callout, { color: c.ink }]}>{t('safety.blockedOne')}</Text>
              <SafetyLinks
                blockLabel={t('safety.unblock')}
                onBlock={() => moderation.askUnblock(unlabeledBlocked[0], null)}
              />
            </MiniCard>
          ) : null}
        </View>
      </Sheet>

      {moderation.sheet}
    </View>
  );
}

function Row({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed ? { backgroundColor: c.surface2 } : null,
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: c.ink }]}>{title}</Text>
        <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <Icon name="chev-r" size={18} color={c.ink3} />
    </Pressable>
  );
}

function MiniCard({ children }: { children: ReactNode }) {
  const c = useC();
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: Radius.md, padding: 12, gap: 6 }}>
      {children}
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
  card: { borderRadius: Radius.lg, overflow: 'hidden' as const },
  pad: { padding: 14 },
  div: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 58,
  },
  rowTitle: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
  reason: { borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 14 },
};
