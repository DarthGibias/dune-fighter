
export type Weapon = "knife" | "sword" | "staff" | "needle" | "fists";
export type AbilityKind = "dash" | "voice" | "shield" | "poison" | "heal" | "dart";

export interface Palette {
  skin: string;
  suit: string;
  cloak: string;
  accent: string;
  hair: string;
  eyes: string;
}

export type Build = "slim" | "lean" | "athletic" | "heavy" | "obese" | "child";
export type HairStyle = "none" | "short" | "curly" | "wavy" | "long" | "bob" | "bun" | "slick" | "braids" | "platinum";
export type Outfit = "stillsuit" | "atreides" | "harkonnen" | "gown" | "bg-robe" | "mentat" | "sardaukar" | "imperial" | "suk" | "super" | "sandtrout";

/** Costume / body details used by the renderer to match the films. */
export interface Look {
  female?: boolean;
  build: Build;
  hair: HairStyle;
  outfit: Outfit;
  cape?: boolean;
  scar?: boolean;
  mentatLips?: boolean;
  diamond?: boolean;
  mustache?: boolean;
  helmet?: boolean;
  veil?: boolean;
  float?: boolean;
  emblem?: "S" | "hawk" | "griffin" | "lion";
}

export interface FighterDef {
  id: string;
  name: string;
  short: string;
  title: string;
  health: number;
  power: number;
  speed: number;
  defense: number;
  weapon: Weapon;
  hood: boolean;
  robe: boolean;
  bald?: boolean;
  beard?: boolean;
  ability: { kind: AbilityKind; name: string; desc: string };
  superName: string;
  palette: Palette;
  look?: Look;
  /** Rare fighters are never unlocked by wins — they are bought with spice. */
  rare?: boolean;
  price?: number;
}

const FREMEN_EYES = "#2CD4F5";

