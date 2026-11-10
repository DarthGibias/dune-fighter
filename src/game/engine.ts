import { levelBoost, type FighterDef } from "@/lib/fighters";
import type { MatchMode } from "../lib/progress";
import { sfx } from "../lib/audio";
import { GROUND, IDLE, VH, VW, blend, drawFighter, drawSandworm, renderBackdrop, type Pose } from "@/game/draw";

export type Move = "light" | "heavy" | "sweep" | "grab" | "super" | "dash";
export type Command = Move | "ability" | "taunt" | "jump";
type State = "idle" | "walk" | "attack" | "hitstun" | "down" | "parry" | "taunt" | "ability" | "ko" | "win" | "frozen";

interface AttackSpec {
  startup: number;
  active: number;
  recovery: number;
  dmg: number;
  range: number;
  stun: number;
  push: number;
  meter: number;
  low?: boolean;
  knockdown?: boolean;
  unblockable?: boolean;
  pierce?: boolean;
  lunge?: number;
}

const ATTACKS: Record<Move, AttackSpec> = {
  light: { startup: 5, active: 4, recovery: 9, dmg: 6, range: 108, stun: 15, push: 4, meter: 8 },
  heavy: { startup: 13, active: 5, recovery: 18, dmg: 14, range: 125, stun: 24, push: 9, meter: 14 },
  sweep: { startup: 9, active: 5, recovery: 17, dmg: 9, range: 118, stun: 20, push: 3, meter: 11, low: true, knockdown: true },
  grab: { startup: 4, active: 3, recovery: 22, dmg: 13, range: 82, stun: 26, push: 12, meter: 18, unblockable: true },
  super: { startup: 18, active: 12, recovery: 26, dmg: 30, range: 150, stun: 40, push: 16, meter: 0, unblockable: true, knockdown: true, lunge: 13 },
  dash: { startup: 3, active: 8, recovery: 14, dmg: 10, range: 90, stun: 18, push: 6, meter: 8, pierce: true, lunge: 20 },
};

const POSES: Record<string, Partial<Pose>> = {
  windLight: { frontArm: 0.1, frontFore: 1.6, lean: 0 },
  light: { frontArm: 1.55, frontFore: 0.05, lean: 0.2, frontLeg: 0.45, backLeg: -0.45, glow: 0.5 },
  windHeavy: { frontArm: 2.8, frontFore: 0.3, lean: -0.15, glow: 0.4 },
  heavy: { frontArm: 1.15, frontFore: -0.1, lean: 0.4, frontLeg: 0.6, frontKnee: 0.5, backLeg: -0.6, crouch: 0.2, glow: 1, weapon: 0.4 },
  windSweep: { crouch: 0.45, lean: 0.1, frontLeg: 0.3, frontKnee: 0.9 },
  sweep: { crouch: 0.55, lean: -0.25, frontLeg: 1.45, frontKnee: 0, backLeg: -0.3, backKnee: 1.2, frontArm: 0.2, backArm: -0.8 },
  windGrab: { lean: 0.15, frontArm: 0.9, backArm: 0.6, frontFore: 0.6 },
  grab: { lean: 0.3, frontArm: 1.5, frontFore: 0.1, backArm: 1.4, backFore: 0.2, frontLeg: 0.5, backLeg: -0.5 },
  windSuper: { crouch: 0.35, frontArm: 3.0, frontFore: 0, backArm: 2.6, lean: -0.2, glow: 1 },
  super: { lean: 0.45, frontArm: 1.6, frontFore: 0, backArm: -0.9, frontLeg: 0.8, backLeg: -0.8, crouch: 0.15, glow: 1 },
  windDash: { crouch: 0.3, lean: 0.3, frontArm: 0.3, frontFore: 1.4, glow: 0.6 },
  dash: { lean: 0.55, frontArm: 1.6, frontFore: 0, backArm: -1.0, frontLeg: 0.7, backLeg: -0.9, glow: 1 },
  parry: { frontArm: 1.3, frontFore: 1.9, backArm: 0.9, backFore: 1.6, crouch: 0.15, lean: -0.05 },
  hit: { lean: -0.35, frontArm: -0.4, backArm: -0.6, frontFore: 0.4, crouch: 0.1 },
  jump: { frontLeg: 0.7, frontKnee: 1.3, backLeg: -0.1, backKnee: 1.4, frontArm: 1.0, backArm: -0.5 },
  taunt: { frontArm: 2.7, frontFore: 0.3, backArm: -2.6, backFore: -0.3, lean: -0.1 },
  ability: { frontArm: 1.7, frontFore: -0.2, backArm: 2.4, lean: 0.1, glow: 1 },
};
const P = (k: string): Pose => ({ ...IDLE, ...POSES[k] });

export interface Input {
  left: boolean;
  right: boolean;
  parry: boolean;
  pressed: Command[];
}
const emptyInput = (): Input => ({ left: false, right: false, parry: false, pressed: [] });

class Fighter {
  def: FighterDef;
  x: number;
  y = GROUND;
  vx = 0;
  vy = 0;
  facing: number;
  hp: number;
  maxHp: number;
  meter = 0;
  state: State = "idle";
  st = 0;
  atk: Move | null = null;
  atkHit = false;
  stun = 0;
  parryStart = -999;
  abilityCd = 0;
  shieldHits = 0;
  shieldT = 0;
  poisonArmed = 0;
  poisonT = 0;
  frozenT = 0;
  flash = 0;
  combo = 0;
  comboT = 0;
  maxCombo = 0;
  perfectParries = 0;
  pose: Pose = { ...IDLE };
  walkPhase = 0;
  riding = false;
  level: number;
  dmgMult: number;

