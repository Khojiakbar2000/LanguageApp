import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tutor } from './Tutor';
import { Body, Button, colors } from './ui';
import { pandaAccessories, samePanda, type PandaAppearance } from '../lib/panda';
import { usePandaAppearance } from '../hooks/usePandaAppearance';
import { usePanda } from '../state/panda';
import { useApp } from '../state/store';
import { selectionHaptic } from './KoreanFuture';

export function PandaCustomizer() {
  const owner = useApp((s) => s.session?.user.id ?? 'guest');
  return <PandaCustomizerForm key={owner} />;
}
function PandaCustomizerForm() {
  const app = useApp();
  const saved = usePandaAppearance();
  const [draftOverride, setDraft] = useState<PandaAppearance | null>(null);
  const draft = { ...(draftOverride ?? saved), outfit: 'original' as const };
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [mood, setMood] = useState<'idle' | 'happy'>('idle');
  const hydrated = usePanda((s) => s.hydrated);
  const pending = usePanda((s) => (app.session ? s.accounts[app.session.user.id]?.pending : false));
  async function save() {
    setBusy(true);
    setNotice('');
    const userId = app.session?.user.id ?? null;
    usePanda.getState().save(draft, userId);
    setDraft(null);
    setMood('happy');
    if (userId) await useApp.getState().refresh();
    if (useApp.getState().session?.user.id === userId || !userId)
      setNotice(
        userId
          ? 'Your look is saved.'
          : 'Saved on this device. Sign in whenever you’d like to keep it with your account.',
      );
    setBusy(false);
  }
  return (
    <View style={s.section}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={s.title}>
          Make Dori yours.
        </Text>
        <Body muted>A familiar friend. A little more your style.</Body>
      </View>
      <View style={s.preview}>
        <View style={s.halo} />
        <Tutor state={mood} size={230} appearance={draft} />
        <Text style={s.previewLabel}>
          Original panda · {pandaAccessories.find((a) => a.id === draft.accessory)!.label}
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.label}>ACCESSORY</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Panda accessory"
          style={s.accessories}
        >
          {pandaAccessories.map((accessory) => (
            <Pressable
              key={accessory.id}
              accessibilityRole="radio"
              accessibilityLabel={accessory.label}
              accessibilityState={{ checked: draft.accessory === accessory.id }}
              aria-checked={draft.accessory === accessory.id}
              onPress={() => {
                selectionHaptic();
                setDraft({ ...draft, accessory: accessory.id });
                setMood('happy');
                setNotice('');
              }}
              style={({ pressed }) => [
                s.accessory,
                draft.accessory === accessory.id && s.selectedAccessory,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name={accessory.icon}
                size={20}
                color={draft.accessory === accessory.id ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  s.optionText,
                  draft.accessory === accessory.id && { color: colors.primary },
                ]}
              >
                {accessory.label}
              </Text>
              {draft.accessory === accessory.id && (
                <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <Button
        title="Save Dori’s look"
        loading={busy}
        disabled={!hydrated || samePanda(saved, draft)}
        onPress={() => void save()}
      />
      {pending ? (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          Saved on this device. Your account update is pending; pull to refresh to retry.
        </Text>
      ) : notice ? (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {notice}
        </Text>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  section: { gap: 22, paddingVertical: 8 },
  title: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.ink,
  },
  preview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    backgroundColor: colors.ice,
    top: 10,
  },
  previewLabel: { fontSize: 11, lineHeight: 18, color: colors.muted },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.7, color: colors.muted },
  optionText: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: colors.ink },
  accessories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accessory: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  selectedAccessory: { borderColor: colors.primary, backgroundColor: colors.ice },
  note: { fontSize: 12, lineHeight: 19, color: colors.muted },
});