export const FIGHTERS: FighterDef[] = [
  { id: "paul", name: "Paul Atreides", short: "Paul", title: "Desert Ghost", health: 100, power: 8, speed: 8, defense: 7, weapon: "knife", hood: false, robe: false,
    ability: { kind: "dash", name: "Weirding Step", desc: "Blink-dash strike that passes through parries" }, superName: "Prescience Fury",
    palette: { skin: "#E7C3A0", suit: "#3A332C", cloak: "#8C6E4E", accent: "#E8892C", hair: "#2B1D14", eyes: FREMEN_EYES } },
  { id: "chani", name: "Chani", short: "Chani", title: "Desert Spirit", health: 95, power: 7, speed: 9, defense: 6, weapon: "knife", hood: true, robe: false,
    ability: { kind: "dash", name: "Desert Dash", desc: "Instant strike through shields" }, superName: "Sietch Fury",
    palette: { skin: "#C99A74", suit: "#4A3F37", cloak: "#9C7B57", accent: "#2CD4F5", hair: "#1A1210", eyes: FREMEN_EYES } },
  { id: "gurney", name: "Gurney Halleck", short: "Gurney", title: "Warmaster", health: 125, power: 8, speed: 5, defense: 9, weapon: "sword", hood: false, robe: false, beard: true,
    ability: { kind: "shield", name: "Holtzman Shield", desc: "Absorbs the next 3 hits for 4 seconds" }, superName: "Baliset Requiem",
    palette: { skin: "#D9A985", suit: "#353935", cloak: "#5C3A21", accent: "#3B82F6", hair: "#6B4A2E", eyes: "#93C5FD" } },
  { id: "feyd", name: "Feyd-Rautha", short: "Feyd", title: "Na-Baron", health: 110, power: 9, speed: 7, defense: 6, weapon: "sword", hood: false, robe: false, bald: true,
    ability: { kind: "poison", name: "Toxic Blade", desc: "Next hit poisons — damage over time" }, superName: "Arena Execution",
    palette: { skin: "#EDEDEA", suit: "#141414", cloak: "#1E1E1E", accent: "#EF4444", hair: "#F5F5F5", eyes: "#111111" } },
  { id: "stilgar", name: "Stilgar", short: "Stilgar", title: "Naib of Tabr", health: 120, power: 8, speed: 6, defense: 8, weapon: "knife", hood: true, robe: true, beard: true,
    ability: { kind: "dash", name: "Sietch Charge", desc: "Charging strike through shields" }, superName: "Lisan al-Gaib!",
    palette: { skin: "#B98863", suit: "#3D342B", cloak: "#7A5F43", accent: "#E8892C", hair: "#1C1612", eyes: FREMEN_EYES } },
  { id: "jessica", name: "Lady Jessica", short: "Jessica", title: "Bene Gesserit", health: 90, power: 6, speed: 8, defense: 7, weapon: "fists", hood: true, robe: true,
    ability: { kind: "voice", name: "The Voice", desc: "Commands the foe to freeze for 1 second" }, superName: "Reverend Mother",
    palette: { skin: "#EAC9AA", suit: "#2A2420", cloak: "#5B4636", accent: "#C084FC", hair: "#7A3B1E", eyes: FREMEN_EYES } },
  { id: "duncan", name: "Duncan Idaho", short: "Duncan", title: "Swordmaster", health: 115, power: 9, speed: 7, defense: 7, weapon: "sword", hood: false, robe: false,
    ability: { kind: "shield", name: "Ginaz Guard", desc: "Absorbs the next 3 hits for 4 seconds" }, superName: "Last Stand",
    palette: { skin: "#D7A47C", suit: "#2F3A2F", cloak: "#4A3A28", accent: "#22C55E", hair: "#1E1510", eyes: "#3B2A1A" } },
  { id: "alia", name: "Alia Atreides", short: "Alia", title: "Abomination", health: 85, power: 7, speed: 10, defense: 5, weapon: "needle", hood: true, robe: true,
    ability: { kind: "poison", name: "Gom Jabbar Prick", desc: "Next hit poisons — damage over time" }, superName: "Pre-born Wrath",
    palette: { skin: "#F1D4BA", suit: "#E9E4DA", cloak: "#F3EFE6", accent: "#2CD4F5", hair: "#C98B5A", eyes: FREMEN_EYES } },
  { id: "leto", name: "Duke Leto", short: "Leto", title: "Red Duke", health: 110, power: 7, speed: 6, defense: 8, weapon: "sword", hood: false, robe: false, beard: true,
    ability: { kind: "heal", name: "Ducal Resolve", desc: "Restores 15 health" }, superName: "Poison Tooth",
    palette: { skin: "#DDB08C", suit: "#1F3A2C", cloak: "#2A2A2A", accent: "#16A34A", hair: "#3A2A1E", eyes: "#2B2B2B" } },
  { id: "thufir", name: "Thufir Hawat", short: "Thufir", title: "Mentat", health: 100, power: 7, speed: 6, defense: 8, weapon: "knife", hood: false, robe: false, bald: true,
    ability: { kind: "dart", name: "Hunter-Seeker", desc: "Launches a homing dart" }, superName: "Mentat Calculation",
    palette: { skin: "#CFA486", suit: "#2E2E36", cloak: "#3C3C46", accent: "#A3E635", hair: "#9CA3AF", eyes: "#4B5563" } },
  { id: "liet", name: "Liet-Kynes", short: "Liet", title: "Planetologist", health: 95, power: 6, speed: 8, defense: 7, weapon: "knife", hood: true, robe: false,
    ability: { kind: "heal", name: "Water of Life", desc: "Restores 15 health" }, superName: "Dream of Green",
    palette: { skin: "#7B5640", suit: "#5A4A38", cloak: "#A08262", accent: "#2CD4F5", hair: "#111111", eyes: FREMEN_EYES } },
  { id: "yueh", name: "Dr. Yueh", short: "Yueh", title: "Suk Doctor", health: 90, power: 6, speed: 7, defense: 6, weapon: "needle", hood: false, robe: false, beard: true,
    ability: { kind: "voice", name: "Suk Sedative", desc: "Freezes the foe for 1 second" }, superName: "Betrayal",
    palette: { skin: "#E0BE9B", suit: "#1E1E1E", cloak: "#2A2A2A", accent: "#14B8A6", hair: "#121212", eyes: "#222222" } },
  { id: "rabban", name: "Glossu Rabban", short: "Rabban", title: "The Beast", health: 135, power: 10, speed: 4, defense: 8, weapon: "fists", hood: false, robe: false, bald: true,
    ability: { kind: "shield", name: "Brute Hide", desc: "Absorbs the next 3 hits for 4 seconds" }, superName: "Beast Rampage",
    palette: { skin: "#EAE6E0", suit: "#111111", cloak: "#2B0A0A", accent: "#DC2626", hair: "#EAE6E0", eyes: "#1A1A1A" } },
  { id: "irulan", name: "Princess Irulan", short: "Irulan", title: "Imperial Heir", health: 90, power: 6, speed: 8, defense: 7, weapon: "needle", hood: false, robe: true,
    ability: { kind: "voice", name: "Imperial Decree", desc: "Freezes the foe for 1 second" }, superName: "Golden Lion Throne",
    palette: { skin: "#F2D6C0", suit: "#C7B07A", cloak: "#E4D3A6", accent: "#FACC15", hair: "#EAD7A3", eyes: "#3B82F6" } },
  { id: "piter", name: "Piter de Vries", short: "Piter", title: "Twisted Mentat", health: 90, power: 7, speed: 8, defense: 5, weapon: "needle", hood: false, robe: false,
    ability: { kind: "poison", name: "Sapho Venom", desc: "Next hit poisons — damage over time" }, superName: "Twisted Logic",
    palette: { skin: "#E7D6C8", suit: "#2B1B2E", cloak: "#3D2240", accent: "#BE185D", hair: "#1A1A1A", eyes: "#7F1D1D" } },
  { id: "mohiam", name: "Rev. Mother Mohiam", short: "Mohiam", title: "Truthsayer", health: 85, power: 7, speed: 6, defense: 8, weapon: "needle", hood: true, robe: true,
    ability: { kind: "voice", name: "Gom Jabbar Voice", desc: "Freezes the foe for 1 second" }, superName: "Box of Pain",
    palette: { skin: "#E3CBB5", suit: "#111111", cloak: "#151515", accent: "#E8892C", hair: "#2B2B2B", eyes: "#B59E8C" } },
  { id: "jamis", name: "Jamis", short: "Jamis", title: "Sietch Warrior", health: 110, power: 8, speed: 7, defense: 6, weapon: "knife", hood: true, robe: false, beard: true,
    ability: { kind: "dash", name: "Crysknife Lunge", desc: "Lunge strike through shields" }, superName: "Tahaddi Challenge",
    palette: { skin: "#A87A58", suit: "#3B3127", cloak: "#6E553D", accent: "#E8892C", hair: "#0F0B09", eyes: FREMEN_EYES } },
  { id: "margot", name: "Lady Margot", short: "Margot", title: "Sisterhood Agent", health: 90, power: 6, speed: 9, defense: 6, weapon: "fists", hood: false, robe: true,
    ability: { kind: "voice", name: "Seduction Voice", desc: "Freezes the foe for 1 second" }, superName: "Kwisatz Gambit",
    palette: { skin: "#F3D9C4", suit: "#3B1F2E", cloak: "#6B2F4A", accent: "#F472B6", hair: "#E2C27A", eyes: "#2563EB" } },
  { id: "fenring", name: "Count Fenring", short: "Fenring", title: "Failed Kwisatz", health: 100, power: 8, speed: 9, defense: 6, weapon: "needle", hood: false, robe: false,
    ability: { kind: "dart", name: "Hidden Dart", desc: "Launches a homing dart" }, superName: "Ummm... Death",
    palette: { skin: "#E9CBB1", suit: "#2A2440", cloak: "#3D3560", accent: "#818CF8", hair: "#3A2A1E", eyes: "#1F2937" } },
  { id: "bashar", name: "Sardaukar Bashar", short: "Bashar", title: "Imperial Terror", health: 125, power: 9, speed: 6, defense: 9, weapon: "staff", hood: true, robe: false,
    ability: { kind: "shield", name: "Salusa Shield", desc: "Absorbs the next 3 hits for 4 seconds" }, superName: "Salusa Secundus",
    palette: { skin: "#C9A285", suit: "#4A4A4A", cloak: "#2E2E2E", accent: "#F97316", hair: "#1A1A1A", eyes: "#E5E7EB" } },
  { id: "shaddam", name: "Shaddam IV", short: "Shaddam", title: "Padishah Emperor", health: 115, power: 8, speed: 5, defense: 9, weapon: "sword", hood: false, robe: true, beard: true,
    ability: { kind: "heal", name: "Imperial Guard", desc: "Restores 15 health" }, superName: "Corrino Decree",
    palette: { skin: "#E5C0A0", suit: "#6B1E1E", cloak: "#A3282B", accent: "#FACC15", hair: "#B45309", eyes: "#3B2A1A" } },
  { id: "baron", name: "Baron Harkonnen", short: "Baron", title: "Floating Tyrant", health: 140, power: 9, speed: 3, defense: 10, weapon: "needle", hood: false, robe: true, bald: true,
    ability: { kind: "dart", name: "Suspensor Dart", desc: "Launches a homing dart" }, superName: "Harkonnen Purge",
    palette: { skin: "#E8DED6", suit: "#121212", cloak: "#1B1B1B", accent: "#B91C1C", hair: "#E8DED6", eyes: "#0F0F0F" } },
  { id: "leto2", name: "Leto II", short: "Leto II", title: "God Emperor", health: 130, power: 10, speed: 7, defense: 9, weapon: "fists", hood: true, robe: true,
    ability: { kind: "heal", name: "Sandtrout Skin", desc: "Restores 15 health" }, superName: "Golden Path",
    palette: { skin: "#B5946F", suit: "#5C4A30", cloak: "#8A6A3E", accent: "#2CD4F5", hair: "#2B1D14", eyes: FREMEN_EYES } },
  { id: "supergirl", name: "Supergirl", short: "Kara", title: "Last Daughter of Krypton", health: 120, power: 10, speed: 9, defense: 8, weapon: "fists", hood: false, robe: false,
    ability: { kind: "dart", name: "Heat Vision", desc: "Fires a homing heat-vision blast" }, superName: "Kryptonian Fury",
    rare: true, price: 10000,
    palette: { skin: "#F3D4BF", suit: "#1D3F9A", cloak: "#C21D25", accent: "#F8C630", hair: "#EBCB82", eyes: "#3B82F6" } },
  { id: "clayface", name: "Clayface", short: "Clayface", title: "The Shapeshifter",
    health: 135, power: 9, speed: 4, defense: 9, weapon: "fists", hood: false, robe: false, bald: true,
    ability: { kind: "shield", name: "Clay Armour", desc: "Absorbs incoming hits" },
    superName: "Mudslide Mayhem", rare: true, price: 12000,
    palette: { skin: "#96704F", suit: "#59402F", cloak: "#765638", accent: "#B88954", hair: "#59402F", eyes: "#FACC15" } },
  { id: "superman", name: "Superman", short: "Clark", title: "Man of Steel",
    health: 130, power: 10, speed: 9, defense: 9, weapon: "fists", hood: false, robe: false,
    ability: { kind: "dart", name: "Heat Vision", desc: "Fires a powerful heat-vision blast" },
    superName: "Kryptonian Power", rare: true, price: 15000,
    palette: { skin: "#EAC09D", suit: "#1746A2", cloak: "#C91E2B", accent: "#FACC15", hair: "#211A16", eyes: "#2563EB" } },
  { id: "greenlantern", name: "Green Lantern", short: "Lantern", title: "Emerald Guardian",
    health: 115, power: 9, speed: 8, defense: 9, weapon: "fists", hood: false, robe: false,
    ability: { kind: "shield", name: "Emerald Construct", desc: "Creates a protective energy shield" },
    superName: "Willpower Unleashed", rare: true, price: 15000,
    palette: { skin: "#E8BE9C", suit: "#087A42", cloak: "#064E3B", accent: "#39FF88", hair: "#211A16", eyes: "#16A34A" } },
];

