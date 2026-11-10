// Legacy outfit IDs stay readable for existing profiles. V2 renders original fur only.
export const pandaOutfits = [
  { id: 'purple', label: 'Purple hoodie', color: '#B98CEB' },
  { id: 'blue', label: 'Sky-blue hoodie', color: '#9EDAF2' },
  { id: 'pink', label: 'Pink hoodie', color: '#E9A9C2' },
  { id: 'original', label: 'Original panda', color: '#FFFEFD' },
] as const;
export const pandaAccessories = [
  { id: 'headphones', label: 'Headphones', icon: 'headset-outline' },
  { id: 'glasses', label: 'Round glasses', icon: 'glasses-outline' },
  { id: 'hat', label: 'Cute hat', icon: 'sparkles-outline' },
  { id: 'none', label: 'No accessory', icon: 'remove-circle-outline' },
] as const;
export interface PandaAppearance {
  outfit: (typeof pandaOutfits)[number]['id'];
  accessory: (typeof pandaAccessories)[number]['id'];
}
export const defaultPanda: PandaAppearance = { outfit: 'original', accessory: 'none' };
export function isPandaAppearance(value: unknown): value is PandaAppearance {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    pandaOutfits.some((outfit) => outfit.id === v.outfit) &&
    pandaAccessories.some((accessory) => accessory.id === v.accessory)
  );
}
export function pandaFromProfile(profile: {
  panda_outfit?: unknown;
  panda_accessory?: unknown;
}): PandaAppearance {
  const appearance = { outfit: profile.panda_outfit, accessory: profile.panda_accessory };
  return isPandaAppearance(appearance) ? appearance : defaultPanda;
}
export function samePanda(a: PandaAppearance, b: PandaAppearance) {
  return a.outfit === b.outfit && a.accessory === b.accessory;
}
export function pandaInputs(appearance: PandaAppearance) {
  return {
    // Outfit input is retained for backwards compatibility; V2 always uses original fur.
    outfit: 3,
    accessory: pandaAccessories.findIndex((v) => v.id === appearance.accessory),
  };
}
