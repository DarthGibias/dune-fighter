import { fighterById, type FighterDef } from "@/lib/fighters";

/** Ordered ladder of rivals, weakest → strongest. Each rung also scales stats up. */
export const TOWER_IDS = ["jamis", "chani", "duncan", "liet", "gurney", "feyd", "rabban", "baron", "leto2"];
export const TOWER_LENGTH = TOWER_IDS.length;

/** One-time spice reward for clearing the whole tower. */
export const TOWER_BONUS = 2000;

/** Stat multiplier applied to the opponent at a given 0-based rung. */
export const towerScale = (rung: number): number => 1 + rung * 0.07;

/** Build the scaled opponent for a rung. */
export function towerOpponent(rung: number): FighterDef {
  const base = fighterById(TOWER_IDS[Math.min(rung, TOWER_LENGTH - 1)]);
  const s = towerScale(rung);
  return {
    ...base,
    title: `Tower rung ${rung + 1}`,
    health: Math.round(base.health * s),
    power: Math.min(10, Math.round(base.power * (1 + rung * 0.04))),
    defense: Math.min(10, Math.round(base.defense * (1 + rung * 0.03))),
  };
}

/** Stationary practice dummy for Training mode. */
export function dummyFighter(): FighterDef {
  return {
    id: "dummy",
    name: "Training Dummy",
    short: "Dummy",
    title: "Practice Post",
    health: 200,
    power: 0,
    speed: 0,
    defense: 4,
    weapon: "fists",
    hood: false,
    robe: false,
    ability: { kind: "shield", name: "—", desc: "—" },
    superName: "—",
    palette: { skin: "#B89B7E", suit: "#5C4A38", cloak: "#6E553D", accent: "#8A6A3E", hair: "#3A2A1E", eyes: "#2B2B2B" },
  };
}
