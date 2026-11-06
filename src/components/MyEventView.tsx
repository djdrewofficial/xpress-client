import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Icon, LanguageCard, NavBar, useC, type IconName } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { Brand, Fonts, Radius, Shadow, Space, Type } from '@/lib/theme';
import type { AppLanguage } from '@/lib/language';

export type MyEventScheduleRow = {
  id: string;
  seqLabel: string;
  title: string;
  detail: string;
  paid: boolean;
  amount: string;
};

export type MyEventFinancials = {
  balance: string;
  nextLine: string | null;
  paidLabel: string;
  ofLabel: string;
  progress: number;
  schedule: MyEventScheduleRow[];
  footnote: string | null;
  pendingNote: string | null;
};

export function MyEventView({
  loading,
  refreshing,
  onRefresh,
  eyebrow,
  onBack,
  onSwitch,
  hasEvent,
  financials,
  banner,
  guest,
  eventFacts,
  packageInfo,
  onPackage,
  team,
  onCall,
  onText,
  onEmail,
  showInvite,
  onInvite,
  hostTools,
  accountName,
  accountEmail,
  onPrivacy,
  onTerms,
  onDeletion,
  onSignOut,
  onDelete,
  deleting,
  language,
  onLanguage,
  marketing,
  onMarketing,
  aiConsent,
}: {
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  eyebrow: string | null;
  onBack?: () => void;
  onSwitch?: () => void;
  hasEvent: boolean;
  financials: MyEventFinancials | null;
  banner: string | null;
  guest: { role: string; invitedBy: string | null } | null;
  eventFacts: { dateLabel: string; venue: string | null } | null;
  packageInfo: { name: string; detail: string | null } | null;
  onPackage: () => void;
  team: { initials: string; name: string; detail: string; showCall: boolean; showText: boolean; showEmail: boolean } | null;
  onCall: () => void;
  onText: () => void;
  onEmail: () => void;
  showInvite: boolean;
  onInvite: () => void;
  /** Host link, guest link, and the guest-access screen. Replaces the email invite. */
  hostTools?: ReactNode;
  accountName: string;
  accountEmail: string | null;
  onPrivacy: () => void;
  onTerms: () => void;
  onDeletion: () => void;
  onSignOut: () => void;
  onDelete: () => void;
  deleting: boolean;
  language: AppLanguage;
  onLanguage: (language: AppLanguage) => void;
  marketing: boolean;
  onMarketing: (on: boolean) => void;
  /** Host-only AI consent. Guests and staff omit this. */
  aiConsent?: ReactNode;
}) {
  const c = useC();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const packageInsideEvent = !!eventFacts && !!packageInfo;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {compact ? (
        <View style={[styles.compact, { paddingTop: insets.top, backgroundColor: c.bg, borderBottomColor: c.line }]}>
          <NavBar
            title={t('event.title')}
            onBack={onBack}
            trailing={onSwitch ? { label: t('common.switch'), onPress: onSwitch } : undefined}
          />
        </View>
      ) : null}
      <ScrollView
        onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > 56)}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
          gap: 22,
        }}>
        <View style={{ gap: 2 }}>
          {eyebrow ? (
            <Pressable onPress={onSwitch} disabled={!onSwitch} style={styles.eyebrowRow}>
              <Text style={[Type.overline, styles.eyebrow, { color: c.red }]} numberOfLines={1}>
                {eyebrow}
              </Text>
              {onSwitch ? <Icon name="chev-d" size={14} color={c.red} /> : null}
            </Pressable>
          ) : null}
          <View style={styles.titleRow}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.back}>
                <Icon name="chev-l" size={24} color={c.ink} />
              </Pressable>
            ) : null}
            <Text style={[Type.largeTitle, { color: c.ink, flex: 1 }]}>{t('event.title')}</Text>
          </View>
        </View>

        {!hasEvent ? (
          <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, padding: Space.lg }]}>
            <Text style={[Type.footnote, { color: c.ink2 }]}>
              {t('event.empty')}
            </Text>
          </View>
        ) : (
          <>
            {guest ? (
              <View style={styles.guestRow}>
                <View style={[styles.rolePill, { backgroundColor: c.accentTint }]}>
                  <Icon name="user" size={14} color={c.accent} />
                  <Text style={[styles.roleTxt, { color: c.accent }]}>{guest.role}</Text>
                </View>
                {guest.invitedBy ? (
                  <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]} numberOfLines={2}>
                    {t('event.invitedBy', { name: guest.invitedBy })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {banner ? (
              <View style={[styles.banner, { backgroundColor: c.surface2 }]}>
                <Icon name="lock" size={16} color={c.ink2} />
                <Text style={[Type.footnote, { color: c.ink2, flex: 1 }]}>{banner}</Text>
              </View>
            ) : null}

            {financials ? (
              <>
                <LinearGradient
                  colors={[Brand.purpleDeep, '#3a2670']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.balance}>
                  <Text style={styles.balanceLab}>{t('event.balance')}</Text>
                  <Text style={styles.balanceAmt}>{financials.balance}</Text>
                  {financials.nextLine ? <Text style={styles.balanceNext}>{financials.nextLine}</Text> : null}
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, financials.progress))}%` }]} />
                  </View>
                  <View style={styles.balanceFoot}>
                    <Text style={styles.paidTxt}>{financials.paidLabel}</Text>
                    <Text style={styles.ofTxt}>{financials.ofLabel}</Text>
                  </View>
                </LinearGradient>

                {financials.schedule.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={[Type.label, { color: c.ink3 }]}>{t('event.schedule')}</Text>
                    <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
                      {financials.schedule.map((row, index) => (
                        <View key={row.id}>
                          {index > 0 ? <View style={[styles.div, { backgroundColor: c.line, marginLeft: 56 }]} /> : null}
                          <View style={styles.payRow}>
                            <Text style={[styles.seq, { color: c.red }]}>{row.seqLabel}</Text>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={[styles.cellTitle, { color: c.ink }]} numberOfLines={1}>
                                {row.title}
                              </Text>
                              <View style={styles.detailRow}>
                                {row.paid ? <Icon name="check" size={12} color={c.success} /> : null}
                                <Text style={[Type.footnote, { color: row.paid ? c.success : c.ink2 }]} numberOfLines={1}>
                                  {row.detail}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.amount, { color: c.ink }]}>{row.amount}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {financials.pendingNote || financials.footnote ? (
                  <View style={{ gap: 6, marginTop: -10 }}>
                    {financials.pendingNote ? (
                      <Text style={[Type.footnote, { color: c.ink3 }]}>{financials.pendingNote}</Text>
                    ) : null}
                    {financials.footnote ? (
                      <Text style={[Type.footnote, { color: c.ink3 }]}>{financials.footnote}</Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {eventFacts ? (
              <View style={{ gap: 8 }}>
                <Text style={[Type.label, { color: c.ink3 }]}>{t('event.event')}</Text>
                <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
                  <Cell icon="calendar" title={t('event.date')} trailing={<Text style={[Type.footnote, { color: c.ink2 }]}>{eventFacts.dateLabel}</Text>} />
                  {eventFacts.venue ? (
                    <>
                      <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
                      <Cell icon="pin" title={t('event.venue')} trailing={<Text style={[Type.footnote, { color: c.ink2, flexShrink: 1 }]} numberOfLines={1}>{eventFacts.venue}</Text>} />
                    </>
                  ) : null}
                  {packageInsideEvent && packageInfo ? (
                    <>
                      <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
                      <Cell icon="gem" title={packageInfo.name} subtitle={packageInfo.detail} onPress={onPackage} chevron />
                    </>
                  ) : null}
                </View>
              </View>
            ) : null}

            {packageInfo && !packageInsideEvent ? (
              <View style={{ gap: 8 }}>
                <Text style={[Type.label, { color: c.ink3 }]}>{t('event.package')}</Text>
                <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
                  <Cell icon="gem" title={packageInfo.name} subtitle={packageInfo.detail} onPress={onPackage} chevron />
                </View>
              </View>
            ) : null}

            {team ? (
              <View style={{ gap: 8 }}>
                <Text style={[Type.label, { color: c.ink3 }]}>{t('event.team')}</Text>
                <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, padding: 14, gap: 14 }]}>
                  <View style={styles.teamTop}>
                    <View style={[styles.avatar, { backgroundColor: Brand.purple }]}>
                      <Text style={styles.avatarTxt}>{team.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cellTitle, { color: c.ink }]} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>
                        {team.detail}
                      </Text>
                    </View>
                  </View>
                  {team.showCall || team.showText || team.showEmail ? (
                    <View style={styles.actions}>
                      {team.showCall ? <ContactButton icon="phone" label={t('event.call')} onPress={onCall} /> : null}
                      {team.showText ? <ContactButton icon="message" label={t('event.text')} onPress={onText} /> : null}
                      {team.showEmail ? <ContactButton icon="mail" label={t('event.email')} onPress={onEmail} /> : null}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {hostTools}
            {showInvite && !hostTools ? (
              <View style={{ gap: 8 }}>
                <Text style={[Type.label, { color: c.ink3 }]}>{t('event.people')}</Text>
                <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
                  <Cell icon="users" title={t('event.invite')} subtitle={t('event.inviteSub')} onPress={onInvite} chevron />
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={{ gap: 8 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('event.account')}</Text>
          <View style={[styles.card, Shadow.card, { backgroundColor: c.surface }]}>
            <Cell icon="user" title={accountName} subtitle={accountEmail} />
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
            <Cell icon="shield" title={t('legal.privacyTitle')} onPress={onPrivacy} chevron />
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
            <Cell icon="file-up" title={t('legal.termsTitle')} onPress={onTerms} chevron />
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
            <Cell icon="info" title={t('legal.deletionTitle')} onPress={onDeletion} chevron />
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
            <Cell icon="signout" title={t('event.signOut')} onPress={onSignOut} chevron />
            <View style={[styles.div, { backgroundColor: c.line, marginLeft: 62 }]} />
            <Cell
              icon="trash"
              title={deleting ? t('event.deleting') : t('event.delete')}
              titleColor={c.red}
              bubbleColor={c.redTint}
              iconColor={c.red}
              onPress={deleting ? undefined : onDelete}
            />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[Type.label, { color: c.ink3 }]}>{t('event.settings')}</Text>
          <Text style={[Type.footnote, { color: c.ink2, marginTop: -4 }]}>{t('event.language')}</Text>
          <View style={styles.langRow}>
            <LanguageCard label={t('event.english')} selected={language === 'en'} selectedLabel={t('event.selected')} onPress={() => onLanguage('en')} />
            <LanguageCard label={t('event.spanish')} selected={language === 'es'} selectedLabel={t('event.selectedEs')} onPress={() => onLanguage('es')} />
          </View>
          {aiConsent}
          <View style={[styles.card, Shadow.card, { backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12 }]}>
            <View style={styles.marketRow}>
              <View style={[styles.bubble, { backgroundColor: c.accentTint }]}>
                <Icon name="message" size={18} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cellTitle, { color: c.ink }]}>{t('event.marketing')}</Text>
                <Text style={[Type.footnote, { color: c.ink2 }]}>{t('event.marketingSub')}</Text>
              </View>
              <Switch
                value={marketing}
                onValueChange={onMarketing}
                trackColor={{ false: c.sunken, true: c.accent }}
                thumbColor="#ffffff"
                ios_backgroundColor={c.sunken}
                accessibilityLabel={t('event.marketing')}
              />
            </View>
          </View>
        </View>

        <View style={styles.logo}>
          <Logo variant="full" height={28} />
        </View>
      </ScrollView>
    </View>
  );
}

function ContactButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useC();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.contact,
        { borderColor: c.accent, backgroundColor: pressed ? c.accentTint : 'transparent' },
      ]}>
      <Icon name={icon} size={16} color={c.accent} />
      <Text style={[styles.contactTxt, { color: c.accent }]}>{label}</Text>
    </Pressable>
  );
}

function Cell({
  icon,
  title,
  subtitle,
  titleColor,
  iconColor,
  bubbleColor,
  onPress,
  chevron,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle?: string | null;
  titleColor?: string;
  iconColor?: string;
  bubbleColor?: string;
  onPress?: () => void;
  chevron?: boolean;
  trailing?: ReactNode;
}) {
  const c = useC();
  const body = (
    <>
      <View style={[styles.bubble, { backgroundColor: bubbleColor ?? c.accentTint }]}>
        <Icon name={icon} size={18} color={iconColor ?? c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cellTitle, { color: titleColor ?? c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Type.footnote, { color: c.ink2 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chev-r" size={18} color={c.ink3} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.cell}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cell, pressed ? { backgroundColor: c.surface2 } : null]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compact: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  eyebrow: { letterSpacing: 1.4, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { marginLeft: -6, marginRight: 2 },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  roleTxt: { fontFamily: Fonts.semibold, fontSize: 13 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  balance: { borderRadius: Radius.lg, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 6 },
  balanceLab: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' },
  balanceAmt: { fontFamily: Fonts.display, fontSize: 44, lineHeight: 48, color: '#ffffff', marginTop: 2 },
  balanceNext: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.86)' },
  track: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Brand.red, borderRadius: 4 },
  balanceFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  paidTxt: { color: '#ffffff', fontFamily: Fonts.bold, fontSize: 14 },
  ofTxt: { color: 'rgba(255,255,255,0.72)', fontFamily: Fonts.medium, fontSize: 13 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  seq: { width: 32, fontFamily: Fonts.display, fontSize: 18, lineHeight: 22 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontFamily: Fonts.semibold, fontSize: 15 },
  div: { height: StyleSheet.hairlineWidth },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cellTitle: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 20 },
  teamTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#ffffff', fontFamily: Fonts.bold, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  contact: {
    flex: 1,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contactTxt: { fontFamily: Fonts.semibold, fontSize: 14 },
  langRow: { flexDirection: 'row', gap: 8 },
  marketRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { alignItems: 'center', paddingTop: 8 },
});
