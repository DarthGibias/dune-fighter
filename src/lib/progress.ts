import { useSyncExternalStore } from "react";
import { FIGHTERS, UNLOCKABLE, WINS_PER_UNLOCK, fighterById, isRare, randomStarterId } from "@/lib/fighters";
import { TOWER_BONUS, TOWER_LENGTH } from "@/lib/tower";

/** Mirrors backend models/progress.py ProgressIn / Progress. */
export interface ProgressData {
  display_name: string;
  wins: number;
  losses: number;
  spice: number;
  xp: Record<string, number>;
  unlocked: string[];
  best_streak: number;
  highest_combo: number;
  hard_wins: number;
  favorite_fighter: string | null;
  tower_best: number;
  owned_cosmetics: string[];
  equipped: Record<string, { cloak?: string; blade?: string }>;
  /** Adaptive AI rating 0..100 — rises with wins, falls with losses. */
  skill: number;
  /** Lifetime totals so spending survives the server's max-merge; spice = earned - spent. */
  spice_earned: number;
  spice_spent: number;
}

export interface Progress extends ProgressData {
  user_id: string;
  updated_at: string;
}

export type MatchMode = "single" | "bo3";
export type CosmeticSlot = "cloak" | "blade";

export interface Settings {
  mode: MatchMode;
  selected: string;
  muted: boolean;
}

interface LocalState {
  progress: ProgressData;
  streak: number;
  plays: Record<string, number>;
}

const GUEST_KEY = "spiceclash:guest";
const SETTINGS_KEY = "spiceclash:settings";

export const emptyProgress = (): ProgressData => ({
  display_name: "Guest",
  wins: 0,
  losses: 0,
  spice: 0,
  xp: {},
  unlocked: [randomStarterId()],
  best_streak: 0,
  highest_combo: 0,
  hard_wins: 0,
  favorite_fighter: null,
  tower_best: 0,
  owned_cosmetics: [],
  equipped: {},
  skill: 0,
  spice_earned: 0,
  spice_spent: 0,
});

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

/** Unlocked fighters must always be a list of ids; repair objects/numbers/garbage from bad saves. */
export function toIdList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (v && typeof v === "object") return Object.keys(v as Record<string, unknown>);
  return [];
}

/** Fill fields missing from saves made by older versions (e.g. before the Armory/Tower existed). */
function normalizeProgress(p: Partial<ProgressData> | undefined): ProgressData {
  const base = emptyProgress();
  const merged = { ...base, ...(p ?? {}) };
  return {
    ...merged,
    xp: merged.xp ?? {},
    unlocked: toIdList(merged.unlocked).length ? toIdList(merged.unlocked) : base.unlocked,
    owned_cosmetics: toIdList(merged.owned_cosmetics),
    tower_best: merged.tower_best ?? 0,
    equipped: merged.equipped ?? {},
    skill: merged.skill ?? 0,
    spice_spent: merged.spice_spent ?? 0,
    spice_earned: merged.spice_earned ?? merged.spice + (merged.spice_spent ?? 0),
  };
}

function readState(key: string): LocalState {
  const s = read<LocalState>(key, { progress: emptyProgress(), streak: 0, plays: {} });
  return { streak: s.streak ?? 0, plays: s.plays ?? {}, progress: normalizeProgress(s.progress) };
}

let ownerKey = GUEST_KEY;
let state: LocalState = readState(GUEST_KEY);
let settings: Settings = read<Settings>(SETTINGS_KEY, {
  mode: "bo3",
  selected: state.progress.unlocked[0] ?? "chani",
  muted: false,
});
// Keep the selected fighter valid for the active roster.
if (!state.progress.unlocked.includes(settings.selected)) {
  settings = { ...settings, selected: state.progress.unlocked[0] ?? FIGHTERS[0].id };
}
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(ownerKey, JSON.stringify(state));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full / disabled — game still runs */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useProgress = () => useSyncExternalStore(subscribe, () => state.progress);
export const useSettings = () => useSyncExternalStore(subscribe, () => settings);
export const getProgress = () => state.progress;
export const getSettings = () => settings;
export const isGuest = () => ownerKey === GUEST_KEY;

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  emit();
}

/** Switch the active store to a signed-in account (cache) or back to guest. */
export function switchOwner(userId: string | null) {
  const key = userId ? `spiceclash:user:${userId}` : GUEST_KEY;
  if (key === ownerKey) return;
  ownerKey = key;
  state = readState(key);
  if (!state.progress.unlocked.includes(settings.selected)) {
    settings = { ...settings, selected: state.progress.unlocked[0] ?? FIGHTERS[0].id };
  }
  emit();
}