  constructor(def: FighterDef, x: number, facing: number, level = 1) {
    this.def = def;
    this.x = x;
    this.facing = facing;
    this.level = level;
    const boost = levelBoost(level);
    this.dmgMult = boost.dmg;
    this.maxHp = Math.round(def.health * boost.hp);
    this.hp = this.maxHp;
  }
  get airborne() {
    return this.y < GROUND - 0.5;
  }
  set(s: State) {
    this.state = s;
    this.st = 0;
  }
  reset(x: number, facing: number) {
    Object.assign(this, { x, facing, y: GROUND, vx: 0, vy: 0, hp: this.maxHp, state: "idle", st: 0, atk: null, stun: 0 });
    Object.assign(this, { shieldHits: 0, shieldT: 0, poisonArmed: 0, poisonT: 0, frozenT: 0, flash: 0, combo: 0, riding: false, pose: { ...IDLE } });
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Floater {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  size: number;
}
interface Dart {
  x: number;
  y: number;
  vx: number;
  owner: Fighter;
  life: number;
}

type AiCfg = { react: number; aggr: number; parry: number; every: number };
/** Adaptive AI: skill 0 is a gentle sparring partner, 100 a ruthless swordmaster. */
const aiConfig = (skill: number): AiCfg => {
  const s = Math.max(0, Math.min(100, skill)) / 100;
  return { react: Math.round(30 - 24 * s), aggr: 0.3 + 0.6 * s, parry: 0.04 + 0.62 * s, every: Math.round(34 - 26 * s) };
};

class AI {
  cfg: AiCfg;
  hold = { dir: 0, until: 0, parryUntil: 0 };
  next = 0;
  reactAt = -1;
  seenAtk = -1;
  constructor(skill: number) {
    this.cfg = aiConfig(skill);
  }
  think(me: Fighter, opp: Fighter, frame: number): Input {
    const inp = emptyInput();
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const toward = Math.sign(dx);
    // reaction to incoming attack
    if (opp.state === "attack" && opp.st === 1 && this.seenAtk !== frame) {
      this.seenAtk = frame;
      this.reactAt = frame + this.cfg.react;
    }
    if (this.reactAt === frame && opp.state === "attack" && opp.atk && dist < ATTACKS[opp.atk].range + 60) {
      if (opp.atk === "sweep" && Math.random() < this.cfg.parry) inp.pressed.push("jump");
      else if (opp.atk !== "grab" && Math.random() < this.cfg.parry) this.hold.parryUntil = frame + 22;
    }
    if (frame < this.hold.parryUntil) {
      inp.parry = true;
      return inp;
    }
    if (frame < this.hold.until) {
      if (this.hold.dir < 0) inp.left = true;
      if (this.hold.dir > 0) inp.right = true;
    }
    if (frame < this.next) return inp;
    this.next = frame + this.cfg.every + Math.floor(Math.random() * 8);
    const r = Math.random();
    const kind = me.def.ability.kind;
    if (me.meter >= 100 && dist < 170) return { ...inp, pressed: ["super"] };
    if (me.abilityCd === 0 && r < 0.18 + this.cfg.aggr * 0.1) {
      const good =
        (kind === "heal" && me.hp < me.maxHp * 0.65) ||
        (kind === "dart" && dist > 220) ||
        (kind === "dash" && dist < 300 && dist > 90) ||
        (kind === "voice" && dist < 260) ||
        kind === "shield" ||
        (kind === "poison" && dist < 220);
      if (good) return { ...inp, pressed: ["ability"] };
    }
    if (opp.state === "parry" && dist < 90 && Math.random() < this.cfg.aggr) return { ...inp, pressed: ["grab"] };
    if (dist > 120) {
      this.hold = { ...this.hold, dir: toward, until: frame + 20 + Math.floor(Math.random() * 20) };
      if (Math.random() < 0.05) inp.pressed.push("jump");
      return inp;
    }
    if (Math.random() < this.cfg.aggr) {
      const w = Math.random();
      const m: Move = w < 0.42 ? "light" : w < 0.68 ? "heavy" : w < 0.86 ? "sweep" : "grab";
      return { ...inp, pressed: [m] };
    }
    const alt = Math.random();
    if (alt < 0.45) this.hold = { ...this.hold, dir: -toward, until: frame + 15 };
    else if (alt < 0.8) this.hold.parryUntil = frame + 18;
    else if (me.hp > opp.hp * 1.3 && alt > 0.95) inp.pressed.push("taunt");
    return inp;
  }
}

export interface HudSide {
  name: string;
  hp: number;
  maxHp: number;
  meter: number;
  abilityCd: number;
  combo: number;
  shield: number;
  poisoned: boolean;
  level: number;
}
export interface HudSnapshot {
  p1: HudSide;
  p2: HudSide;
  timer: number;
  round: number;
  p1Rounds: number;
  p2Rounds: number;
  roundsToWin: number;
  paused: boolean;
  training?: boolean;
  trainingDamage?: number;
  worm: "none" | "warn" | "strike" | "ride";
}
export interface MatchResult {
  won: boolean;
  p1Rounds: number;
  p2Rounds: number;
  hpPct: number;
  maxCombo: number;
  perfectParries: number;
}

const ABILITY_CD = 360;
const TRAIN_X = 480;
const ROUND_TIME = 60;

export class Game {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private bg: HTMLCanvasElement;
  p1: Fighter;
  p2: Fighter;
  private ai: AI;
  private input: Input = emptyInput();
  private held = { left: false, right: false, parry: false };
  private frame = 0;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private phase: "intro" | "ready" | "fight" | "roundEnd" | "done" = "intro";
  private phaseT = 0;
  private timer = ROUND_TIME;
  private round = 1;
  private p1Rounds = 0;
  private p2Rounds = 0;
  private roundsToWin: number;
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private darts: Dart[] = [];
  private shake = 0;
  private superFlash = 0;
  private banner: { text: string; sub?: string; color: string } | null = null;
  paused = false;
  private onHud: (s: HudSnapshot) => void;
  private onEnd: (r: MatchResult) => void;
  private ended = false;
  private training: boolean;
  private trainingDamage = 0;
  private wormOn: boolean;
  private wormPhase: "none" | "warn" | "strike" | "ride" = "none";
  private rider: Fighter | null = null;
  private trampleCd = 0;
  private wormDir = 1;
  private wormX = 0;
  private wormHalf = 150;
  private wormT = 0;
  private wormTimer: number;
  private wormHit = new Set<Fighter>();
  private cloakColor?: string;
  private bladeColor?: string;

  constructor(
    canvas: HTMLCanvasElement,
    p1: FighterDef,
    p2: FighterDef,
    opts: {
      mode: MatchMode;
      /** Adaptive AI rating 0..100. */
      skill: number;
      p1Level?: number;
      p2Level?: number;
      training?: boolean;
      worm?: boolean;
      cloakColor?: string;
      bladeColor?: string;
      onHud: (s: HudSnapshot) => void;
      onEnd: (r: MatchResult) => void;
    },
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.bg = renderBackdrop();
    this.p1 = new Fighter(p1, 380, 1, opts.p1Level ?? 1);
    this.p2 = new Fighter(p2, opts.training ? TRAIN_X : 900, -1, opts.training ? 1 : opts.p2Level ?? 1);
    this.ai = new AI(opts.skill);
    this.roundsToWin = opts.mode === "bo3" ? 2 : 1;
    this.training = !!opts.training;
    this.wormOn = opts.worm ?? !opts.training;
    this.wormTimer = 480 + Math.floor(Math.random() * 300);
    this.cloakColor = opts.cloakColor;
    this.bladeColor = opts.bladeColor;
    this.onHud = opts.onHud;
    this.onEnd = opts.onEnd;
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.acc += Math.min(100, now - this.last);
      this.last = now;
      while (this.acc >= 1000 / 60) {
        this.acc -= 1000 / 60;
        if (!this.paused) this.step();
      }
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  setHeld(k: "left" | "right" | "parry", v: boolean) {
    this.held[k] = v;
  }
  press(c: Command) {
    if (!this.paused) this.input.pressed.push(c);
  }
  togglePause() {
    if (this.phase === "done") return;
    this.paused = !this.paused;
    this.emitHud();
  }

  private emitHud() {
    const side = (f: Fighter): HudSide => ({
      name: f.def.short,
      hp: Math.max(0, f.hp),
      maxHp: f.maxHp,
      level: f.level,
      meter: f.meter,
      abilityCd: f.abilityCd / ABILITY_CD,
      combo: f.comboT > 0 ? f.combo : 0,
      shield: f.shieldHits,
      poisoned: f.poisonT > 0,
    });
    this.onHud({
      p1: side(this.p1),
      p2: side(this.p2),
      timer: this.timer,
      round: this.round,
      p1Rounds: this.p1Rounds,
      p2Rounds: this.p2Rounds,
      roundsToWin: this.roundsToWin,
      paused: this.paused,
      training: this.training,
      trainingDamage: this.training ? Math.round(this.trainingDamage) : undefined,
      worm: this.wormPhase,
    });
  }

  // ───────────────────────── simulation ─────────────────────────
  private step() {
    this.frame++;
    this.phaseT++;
    const live = this.phase === "fight";
    const pin: Input = live && !this.p1.riding ? { ...this.held, pressed: this.input.pressed } : emptyInput();
    this.input.pressed = [];
    const ain = live && !this.training && !this.p2.riding ? this.ai.think(this.p2, this.p1, this.frame) : emptyInput();

    if (this.phase === "intro" && this.phaseT > 130) this.toReady();
    if (this.phase === "ready") {
      if (this.phaseT === 1) this.banner = { text: `ROUND ${this.round}`, color: "#F5EBE1" };
      if (this.phaseT === 60) {
        this.banner = { text: "FIGHT!", color: "#E8892C" };
        sfx.round();
      }
      if (this.phaseT > 85) {
        this.banner = null;
        this.phase = "fight";
        this.phaseT = 0;
      }
    }
    const slow = this.phase === "roundEnd" && this.phaseT < 70 && this.phaseT % 3 !== 0;
    if (!slow) {
      this.updateFighter(this.p1, pin, this.p2);
      this.updateFighter(this.p2, ain, this.p1);
      this.separate();
      this.updateDarts();
    }
    if (live) {
      if (this.training) {
        this.p2.hp = this.p2.maxHp;
        this.p2.x = TRAIN_X; // stationary dummy
        this.p2.vx = 0;
      } else {
        if (this.frame % 60 === 0) this.timer = Math.max(0, this.timer - 1);
        if (this.p1.hp <= 0 || this.p2.hp <= 0 || this.timer === 0) this.endRound();
      }
      if (this.wormOn) this.updateWorm();
    }
    if (this.phase === "roundEnd" && this.phaseT > 170) this.afterRound();

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 0.8;
      f.life--;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.shake *= 0.86;
    this.superFlash = Math.max(0, this.superFlash - 0.03);
    if (this.frame % 6 === 0) this.emitHud();
  }

  private toReady() {
    this.phase = "ready";
    this.phaseT = 0;
  }

  private endRound() {
    const p1Won = this.p1.hp > 0 && (this.p2.hp <= 0 || this.p1.hp / this.p1.maxHp >= this.p2.hp / this.p2.maxHp);
    this.phase = "roundEnd";
    this.phaseT = 0;
    if (p1Won) this.p1Rounds++;
    else this.p2Rounds++;
    const ko = this.p1.hp <= 0 || this.p2.hp <= 0;
    const loser = p1Won ? this.p2 : this.p1;
    const winner = p1Won ? this.p1 : this.p2;
    if (ko) {
      loser.set("ko");
      loser.vy = -7;
      loser.vx = -loser.facing * 6;
      sfx.ko();
      this.shake = 18;
    }
    winner.set("win");
    this.banner = { text: ko ? "K.O." : "TIME", sub: `${winner.def.short} wins the round`, color: ko ? "#EF4444" : "#F5EBE1" };
    this.emitHud();
  }

  private afterRound() {
    if (this.p1Rounds >= this.roundsToWin || this.p2Rounds >= this.roundsToWin) {
      if (this.ended) return;
      this.ended = true;
      this.phase = "done";
      this.banner = null;
      this.onEnd({
        won: this.p1Rounds > this.p2Rounds,
        p1Rounds: this.p1Rounds,
        p2Rounds: this.p2Rounds,
        hpPct: Math.max(0, this.p1.hp) / this.p1.maxHp,
        maxCombo: this.p1.maxCombo,
        perfectParries: this.p1.perfectParries,
      });
      return;
    }
    this.round++;
    this.timer = ROUND_TIME;
    this.p1.reset(380, 1);
    this.p2.reset(900, -1);
    this.p1.meter = Math.min(100, this.p1.meter);
    this.darts = [];
    this.wormPhase = "none";
    this.wormTimer = 480 + Math.floor(Math.random() * 300);
    this.wormHit.clear();
    this.rider = null;
    this.toReady();
  }

  private updateWorm() {
    if (this.phase !== "fight") {
      if (this.wormPhase === "ride") this.endRide();
      return;
    }
    if (this.wormPhase === "none") {
      if (--this.wormTimer <= 0) {
        this.wormPhase = "warn";
        this.wormT = 95;
        this.wormHalf = 150;
        this.wormX = 240 + Math.random() * (VW - 480);
        this.wormHit.clear();
        this.floater("SANDWORM!", this.wormX, 160, "#E8892C", 26);
      }
    } else if (this.wormPhase === "warn") {
      this.shake = Math.max(this.shake, 3 + (95 - this.wormT) * 0.06);
      if (this.frame % 2 === 0) {
        this.particles.push({
          x: this.wormX + (Math.random() - 0.5) * this.wormHalf * 2,
          y: GROUND,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 4,
          life: 30,
          max: 30,
          color: Math.random() < 0.5 ? "#C8743F" : "#E3B07A",
          size: 2 + Math.random() * 3,
        });
      }
      if (--this.wormT <= 0) {
        this.wormPhase = "strike";
        this.wormT = 48;
        this.shake = 22;
        sfx.worm();
        // eruption sand geyser
        for (let i = 0; i < 46; i++) {
          this.particles.push({
            x: this.wormX + (Math.random() - 0.5) * 140,
            y: GROUND,
            vx: (Math.random() - 0.5) * 9,
            vy: -6 - Math.random() * 11,
            life: 50,
            max: 50,
            color: Math.random() < 0.6 ? "#C8743F" : "#F0C890",
            size: 2 + Math.random() * 4,
          });
        }
      }
    } else if (this.wormPhase === "strike") {
      for (const f of [this.p1, this.p2]) {
        if (this.wormHit.has(f) || f.state === "ko" || Math.abs(f.x - this.wormX) >= this.wormHalf) continue;
        if (f.airborne) {
          // Perfect dodge: airborne inside the zone during the first frames of the eruption.
          if (this.wormT > 36 && !this.rider) {
            this.startRide(f);
            return;
          }
        } else {
          this.wormHit.add(f);
          this.wormBite(f, 24, (Math.random() - 0.5) * 6);
        }
      }
      if (--this.wormT <= 0) {
        this.wormPhase = "none";
        this.wormTimer = 540 + Math.floor(Math.random() * 360);
      }
    } else {
      this.updateRide();
    }
  }

  private startRide(f: Fighter) {
    const opp = f === this.p1 ? this.p2 : this.p1;
    this.rider = f;
    f.riding = true;
    f.set("idle");
    f.atk = null;
    f.stun = 0;
    f.frozenT = 0;
    f.meter = Math.min(100, f.meter + 25);
    this.wormPhase = "ride";
    this.wormT = 180; // ~3 seconds
    this.trampleCd = 20;
    this.wormDir = Math.sign(opp.x - this.wormX) || 1;
    this.shake = 14;
    this.floater("WORM RIDER!", this.wormX, 130, "#FFC15E", 32);
    sfx.super();
  }

  private updateRide() {
    const f = this.rider;
    if (!f) {
      this.endRide();
      return;
    }
    const opp = f === this.p1 ? this.p2 : this.p1;
    // Charge at the opponent; turn around once well past them or at the arena edge.
    if ((opp.x - this.wormX) * this.wormDir < -140) this.wormDir *= -1;
    this.wormX += this.wormDir * 7.5;
    if (this.wormX < 110 || this.wormX > VW - 110) {
      this.wormX = Math.max(110, Math.min(VW - 110, this.wormX));
      this.wormDir *= -1;
    }
    f.x = this.wormX - this.wormDir * 34;
    f.y = GROUND - 172;
    f.vx = 0;
    f.vy = 0;
    f.facing = this.wormDir;
    if (f.state !== "idle") f.set("idle");

    if (this.trampleCd > 0) this.trampleCd--;
    else if (Math.abs(opp.x - this.wormX) < 115 && !opp.airborne && opp.state !== "ko" && opp.state !== "down") {
      this.wormBite(opp, 16, this.wormDir * 9);
      this.floater("TRAMPLED!", opp.x, opp.y - 300, "#FFC15E", 22);
      f.meter = Math.min(100, f.meter + 10);
      this.trampleCd = 50;
    }
    if (this.frame % 2 === 0) {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: this.wormX - this.wormDir * (150 + Math.random() * 60),
          y: GROUND,
          vx: -this.wormDir * (2 + Math.random() * 3),
          vy: -3 - Math.random() * 5,
          life: 34,
          max: 34,
          color: Math.random() < 0.5 ? "#C8743F" : "#E3B07A",
          size: 2 + Math.random() * 3,
        });
      }
    }
    this.shake = Math.max(this.shake, 2.5);
    if (--this.wormT <= 0) this.endRide();
  }