/** Film-accurate costume notes, applied to the roster below. */
const LOOKS: Record<string, Look> = {
  paul: { build: "lean", hair: "wavy", outfit: "stillsuit" },
  chani: { female: true, build: "slim", hair: "curly", outfit: "stillsuit" },
  gurney: { build: "heavy", hair: "short", outfit: "atreides", scar: true, emblem: "hawk" },
  feyd: { build: "athletic", hair: "none", outfit: "harkonnen" },
  stilgar: { build: "athletic", hair: "short", outfit: "stillsuit" },
  jessica: { female: true, build: "slim", hair: "bun", outfit: "bg-robe", veil: false },
  duncan: { build: "athletic", hair: "long", outfit: "atreides", emblem: "hawk" },
  alia: { female: true, build: "child", hair: "long", outfit: "bg-robe" },
  leto: { build: "athletic", hair: "short", outfit: "atreides", cape: true, emblem: "hawk" },
  thufir: { build: "lean", hair: "short", outfit: "mentat", mentatLips: true, emblem: "hawk" },
  liet: { female: true, build: "slim", hair: "short", outfit: "stillsuit" },
  yueh: { build: "lean", hair: "long", outfit: "suk", diamond: true, mustache: true },
  rabban: { build: "heavy", hair: "none", outfit: "harkonnen", emblem: "griffin" },
  irulan: { female: true, build: "slim", hair: "platinum", outfit: "gown", emblem: "lion" },
  piter: { build: "slim", hair: "slick", outfit: "harkonnen", mentatLips: true },
  mohiam: { female: true, build: "slim", hair: "none", outfit: "bg-robe", veil: true },
  jamis: { build: "athletic", hair: "curly", outfit: "stillsuit" },
  margot: { female: true, build: "slim", hair: "platinum", outfit: "gown" },
  fenring: { build: "lean", hair: "slick", outfit: "imperial", mustache: true, emblem: "lion" },
  bashar: { build: "heavy", hair: "none", outfit: "sardaukar", helmet: true },
  shaddam: { build: "lean", hair: "short", outfit: "imperial", cape: true, emblem: "lion" },
  baron: { build: "obese", hair: "none", outfit: "harkonnen", float: true },
  leto2: { build: "athletic", hair: "long", outfit: "sandtrout" },
supergirl: { female: true, build: "athletic", hair: "long", outfit: "super", cape: true, emblem: "S" },  superman: { build: "athletic", hair: "short", outfit: "super", cape: true, emblem: "S" },
  greenlantern: { build: "athletic", hair: "short", outfit: "super" },
};

