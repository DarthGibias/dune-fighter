export interface CloakSkin {
  id: string;
  name: string;
  color: string;
  cost: number;
}
export interface BladeSkin {
  id: string;
  name: string;
  color: string;
  cost: number;
}

/** Cloak colour swaps. "default" keeps each fighter's own palette (always owned, free). */
export const CLOAKS: CloakSkin[] = [
  { id: "default", name: "Original", color: "", cost: 0 },
  { id: "cloak-sand", name: "Sand Drift", color: "#C2A878", cost: 300 },
  { id: "cloak-blood", name: "Harkonnen Red", color: "#7F1D1D", cost: 500 },
  { id: "cloak-void", name: "Void Black", color: "#111318", cost: 500 },
  { id: "cloak-spice", name: "Spice Blue", color: "#1E5F74", cost: 800 },
  { id: "cloak-imperial", name: "Imperial Gold", color: "#9A7B1C", cost: 1200 },
  { id: "cloak-emerald", name: "Caladan Green", color: "#1F5C3A", cost: 1200 },
  { id: "cloak-violet", name: "Bene Gesserit", color: "#4C2A6B", cost: 1600 },
];

/** Blade / weapon colour swaps. "default" keeps the stock blade (always owned, free). */
export const BLADES: BladeSkin[] = [
  { id: "default", name: "Standard Steel", color: "", cost: 0 },
  { id: "blade-bone", name: "Crysknife Bone", color: "#F3E8D2", cost: 400 },
  { id: "blade-fire", name: "Ember Edge", color: "#F97316", cost: 700 },
  { id: "blade-ice", name: "Water of Life", color: "#38BDF8", cost: 700 },
  { id: "blade-toxic", name: "Toxic Fang", color: "#84CC16", cost: 1000 },
  { id: "blade-royal", name: "Golden Lion", color: "#FACC15", cost: 1400 },
  { id: "blade-void", name: "Shadow Steel", color: "#A855F7", cost: 1400 },
];

export const cloakById = (id: string | undefined): CloakSkin =>
  CLOAKS.find((c) => c.id === id) ?? CLOAKS[0];
export const bladeById = (id: string | undefined): BladeSkin =>
  BLADES.find((b) => b.id === id) ?? BLADES[0];

/** Resolve equipped slot ids to the actual override colours used by the renderer. */
export function resolveSkin(equipped: { cloak?: string; blade?: string } | undefined): {
  cloakColor?: string;
  bladeColor?: string;
} {
  const cloak = cloakById(equipped?.cloak).color;
  const blade = bladeById(equipped?.blade).color;
  return { cloakColor: cloak || undefined, bladeColor: blade || undefined };
}