export function readGuestProgress(): ProgressData {
  return readState(GUEST_KEY).progress;
}

export function clearGuestProgress() {
  localStorage.removeItem(GUEST_KEY);
}

export function replaceProgress(p: ProgressData) {
  state = { ...state, progress: normalizeProgress(p) };
  if (!state.progress.unlocked.includes(settings.selected)) {
    settings = { ...settings, selected: state.progress.unlocked[0] ?? FIGHTERS[0].id };
  }
  emit();
}

export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const xp: Record<string, number> = { ...a.xp };
  for (const [k, v] of Object.entries(b.xp)) xp[k] = Math.max(xp[k] ?? 0, v);
  const equipped = { ...b.equipped, ...a.equipped };
  return {
    display_name: a.display_name,
    wins: Math.max(a.wins, b.wins),
    losses: Math.max(a.losses, b.losses),
    spice: Math.max(0, Math.max(a.spice_earned, b.spice_earned) - Math.max(a.spice_spent, b.spice_spent)),
    spice_earned: Math.max(a.spice_earned, b.spice_earned),
    spice_spent: Math.max(a.spice_spent, b.spice_spent),
    skill: Math.max(a.skill, b.skill),
    xp,
    unlocked: Array.from(new Set([...toIdList(a.unlocked), ...toIdList(b.unlocked)])),
    best_streak: Math.max(a.best_streak, b.best_streak),
    highest_combo: Math.max(a.highest_combo, b.highest_combo),
    hard_wins: Math.max(a.hard_wins, b.hard_wins),
    favorite_fighter: a.favorite_fighter ?? b.favorite_fighter,
    tower_best: Math.max(a.tower_best, b.tower_best),
    owned_cosmetics: Array.from(new Set([...a.owned_cosmetics, ...b.owned_cosmetics])),
    equipped,
  };
}

// ───────────────────────── adaptive difficulty ─────────────────────────

export const clampSkill = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
/** Reward multiplier grows with the opposition you are facing (1x → 3x). */
export const skillMult = (skill: number) => 1 + skill / 50;
/** Opponent level (1..10) tracks your skill rating. */
export const opponentLevel = (skill: number) => Math.min(10, 1 + Math.floor(skill / 11));
export const HARD_SKILL = 60;

const TIERS = [
  { min: 90, name: "Kwisatz Haderach" },
  { min: 70, name: "Swordmaster" },
  { min: 45, name: "Sardaukar" },
  { min: 20, name: "Fedaykin" },
  { min: 0, name: "Recruit" },
];
export const skillTier = (skill: number) => TIERS.find((t) => skill >= t.min)!.name;
/** How much the rating moves after a match. */
export const skillDelta = (won: boolean, hpPct: number) => (won ? 6 + Math.round(hpPct * 6) : -7);

export interface MatchOutcome {
  won: boolean;
  fighterId: string;
  skill: number;
  hpPct: number; // 0..1 remaining hp of player at end
  maxCombo: number;
  perfectParries: number;
}

export interface RewardSummary {
  spiceBase: number;
  spiceBonus: number;
  spiceTotal: number;
  xpGained: number;
  xpBefore: number;
  xpAfter: number;
  newUnlock: string | null;
  winsToNext: number | null;
  skillBefore: number;
  skillAfter: number;
}

/** Rare (bought) fighters don't count toward the win-based unlock ladder. */
const earnedCount = (unlocked: unknown) => toIdList(unlocked).filter((id) => !isRare(id)).length;

export function winsToNextUnlock(wins: number, unlocked: unknown): number | null {
  if (earnedCount(unlocked) >= UNLOCKABLE.length) return null;
  return WINS_PER_UNLOCK - (wins % WINS_PER_UNLOCK);
}