for (const f of FIGHTERS) f.look = LOOKS[f.id];

/** Every fighter that can be earned by winning (rare ones are bought). */
export const UNLOCKABLE = FIGHTERS.filter((f) => !f.rare);
export const RARE_FIGHTERS = FIGHTERS.filter((f) => f.rare);
export const isRare = (id: string) => !!FIGHTERS.find((f) => f.id === id)?.rare;

export const STARTER_IDS = ["chani", "paul", "feyd", "gurney"];
export const WINS_PER_UNLOCK = 3;

/** New players begin with a single, randomly chosen champion. */
export const randomStarterId = (): string => UNLOCKABLE[Math.floor(Math.random() * UNLOCKABLE.length)].id;

// Unlock order = roster order, starters first.
export const UNLOCK_ORDER: string[] = [
  ...STARTER_IDS,
  ...UNLOCKABLE.map((f) => f.id).filter((id) => !STARTER_IDS.includes(id)),
];

export const fighterById = (id: string): FighterDef =>
  FIGHTERS.find((f) => f.id === id) ?? FIGHTERS[1];

export const MAX_LEVEL = 10;
export const levelFromXp = (xp: number) => Math.min(MAX_LEVEL, Math.floor(Math.sqrt(xp / 40)) + 1);
/** Per-level stat boosts: +3% max health and +2% damage per level above 1. */
export const levelBoost = (level: number) => ({ hp: 1 + 0.03 * (level - 1), dmg: 1 + 0.02 * (level - 1) });
export const xpForLevel = (lvl: number) => (lvl - 1) * (lvl - 1) * 40;