  private endRide() {
    const f = this.rider;
    if (f) {
      f.riding = false;
      f.vy = -6;
      f.vx = this.wormDir * 2;
    }
    this.rider = null;
    this.wormPhase = "none";
    this.wormTimer = 600 + Math.floor(Math.random() * 360);
    this.burst(this.wormX, GROUND - 20, "#C8743F", 34, 6);
  }

  private wormBite(f: Fighter, dmg: number, pushVx: number) {
    if (f.shieldHits > 0) {
      f.shieldHits = 0;
      f.shieldT = 0;
    }
    f.hp -= dmg;
    f.flash = 1;
    f.frozenT = 0;
    f.stun = 42;
    f.set("down");
    f.vy = -13;
    f.vx = pushVx;
    this.shake = Math.max(this.shake, 16);
    this.burst(f.x, GROUND - 40, "#C8743F", 30, 6);
    this.floater(`-${dmg}`, f.x, f.y - 260, "#EF4444", 24);
  }

  private canAct(f: Fighter) {
    return f.state === "idle" || f.state === "walk" || f.state === "parry";
  }

  private startAttack(f: Fighter, m: Move) {
    if (f.airborne && (m === "sweep" || m === "grab" || m === "super")) return;
    f.set("attack");
    f.atk = m;
    f.atkHit = false;
    if (m === "super") {
      f.meter = 0;
      this.superFlash = 1;
      this.shake = 10;
      sfx.super();
      this.floater(f.def.superName.toUpperCase(), f.x, f.y - 280, "#2CD4F5", 34);
      this.burst(f.x, f.y - 120, "#2CD4F5", 40, 7);
    } else sfx.whoosh();
  }

