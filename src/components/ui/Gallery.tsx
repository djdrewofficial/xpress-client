import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Type, type Scheme } from '@/lib/theme';
import { Button } from './Button';
import { CoachMark } from './CoachMark';
import { CodeInput } from './CodeInput';
import { CountdownHero } from './CountdownHero';
import { ICON_NAMES } from './iconData';
import { Icon } from './Icon';
import { LanguageCard } from './LanguageCard';
import { LegalLine } from './LegalLine';
import { ListCell } from './ListCell';
import { MomentRow } from './MomentRow';
import { NavBar } from './NavBar';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';
import { TabBar } from './TabBar';
import { TrackRow } from './TrackRow';
import { ThemeSchemeOverride, useC } from './useC';

/** Dev-only catalog of the v2 kit. Not linked from the app. */
export function Gallery() {
  const system: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [scheme, setScheme] = useState<Scheme>(system);
  return (
    <ThemeSchemeOverride scheme={scheme}>
      <GalleryBody scheme={scheme} onScheme={setScheme} />
    </ThemeSchemeOverride>
  );
}

function daysAhead(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function GalleryBody({ scheme, onScheme }: { scheme: Scheme; onScheme: (s: Scheme) => void }) {
  const c = useC();
  const [seg, setSeg] = useState<'email' | 'text'>('text');
  const [tab, setTab] = useState('home');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [code, setCode] = useState('482');
  const [badCode, setBadCode] = useState('482107');
  const [sheet, setSheet] = useState(false);
  const [tip, setTip] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[Type.largeTitle, { color: c.ink }]}>Foundations</Text>
        <Text style={[Type.footnote, { color: c.ink2, marginBottom: 12 }]}>Dev gallery · not in production navigation</Text>
        <SegmentedControl
          options={[{ value: 'light' as const, label: 'Light' }, { value: 'dark' as const, label: 'Dark' }]}
          value={scheme}
          onChange={onScheme}
        />

        <Section title="Button">
          <Button label="Continue planning" arrow onPress={() => {}} />
          <Button label="Import 12 songs" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Clear time" variant="ghost" onPress={() => {}} />
          <Button label="Pressed look is on tap" arrow="chev-r" onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
          <Button label="Disabled ghost" variant="ghost" disabled onPress={() => {}} />
        </Section>

        <Section title="Segmented">
          <SegmentedControl
            options={[{ value: 'email' as const, label: 'Email' }, { value: 'text' as const, label: 'Text' }]}
            value={seg}
            onChange={setSeg}
          />
        </Section>

        <Section title="Nav bar">
          <View style={[styles.frame, { backgroundColor: c.surface, borderColor: c.line }]}>
            <NavBar title="First dance" onBack={() => {}} trailing={{ label: 'Edit', onPress: () => {} }} />
          </View>
          <View style={[styles.frame, { backgroundColor: c.surface, borderColor: c.line }]}>
            <NavBar large title="The Ultimate night" accent="Ultimate" onBack={() => {}} />
          </View>
        </Section>

        <Section title="Tab bar">
          <View style={[styles.frame, { backgroundColor: c.surface, borderColor: c.line, overflow: 'hidden' }]}>
            <TabBar active={tab} onChange={setTab} />
          </View>
        </Section>

        <Section title="Countdown hero">
          <CountdownHero date={daysAhead(220)} venue="Sample Venue" dateLabel="SAT · JUNE 13, 2027" progress={43} size="large" />
          <CountdownHero date={daysAhead(12)} venue="The night" size="compact" />
          <CountdownHero date={daysAhead(0)} size="compact" />
        </Section>

        <Section title="Moment row">
          <MomentRow title="First dance" time="7:40 PM" meta="2 questions · 1 song" badge="done" />
          <MomentRow title="Open dancing" time={null} meta="Add a time" badge="dj-note" />
          <MomentRow title="Cake cutting" time="9:15 PM" meta="3/5" badge="3/5" dragging />
        </Section>

        <Section title="Track row">
          <TrackRow index={1} title="At Last" artist="Etta James" mustPlay />
          <TrackRow index={2} title="September" artist="Earth, Wind & Fire" note="Play this right after the first dance, then open the floor." />
          <TrackRow title="Cha Cha Slide" artist="DJ Casper" doNotPlay />
        </Section>

        <Section title="List cell">
          <ListCell icon="shield" title="Privacy Policy" subtitle="How we use your details" />
          <ListCell icon="signout" title="Sign out" />
          <ListCell icon="plus" title="New moment" subtitle="Add something the template missed" />
        </Section>

        <Section title="Coach mark">
          <CoachMark
            visible={tip}
            headline="Add a moment"
            body="Tap + to add a moment or upload the timeline from your planner."
            footnote="Shows once on the first Timeline visit."
            onDismiss={() => setTip(false)}
          />
          {!tip ? <Button label="Show tip again" variant="ghost" onPress={() => setTip(true)} /> : null}
        </Section>

        <Section title="Code input">
          <CodeInput value={code} onChange={setCode} />
          <CodeInput value={badCode} onChange={setBadCode} error="That code is wrong or expired. Request a new one." />
        </Section>

        <Section title="Language">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <LanguageCard label="English" selected={lang === 'en'} selectedLabel="Selected" onPress={() => setLang('en')} />
            <LanguageCard label="Español" selected={lang === 'es'} selectedLabel="Elegido" onPress={() => setLang('es')} />
          </View>
          <LegalLine language={lang} onTerms={() => {}} onPrivacy={() => setSheet(true)} />
        </Section>

        <Section title="Icons">
          <View style={styles.iconGrid}>
            {ICON_NAMES.map((name) => (
              <View key={name} style={styles.iconCell}>
                <Icon name={name} size={24} color={c.ink} />
                <Text style={[Type.footnote, { color: c.ink3, fontSize: 9, lineHeight: 12, textAlign: 'center' }]} numberOfLines={2}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Privacy Policy">
        <Text style={[Type.body, { color: c.ink2 }]}>Design preview. The readable policy opens from sign-in and My Event.</Text>
        <View style={{ height: 12 }} />
        <Button label="Close" variant="ghost" onPress={() => setSheet(false)} />
      </Sheet>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useC();
  return (
    <View style={styles.section}>
      <Text style={[Type.label, { color: c.accent, marginBottom: 10 }]}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48, gap: 8 },
  section: { marginTop: 22 },
  frame: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  iconCell: { width: '25%', alignItems: 'center', gap: 4, paddingVertical: 8 },
});
