import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ContentColumn, CountdownHero, EmojiIcon, Icon, useC } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Gradients, Radius, Shadow, Space, Type } from '@/lib/theme';

export type HomeResume = {
  icon: string | null;
  title: string;
  meta: string;
};

export type HomeChapter = {
  id: string;
  index: number;
  title: string;
  moments: number;
  status: string | null;
  done: boolean;
};

/**
 * Home tab body. The navigator draws the tab bar.
 * Help, the photo prompt, and Sign out are intentionally not here.
 */
export function HomeBody({
  greeting,
  eventName,
  coverUrl,
  date,
  dateLabel,
  venue,
  progress,
  canSwitch,
  onSwitch,
  resume,
  onContinue,
  chapters,
  onChapter,
  onSeeAll,
  refreshing,
  onRefresh,
  emptyMessage,
  coverActions,
}: {
  greeting: string;
  eventName: string;
  coverUrl?: string | null;
  date?: string | null;
  dateLabel?: string;
  venue?: string | null;
  progress: number;
  canSwitch: boolean;
  onSwitch: () => void;
  resume: HomeResume | null;
  onContinue: () => void;
  chapters: HomeChapter[];
  onChapter: (id: string) => void;
  onSeeAll: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string | null;
  coverActions?: ReactNode;
}) {
  const c = useC();
  const { t, locale } = useT();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} /> : undefined
      }>
      <View style={styles.hero}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[Brand.purpleDeep, Brand.purple, '#6a4fb8']} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={['rgba(18,12,30,0.25)', 'rgba(18,12,30,0.05)', 'rgba(18,12,30,0.88)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ContentColumn>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <Text style={[Type.overline, { color: Gradients.countdownHero.glow }]}>{greeting}</Text>
          <Pressable
            onPress={canSwitch ? onSwitch : undefined}
            disabled={!canSwitch}
            style={styles.nameRow}
            accessibilityRole={canSwitch ? 'button' : undefined}
            accessibilityLabel={canSwitch ? t('home.switchEvent') : undefined}>
            <Text style={[styles.eventName, { flexShrink: 1 }]} numberOfLines={2}>
              {eventName}
            </Text>
            {canSwitch ? <Icon name="chev-d" size={18} color="#fff" /> : null}
          </Pressable>
        </View>
        </ContentColumn>
        <View style={{ flex: 1 }} />
        <ContentColumn>
        <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          {date ? (
            <CountdownHero bare size="compact" date={date} dateLabel={dateLabel} venue={venue} progress={progress} locale={locale} />
          ) : null}
          {coverUrl && coverActions ? <View style={{ marginTop: 12 }}>{coverActions}</View> : null}
        </View>
        </ContentColumn>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg }]}>
        <ContentColumn>
        {emptyMessage ? (
          <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
            <Text style={[Type.callout, { color: c.ink2 }]}>{emptyMessage}</Text>
          </View>
        ) : (
          <>
            {resume ? (
              <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, gap: 14 }]}>
                <Text style={[Type.label, { color: c.red }]}>{t('home.resume')}</Text>
                <View style={styles.resumeRow}>
                  <View style={[styles.bubble, { backgroundColor: c.accentTint }]}>
                    <EmojiIcon glyph={resume.icon} size={22} color={c.accent} fallback="mic" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resumeTitle, { color: c.ink }]} numberOfLines={1}>
                      {resume.title}
                    </Text>
                    <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>
                      {resume.meta}
                    </Text>
                  </View>
                </View>
                <Button label={t('home.continue')} arrow onPress={onContinue} />
              </View>
            ) : null}

            <View style={styles.chapterHead}>
              <Text style={[Type.label, { color: c.ink3 }]}>{t('home.chapters')}</Text>
              <Pressable onPress={onSeeAll} hitSlop={8}>
                <Text style={[Type.label, { color: c.red }]}>{t('home.seeAll')}</Text>
              </Pressable>
            </View>

            <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, paddingVertical: 4 }]}>
              {chapters.length === 0 ? (
                <Text style={[Type.footnote, { color: c.ink3, padding: 16 }]}>{t('home.djSettingUp')}</Text>
              ) : (
                chapters.map((ch, i) => (
                  <Pressable
                    key={ch.id}
                    onPress={() => onChapter(ch.id)}
                    style={({ pressed }) => [
                      styles.chapter,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
                      pressed && { backgroundColor: c.surface2 },
                    ]}>
                    <Text style={[styles.index, { color: c.red }]}>{String(ch.index).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.chapterTitle, { color: c.ink }]} numberOfLines={1}>
                        {ch.title}
                      </Text>
                      <Text style={[Type.footnote, { color: c.ink3 }]}>
                        {ch.moments} {ch.moments === 1 ? t('home.moment') : t('home.moments')}
                      </Text>
                    </View>
                    {ch.status ? (
                      <Text style={[Type.subhead, { color: ch.done ? c.success : c.ink2 }]}>{ch.status}</Text>
                    ) : null}
                    <Icon name="chev-r" size={18} color={c.ink3} />
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
        </ContentColumn>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 400 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  eventName: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38, color: '#fff' },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  card: { borderRadius: Radius.lg, padding: 16 },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bubble: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resumeTitle: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 22 },
  chapterHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12 },
  index: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 26, width: 36 },
  chapterTitle: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 21 },
});