  private useAbility(f: Fighter, opp: Fighter) {
    f.set("ability");
    f.abilityCd = ABILITY_CD;
    sfx.ability();
    const k = f.def.ability.kind;
    this.floater(f.def.ability.name.toUpperCase(), f.x, f.y - 260, f.def.palette.accent, 22);
    if (k === "dash") {
      this.startAttack(f, "dash");
      return;
    }
    if (k === "voice") {
      if (Math.abs(opp.x - f.x) < 520 && opp.state !== "down" && opp.state !== "ko") {
        opp.frozenT = 60;
        opp.set("frozen");
        this.burst(opp.x, opp.y - 140, "#C084FC", 18, 4);
      }
    } else if (k === "shield") {
      f.shieldHits = 3;
      f.shieldT = 240;
    } else if (k === "poison") {
      f.poisonArmed = 300;
    } else if (k === "heal") {
      f.hp = Math.min(f.maxHp, f.hp + 15);
      this.burst(f.x, f.y - 120, "#4ADE80", 20, 4);
      this.floater("+15", f.x, f.y - 230, "#4ADE80", 26);
    } else if (k === "dart") {
      this.darts.push({ x: f.x + f.facing * 40, y: f.y - 150, vx: f.facing * 11, owner: f, life: 140 });
    }
  }