export function applyMatch(o: MatchOutcome): RewardSummary {
  const p = state.progress;
  const mult = skillMult(o.skill);
  const spiceBase = Math.round((o.won ? 60 : 15) * mult);
  const spiceBonus = Math.round((o.maxCombo * 4 + o.perfectParries * 6 + (o.won ? o.hpPct * 30 : 0)) * mult);
  // XP is earned on wins only.
  const xpGained = o.won ? Math.round(45 * mult) : 0;
  const xpBefore = p.xp[o.fighterId] ?? 0;
  const wins = p.wins + (o.won ? 1 : 0);
  const streak = o.won ? state.streak + 1 : 0;

  // Count-based unlocking: start with 1 fighter, earn one more every WINS_PER_UNLOCK wins.
  let unlocked = toIdList(p.unlocked);
  let newUnlock: string | null = null;
  const shouldHave = Math.min(UNLOCKABLE.length, 1 + Math.floor(wins / WINS_PER_UNLOCK));
  if (earnedCount(unlocked) < shouldHave) {
    for (const f of UNLOCKABLE) {
      if (earnedCount(unlocked) >= shouldHave) break;
      if (!unlocked.includes(f.id)) {
        unlocked = [...unlocked, f.id];
        newUnlock = f.id;
      }
    }
  }

  const plays = { ...state.plays, [o.fighterId]: (state.plays[o.fighterId] ?? 0) + 1 };
  const favorite = Object.entries(plays).sort((a, b) => b[1] - a[1])[0]?.[0] ?? o.fighterId;

  state = {
    streak,
    plays,
    progress: {
      ...p,
      wins,
      losses: p.losses + (o.won ? 0 : 1),
      spice: p.spice + spiceBase + spiceBonus,
      spice_earned: p.spice_earned + spiceBase + spiceBonus,
      skill: clampSkill(p.skill + skillDelta(o.won, o.hpPct)),
      xp: { ...p.xp, [o.fighterId]: xpBefore + xpGained },
      unlocked,
      best_streak: Math.max(p.best_streak, streak),
      highest_combo: Math.max(p.highest_combo, o.maxCombo),
      hard_wins: p.hard_wins + (o.won && o.skill >= HARD_SKILL ? 1 : 0),
      favorite_fighter: favorite,
    },
  };
  emit();
  return {
    spiceBase,
    spiceBonus,
    spiceTotal: spiceBase + spiceBonus,
    xpGained,
    xpBefore,
    xpAfter: xpBefore + xpGained,
    newUnlock,
    winsToNext: winsToNextUnlock(wins, unlocked),
    skillBefore: p.skill,
    skillAfter: clampSkill(p.skill + skillDelta(o.won, o.hpPct)),
  };
}

/** Record a cleared tower rung. Grants a one-time bonus the first time the tower is fully cleared. */
export function recordTowerWin(rung: number): { completed: boolean; bonus: number } {
  const p = state.progress;
  const cleared = rung + 1;
  const firstFullClear = cleared >= TOWER_LENGTH && p.tower_best < TOWER_LENGTH;
  const bonus = firstFullClear ? TOWER_BONUS : 0;
  state = {
    ...state,
    progress: { ...p, tower_best: Math.max(p.tower_best, cleared), spice: p.spice + bonus, spice_earned: p.spice_earned + bonus },
  };
  emit();
  return { completed: cleared >= TOWER_LENGTH, bonus };
}

// ───────────────────────── cosmetics (Armory) ─────────────────────────

export const getEquipped = (fighterId: string): { cloak?: string; blade?: string } =>
  state.progress.equipped?.[fighterId] ?? {};

export const ownsCosmetic = (id: string): boolean =>
  id === "default" || (state.progress.owned_cosmetics ?? []).includes(id);

export function buyCosmetic(id: string, cost: number): boolean {
  const p = state.progress;
  if (p.owned_cosmetics.includes(id) || p.spice < cost) return false;
  state = { ...state, progress: { ...p, spice: p.spice - cost, spice_spent: p.spice_spent + cost, owned_cosmetics: [...p.owned_cosmetics, id] } };
  emit();
  return true;
}

/** Buy a rare fighter outright with spice. */
export function buyFighter(id: string): boolean {
  const p = state.progress;
  const f = fighterById(id);
  const cost = f.price ?? 0;
  const owned = toIdList(p.unlocked);
  if (!f.rare || owned.includes(id) || p.spice < cost) return false;
  state = { ...state, progress: { ...p, spice: p.spice - cost, spice_spent: p.spice_spent + cost, unlocked: [...owned, id] } };
  emit();
  return true;
}

export function equipCosmetic(fighterId: string, slot: CosmeticSlot, id: string) {
  const p = state.progress;
  const cur = { ...(p.equipped[fighterId] ?? {}) };
  if (id === "default") delete cur[slot];
  else cur[slot] = id;
  state = { ...state, progress: { ...p, equipped: { ...p.equipped, [fighterId]: cur } } };
  emit();
}
