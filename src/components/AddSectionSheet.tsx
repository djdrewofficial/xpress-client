import { useEffect, useState } from 'react';

import { Sheet } from '@/components/ui';
import { resolveIcon } from '@/components/ui/iconForEmoji';
import type { IconName } from '@/components/ui';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import {
  addCustomSection,
  addSectionFromTemplate,
  getAddableSections,
  loadOverview,
  setSectionTime,
  type AddableSection,
} from '@/lib/planning';
import { MOMENT_ICONS, NewMomentForm, type Suggestion } from '@/components/plan/NewMomentForm';
import { useT } from '@/lib/i18n';

/* New moment — suggested rows come from the event's XOS template sections
   flagged client_addable (the existing addable-sections API). Custom moments
   keep a name, icon, chapter, time, and an optional DJ note. Songs are added
   later from the moment's Add music sheet. */

export function AddSectionSheet({
  visible,
  eventId,
  groupId,
  onClose,
  onAdded,
}: {
  visible: boolean;
  eventId: string;
  groupId: string;
  /** Kept so existing callers (a chapter already chosen) still compile. */
  groupTitle?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [selected, setSelected] = useState<AddableSection | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('sparkles');
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [partOf, setPartOf] = useState(groupId);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [time, setTime] = useState<string | null>(null);
  const [pickingTime, setPickingTime] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setName('');
    setIcon('sparkles');
    setPartOf(groupId);
    setTime(null);
    setNotes('');
    setError(null);
    setSuggestions(null);
    setGroups([]);
    getAddableSections(eventId)
      .then((rows) => setSuggestions(rows.map((r) => ({ id: r.templateSectionId, title: r.title, icon: r.icon }))))
      .catch(() => setSuggestions([]));
    loadOverview(eventId)
      .then((ov) => {
        setGroups(ov.groups.map((g) => ({ id: g.id, title: g.title })));
        setKnownIds(new Set(ov.sections.map((s) => s.id)));
        if (!groupId && ov.groups[0]) setPartOf(ov.groups[0].id);
      })
      .catch(() => {});
  }, [visible, eventId, groupId]);

  const pickSuggestion = (s: Suggestion) => {
    const full: AddableSection = { templateSectionId: s.id, title: s.title, icon: s.icon };
    setSelected(full);
    setName(s.title);
    setIcon(resolveIcon(s.icon) ?? 'sparkles');
    setError(null);
  };

  const onName = (v: string) => {
    setName(v);
    if (selected && v.trim() !== selected.title) setSelected(null);
  };

  const submit = async () => {
    const title = name.trim();
    const gid = partOf || groupId;
    if (!title) { setError(t('newMoment.needName')); return; }
    if (!gid) { setError(t('newMoment.needPart')); return; }
    setBusy(true);
    setError(null);
    const fromTemplate = selected != null && title === selected.title;
    const ok = fromTemplate
      ? await addSectionFromTemplate(eventId, gid, selected.templateSectionId)
      : await addCustomSection(eventId, gid, { title, notes: notes.trim() || undefined, icon });
    if (!ok) {
      setBusy(false);
      setError(t('newMoment.fail'));
      return;
    }
    if (time) {
      const ov = await loadOverview(eventId).catch(() => null);
      const created = ov?.sections.find((s) => !knownIds.has(s.id) && s.title === (fromTemplate ? selected.title : title));
      if (created) await setSectionTime(eventId, created.id, time);
    }
    setBusy(false);
    onAdded();
    onClose();
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose}>
        <NewMomentForm
          suggestions={suggestions ?? []}
          suggestionsLoading={suggestions === null}
          selectedId={selected?.templateSectionId ?? null}
          onSelectSuggestion={pickSuggestion}
          name={name}
          onName={onName}
          icon={MOMENT_ICONS.includes(icon) ? icon : 'sparkles'}
          onIcon={setIcon}
          groups={groups}
          groupId={partOf}
          onGroup={setPartOf}
          timeLabel={time}
          onPickTime={() => setPickingTime(true)}
          notes={notes}
          onNotes={setNotes}
          onSubmit={submit}
          busy={busy}
          error={error}
        />
      </Sheet>
      <TimePickerSheet
        visible={pickingTime}
        initial={time}
        title={t('time.sheet')}
        onClose={() => setPickingTime(false)}
        onSave={(t) => { setTime(t); setPickingTime(false); }}
      />
    </>
  );
}