  private updateFighter(f: Fighter, inp: Input, opp: Fighter) {
    f.st++;
    if (f.abilityCd > 0) f.abilityCd--;
    if (f.shieldT > 0 && --f.shieldT === 0) f.shieldHits = 0;
    if (f.poisonArmed > 0) f.poisonArmed--;
    if (f.flash > 0) f.flash -= 0.1;
    if (f.comboT > 0) f.comboT--;
    if (f.poisonT > 0) {
      f.poisonT--;
      if (f.poisonT % 30 === 0 && f.hp > 1 && this.phase === "fight") f.hp -= 1.5;
    }

    const grounded = !f.airborne;
    if (grounded && (f.state === "idle" || f.state === "walk" || f.state === "parry")) f.facing = opp.x > f.x ? 1 : -1;

    switch (f.state) {
      case "frozen":
        f.vx *= 0.8;
        if (--f.frozenT <= 0) f.set("idle");
        break;
      case "attack": {
        const a = ATTACKS[f.atk!];
        if (a.lunge && f.st >= a.startup && f.st < a.startup + a.active) f.vx = f.facing * a.lunge;
        else if (grounded) f.vx *= 0.7;
        if (f.st >= a.startup && f.st < a.startup + a.active && !f.atkHit) this.tryHit(f, opp, a, f.atk!);
        if (f.st >= a.startup + a.active + a.recovery) {
          f.set("idle");
          f.atk = null;
        }
        break;
      }
      case "hitstun":
        if (grounded) f.vx *= 0.82;
        if (f.st >= f.stun) f.set("idle");
        break;
      case "down":
        if (grounded) f.vx *= 0.85;
        if (f.st >= 70) f.set("idle");
        break;
      case "taunt":
        f.vx = 0;
        if (f.st >= 45) {
          f.meter = Math.min(100, f.meter + 15);
          f.set("idle");
        }
        break;
      case "ability":
        f.vx *= 0.7;
        if (f.st >= 20) f.set("idle");
        break;
      case "ko":
      case "win":
        if (grounded) f.vx *= 0.85;
        break;
      default: {
        // idle / walk / parry
        const cmd = inp.pressed;
        const has = (c: Command) => cmd.includes(c);
        if (has("super") && f.meter >= 100) this.startAttack(f, "super");
        else if (has("ability") && f.abilityCd === 0) this.useAbility(f, opp);
        else if (has("grab")) this.startAttack(f, "grab");
        else if (has("sweep")) this.startAttack(f, "sweep");
        else if (has("heavy")) this.startAttack(f, "heavy");
        else if (has("light")) this.startAttack(f, "light");
        else if (has("taunt") && grounded) f.set("taunt");
        else {
          if (has("jump") && grounded) {
            f.vy = -15.5;
            f.y -= 1;
          }
          if (inp.parry && grounded) {
            if (f.state !== "parry") {
              f.set("parry");
              f.parryStart = this.frame;
            }
            f.vx *= 0.6;
          } else {
            const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
            const spd = 3 + f.def.speed * 0.38;
            if (dir !== 0) {
              f.vx = dir * spd * (dir === f.facing ? 1 : 0.75);
              if (f.state !== "walk") f.set("walk");
              f.walkPhase += 0.22 * (dir * f.facing);
            } else {
              if (grounded) f.vx *= 0.6;
              if (f.state !== "idle") f.set("idle");
            }
          }
        }
      }
    }

    // physics
    f.x += f.vx;
    if (f.airborne || f.vy < 0) {
      f.vy += 0.8;
      f.y += f.vy;
      if (f.y >= GROUND) {
        f.y = GROUND;
        f.vy = 0;
        if (f.state === "ko") this.burst(f.x, GROUND, "#C8743F", 16, 3);
      }
    }
    f.x = Math.max(70, Math.min(VW - 70, f.x));
    this.updatePose(f);
  }

  private separate() {
    const a = this.p1;
    const b = this.p2;
    const dx = b.x - a.x;
    const min = 64;
    if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 110) {
      const push = (min - Math.abs(dx)) / 2;
      const s = Math.sign(dx) || 1;
      a.x -= s * push;
      b.x += s * push;
      a.x = Math.max(70, Math.min(VW - 70, a.x));
      b.x = Math.max(70, Math.min(VW - 70, b.x));
    }
  }

  private tryHit(att: Fighter, def: Fighter, a: AttackSpec, m: Move) {
    const dx = (def.x - att.x) * att.facing;
    if (dx < -10 || dx > a.range) return;
    if (Math.abs(def.y - att.y) > 120) return;
    if (a.low && def.airborne) return;
    if (m === "grab" && def.airborne) return;
    if (def.state === "down" || def.state === "ko") return;
    att.atkHit = true;
    this.resolveHit(att, def, a, m);
  }

  private resolveHit(att: Fighter, def: Fighter, a: AttackSpec, m: Move | "dart") {
    const hx = def.x - def.facing * 10;
    const hy = def.y - (a.low ? 40 : 150);
    if (def.state === "parry" && !a.unblockable && !a.pierce) {
      if (this.frame - def.parryStart <= 12) {
        if (m !== "dart") {
          att.set("hitstun");
          att.stun = 30;
          att.vx = -att.facing * 5;
        }
        def.meter = Math.min(100, def.meter + 20);
        def.perfectParries++;
        sfx.parry();
        this.burst(hx, hy, "#2CD4F5", 26, 6);
        this.floater("PERFECT PARRY", def.x, def.y - 260, "#2CD4F5", 26);
        return;
      }
      def.hp -= a.dmg * 0.12;
      def.vx = att.facing * a.push * 0.6;
      def.meter = Math.min(100, def.meter + 4);
      sfx.block();
      this.burst(hx, hy, "#F5EBE1", 8, 3);
      return;
    }
    if (def.shieldHits > 0 && !a.pierce) {
      def.shieldHits--;
      if (def.shieldHits === 0) def.shieldT = 0;
      def.vx = att.facing * 3;
      sfx.block();
      this.burst(hx, hy, "#60A5FA", 14, 4);
      return;
    }
    let dmg = a.dmg * (0.7 + att.def.power * 0.06) * (1.2 - def.def.defense * 0.04) * att.dmgMult;
    if (def.state === "frozen") dmg *= 1.15;
    if (att.poisonArmed > 0 && m !== "dart") {
      def.poisonT = 300;
      att.poisonArmed = 0;
      this.floater("POISONED", def.x, def.y - 250, "#84CC16", 22);
    }
    const wasStunned = def.state === "hitstun" || def.state === "frozen";
    def.hp -= dmg;
    if (this.training && def === this.p2) this.trainingDamage += dmg;
    def.flash = 1;
    def.frozenT = 0;
    def.stun = a.stun;
    def.set(a.knockdown ? "down" : "hitstun");
    def.vx = att.facing * a.push;
    if (a.knockdown) def.vy = -6;
    att.combo = wasStunned && att.comboT > 0 ? att.combo + 1 : 1;
    att.comboT = 70;
    att.maxCombo = Math.max(att.maxCombo, att.combo);
    if (att.combo >= 2) this.floater(`${att.combo} HIT COMBO`, att.x, att.y - 300, "#E8892C", 22);
    att.meter = Math.min(100, att.meter + a.meter);
    def.meter = Math.min(100, def.meter + a.meter / 2);
    const heavy = m === "heavy" || m === "super" || m === "grab";
    if (m === "grab") sfx.grab();
    else if (heavy) sfx.heavy();
    else sfx.light();
    this.shake = Math.max(this.shake, heavy ? 12 : 4);
    this.burst(hx, hy, heavy ? "#FFB347" : "#FFF4E8", heavy ? 22 : 10, heavy ? 7 : 4);
    if (m === "super" || m === "heavy") this.burst(hx, hy, "#2CD4F5", 12, 5);
  }

  private updateDarts() {
    for (const d of this.darts) {
      const target = d.owner === this.p1 ? this.p2 : this.p1;
      d.x += d.vx;
      d.y += Math.sign(target.y - 140 - d.y) * 1.5;
      d.life--;
      if (Math.abs(d.x - target.x) < 34 && Math.abs(d.y - (target.y - 140)) < 110 && target.state !== "down" && target.state !== "ko" && !target.riding) {
        d.life = 0;
        this.resolveHit(d.owner, target, { startup: 0, active: 0, recovery: 0, dmg: 8, range: 0, stun: 16, push: 4, meter: 8 }, "dart");
      }
      if (this.frame % 2 === 0) this.particles.push({ x: d.x, y: d.y, vx: 0, vy: 0, life: 12, max: 12, color: "#A3E635", size: 3 });
    }
    this.darts = this.darts.filter((d) => d.life > 0 && d.x > 0 && d.x < VW);
  }

  private burst(x: number, y: number, color: string, n: number, spd: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 24 + Math.random() * 18, max: 40, color, size: 2 + Math.random() * 3 });
    }
  }
  private floater(text: string, x: number, y: number, color: string, size: number) {
    this.floaters.push({ text, x: Math.max(160, Math.min(VW - 160, x)), y, life: 70, color, size });
  }

  private updatePose(f: Fighter) {
    if (f.state === "frozen") return;
    let target: Pose;
    let k = 0.35;
    const t = this.frame / 60;
    switch (f.state) {
      case "walk": {
        const s = Math.sin(f.walkPhase);
        target = { ...IDLE, frontLeg: 0.22 + s * 0.5, backLeg: -0.22 - s * 0.5, frontKnee: 0.3 + Math.max(0, -s) * 0.6, backKnee: 0.3 + Math.max(0, s) * 0.6, lean: 0.12, flutter: 1 };
        break;
      }
      case "attack": {
        const a = ATTACKS[f.atk!];
        const m = f.atk!;
        const wind = P("wind" + m[0].toUpperCase() + m.slice(1));
        const strike = P(m);
        if (f.st < a.startup) target = wind;
        else if (f.st < a.startup + a.active) {
          target = strike;
          k = 0.65;
        } else target = blend(strike, IDLE, (f.st - a.startup - a.active) / a.recovery);
        break;
      }
      case "parry":
        target = P("parry");
        k = 0.6;
        break;
      case "hitstun":
        target = P("hit");
        k = 0.6;
        break;
      case "down":
        target = f.st < 50 ? { ...P("hit"), down: 1 } : { ...IDLE, crouch: 0.4 };
        break;
      case "ko":
        target = { ...P("hit"), down: 1 };
        k = 0.15;
        break;
      case "win":
      case "taunt":
        target = { ...P("taunt"), frontArm: 2.7 + Math.sin(t * 8) * 0.2 };
        break;
      case "ability":
        target = P("ability");
        break;
      default:
        target = { ...IDLE, crouch: IDLE.crouch + Math.sin(t * 3 + f.x) * 0.03, frontArm: IDLE.frontArm + Math.sin(t * 2) * 0.05 };
    }
    if (f.airborne && f.state !== "attack" && f.state !== "ko" && f.state !== "hitstun") target = P("jump");
    f.pose = blend(f.pose, target, k);
  }

  // ───────────────────────── rendering ─────────────────────────
  private render() {
    const c = this.canvas;
    const ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const s = Math.min(c.width / VW, c.height / VH);
    const ox = (c.width - VW * s) / 2;
    const oy = (c.height - VH * s) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0E0A08";
    ctx.fillRect(0, 0, c.width, c.height);
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.setTransform(s, 0, 0, s, ox + sx * s, oy + sy * s);
    ctx.drawImage(this.bg, 0, 0);

    const t = this.frame / 60;
    // drifting sand
    ctx.fillStyle = "rgba(255,220,170,0.18)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + t * (60 + (i % 5) * 20)) % (VW + 40) - 20;
      const y = 300 + ((i * 53) % 320) + Math.sin(t + i) * 6;
      ctx.fillRect(x, y, 3, 1.5);
    }

    if (this.superFlash > 0) {
      ctx.fillStyle = `rgba(5,10,20,${this.superFlash * 0.55})`;
      ctx.fillRect(0, 0, VW, VH);
    }

    const order = this.p1.state === "attack" ? [this.p2, this.p1] : [this.p1, this.p2];
    if (this.wormOn && this.wormPhase === "ride") {
      drawSandworm(ctx, this.wormX, this.wormHalf, "ride", 1 - this.wormT / 180, this.frame, this.wormDir);
    }
    for (const f of order) {
      const skin = f === this.p1 ? { cloakColor: this.cloakColor, bladeColor: this.bladeColor } : {};
      drawFighter(ctx, f.def, f.pose, f.x, f.y, f.facing, 1.05, {
        flash: f.flash,
        shield: f.shieldHits > 0,
        poisoned: f.poisonT > 0,
        frozen: f.state === "frozen",
        t,
        ...skin,
      });
    }
    if (this.wormOn && (this.wormPhase === "warn" || this.wormPhase === "strike")) {
      const progress = this.wormPhase === "warn" ? 1 - this.wormT / 95 : 1 - this.wormT / 48;
      drawSandworm(ctx, this.wormX, this.wormHalf, this.wormPhase, progress, this.frame);
    }
    for (const d of this.darts) {
      ctx.fillStyle = "#A3E635";
      ctx.shadowColor = "#A3E635";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life / 25);
      ctx.font = `800 ${f.size}px 'Space Grotesk Variable', sans-serif`;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(f.text, f.x + 2, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (this.phase === "intro") this.drawIntro(ctx);
    if (this.banner) {
      const age = this.phaseT;
      const sc = 1 + Math.max(0, 1 - age / 12) * 0.6;
      ctx.save();
      ctx.translate(VW / 2, VH * 0.36);
      ctx.scale(sc, sc);
      ctx.font = "900 110px 'Space Grotesk Variable', sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillText(this.banner.text, 4, 6);
      ctx.fillStyle = this.banner.color;
      ctx.fillText(this.banner.text, 0, 0);
      if (this.banner.sub) {
        ctx.font = "600 26px 'DM Sans Variable', sans-serif";
        ctx.fillStyle = "#F5EBE1";
        ctx.fillText(this.banner.sub.toUpperCase(), 0, 50);
      }
      ctx.restore();
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(8,5,4,0.6)";
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  private drawIntro(ctx: CanvasRenderingContext2D) {
    const k = Math.min(1, this.phaseT / 25);
    ctx.fillStyle = `rgba(8,5,4,${0.55 * (this.phaseT > 110 ? (130 - this.phaseT) / 20 : 1)})`;
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = "center";
    ctx.font = "700 18px 'JetBrains Mono Variable', monospace";
    ctx.fillStyle = "#E8892C";
    ctx.fillText("ARRAKIS FIGHTING CHAMPIONSHIP", VW / 2, 150);
    ctx.font = "900 64px 'Space Grotesk Variable', sans-serif";
    ctx.fillStyle = "#F5EBE1";
    ctx.textAlign = "right";
    ctx.fillText(this.p1.def.name.toUpperCase(), VW / 2 - 90 - (1 - k) * 300, VH / 2);
    ctx.textAlign = "left";
    ctx.fillText(this.p2.def.name.toUpperCase(), VW / 2 + 90 + (1 - k) * 300, VH / 2);
    ctx.textAlign = "center";
    ctx.font = "900 italic 96px 'Space Grotesk Variable', sans-serif";
    ctx.fillStyle = "#E8892C";
    ctx.fillText("VS", VW / 2, VH / 2 + 14);
    ctx.font = "600 20px 'DM Sans Variable', sans-serif";
    ctx.fillStyle = "#B59E8C";
    ctx.fillText(`${this.p1.def.title.toUpperCase()}  ·  ${this.p2.def.title.toUpperCase()}`, VW / 2, VH / 2 + 70);
  }
}
