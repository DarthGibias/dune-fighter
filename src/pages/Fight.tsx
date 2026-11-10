import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Pause, Play, RotateCcw, Shield, Skull, Sparkles, Target, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Game, type Command, type HudSide, type HudSnapshot, type MatchResult } from "@/game/engine";
import MatchResultModal from "@/components/game/MatchResultModal";
import TowerResultModal from "@/components/game/TowerResultModal";
import { syncProgress } from "@/components/auth/ClerkAuthProvider";
import { useAuthState } from "../lib/auth";
import { UNLOCKABLE, fighterById, levelFromXp } from "@/lib/fighters";
import { TOWER_LENGTH, dummyFighter, towerOpponent } from "@/lib/tower";
import { resolveSkin } from "../lib/cosmetics";
import { applyMatch, getEquipped, getProgress, getSettings, opponentLevel, recordTowerWin, useProgress, type RewardSummary } from "../lib/progress";
import { cn } from "../lib/utils";

type FightMode = "normal" | "tower" | "training";
interface FightNavState {
  mode?: FightMode;
  opponent?: string;
  towerRung?: number;
}

const KEYMAP: Record<string, Command> = {
  KeyJ: "light",
  KeyI: "heavy",
  KeyM: "sweep",
  KeyL: "grab",
  KeyE: "ability",
  KeyQ: "super",
  KeyT: "taunt",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
};
const HELD: Record<string, "left" | "right" | "parry"> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyK: "parry",
};

function HealthBar({ side, align, testId }: { side: HudSide; align: "left" | "right"; testId: string }) {
  const pct = Math.max(0, (side.hp / side.maxHp) * 100);
  return (
    <div className={cn("flex-1", align === "right" && "text-right")}>
      <div className={cn("relative h-5 overflow-hidden rounded-md border border-edge bg-[#2A0E0A]", align === "right" && "[transform:scaleX(-1)]")}>
        <div className="absolute inset-y-0 left-0 bg-[#7F1D1D] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        <div
          data-testid={testId}
          data-hp={Math.round(side.hp)}
          className={cn("absolute inset-y-0 left-0 transition-[width] duration-150", align === "left" ? "bg-gradient-to-r from-[#E8892C] to-[#FFC15E]" : "bg-gradient-to-r from-[#D946EF] to-[#F0ABFC]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={cn("mt-1.5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-sand", align === "right" && "flex-row-reverse")}>
        <span>{side.name}</span>
        <span data-testid={`${testId}-level`} className="rounded border border-edge px-1 text-[10px] text-ember">LV {side.level}</span>
        <span className="text-dust">{Math.ceil(side.hp)}</span>
        {side.shield > 0 && (
          <span className="flex items-center gap-0.5 text-[#60A5FA]">
            <Shield className="h-3 w-3" />×{side.shield}
          </span>
        )}
        {side.poisoned && <Skull className="h-3.5 w-3.5 text-[#84CC16]" />}
        {side.combo >= 2 && <span className="text-ember">{side.combo} hits</span>}
      </div>
    </div>
  );
}

function Pips({ won, need, align }: { won: number; need: number; align: "left" | "right" }) {
  if (need < 2) return null;
  return (
    <div className={cn("flex gap-1", align === "right" && "flex-row-reverse")}>
      {Array.from({ length: need }).map((_, i) => (
        <span key={i} className={cn("h-2.5 w-2.5 rotate-45 border border-ember", i < won ? "bg-ember" : "bg-transparent")} />
      ))}
    </div>
  );
}

function PadButton({
  label,
  hint,
  onDown,
  onUp,
  className,
  testId,
  disabled,
}: {
  label: string;
  hint: string;
  onDown: () => void;
  onUp?: () => void;
  className?: string;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      className={cn(
        "flex select-none flex-col items-center justify-center rounded-xl border border-edge bg-panel px-3 py-2 transition-[transform,background-color,border-color] duration-100 active:scale-95 active:border-ember disabled:opacity-40",
        className,
      )}
    >
      <span className="text-[13px] font-bold uppercase tracking-widest text-sand">{label}</span>
      <kbd className="mt-0.5 font-mono text-[10px] text-ember">{hint}</kbd>
    </button>
  );
}

type Result =
  | { kind: "normal"; match: MatchResult; reward: RewardSummary }
  | { kind: "tower"; match: MatchResult; reward: RewardSummary; rung: number; completed: boolean; bonus: number };

export default function Fight() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const auth = useAuthState();
  const progress = useProgress();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [matchKey, setMatchKey] = useState(0);
  const settings = useMemo(() => getSettings(), []);
  const nav = (location.state as FightNavState | null) ?? {};
  const mode: FightMode = nav.mode ?? "normal";
  const [rung, setRung] = useState(nav.towerRung ?? 0);
  const me = fighterById(settings.selected);
  const skin = useMemo(() => resolveSkin(getEquipped(me.id)), [me.id]);

  const opponent = useMemo(() => {
    if (mode === "training") return dummyFighter();
    if (mode === "tower") return towerOpponent(rung);
    if (nav.opponent && nav.opponent !== me.id) return fighterById(nav.opponent);
    // Rare encounter: Supergirl occasionally shows up as the opponent.
    if (me.id !== "supergirl" && Math.random() < 0.04) return fighterById("supergirl");
    const pool = UNLOCKABLE.filter((f) => f.id !== me.id);
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rung, nav.opponent, me.id, matchKey]);

  // Snapshot the adaptive rating + levels when each match is set up.
  const setup = useMemo(() => {
    const p = getProgress();
    return { skill: p.skill, p1Level: levelFromXp(p.xp[me.id] ?? 0), p2Level: opponentLevel(p.skill) };
  }, [opponent, me.id]);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  const signedInRef = useRef(auth.signedIn);
  signedInRef.current = auth.signedIn;
  const nameRef = useRef(auth.name);
  nameRef.current = auth.name;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const rungRef = useRef(rung);
  rungRef.current = rung;

  const onEnd = useCallback(
    (match: MatchResult) => {
      const reward = applyMatch({
        won: match.won,
        fighterId: me.id,
        skill: setupRef.current.skill,
        hpPct: match.hpPct,
        maxCombo: match.maxCombo,
        perfectParries: match.perfectParries,
      });
      if (modeRef.current === "tower") {
        let completed = false;
        let bonus = 0;
        if (match.won) {
          const t = recordTowerWin(rungRef.current);
          completed = t.completed;
          bonus = t.bonus;
        }
        setResult({ kind: "tower", match, reward, rung: rungRef.current, completed, bonus });
      } else {
        setResult({ kind: "normal", match, reward });
      }
      if (signedInRef.current) {
        syncProgress(nameRef.current)
          .then(() => qc.invalidateQueries({ queryKey: ["leaderboard"] }))
          .catch(() => toast.error("Couldn't sync to the server — saved locally"));
      }
    },
    [me.id, qc],
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = new Game(c, me, opponent, {
      mode: mode === "normal" ? settings.mode : "single",
      skill: setup.skill,
      p1Level: setup.p1Level,
      p2Level: setup.p2Level,
      training: mode === "training",
      worm: mode !== "training",
      cloakColor: skin.cloakColor,
      bladeColor: skin.bladeColor,
      onHud: setHud,
      onEnd,
    });
    gameRef.current = g;
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = g;
    g.start();
    return () => {
      g.destroy();
      gameRef.current = null;
    };
  }, [me, opponent, settings, mode, skin, onEnd, setup]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        g.togglePause();
        return;
      }
      if (HELD[e.code]) {
        e.preventDefault();
        g.setHeld(HELD[e.code], true);
        return;
      }
      const cmd = KEYMAP[e.code];
      if (cmd) {
        e.preventDefault();
        if (!e.repeat) g.press(cmd);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (HELD[e.code]) gameRef.current?.setHeld(HELD[e.code], false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const restart = () => {
    setResult(null);
    setHud(null);
    setMatchKey((k) => k + 1);
  };
  const nextRung = () => {
    setRung((r) => r + 1);
    restart();
  };
  const retryTower = () => {
    setRung(0);
    restart();
  };

  const press = (c: Command) => gameRef.current?.press(c);
  const hold = (k: "left" | "right" | "parry", v: boolean) => gameRef.current?.setHeld(k, v);
  const p1 = hud?.p1;
  const meterFull = (p1?.meter ?? 0) >= 100;
  const abilityReady = (p1?.abilityCd ?? 0) === 0;
  const isTraining = mode === "training";

  const backTarget = isTraining ? "/" : mode === "tower" ? "/tower" : "/select";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-obsidian" data-testid="fight-page" data-mode={mode}>
      {/* HUD */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-3 lg:px-8">
        <div className="flex items-start gap-4">
          <button
            type="button"
            data-testid="fight-back-button"
            onClick={() => navigate(backTarget)}
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge bg-panel text-dust transition-colors duration-200 hover:text-sand"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {hud ? (
            <>
              <div className="flex flex-1 flex-col gap-1.5">
                <HealthBar side={hud.p1} align="left" testId="hud-p1-health" />
                {!isTraining && <Pips won={hud.p1Rounds} need={hud.roundsToWin} align="left" />}
              </div>
              <div className="flex flex-col items-center">
                {isTraining ? (
                  <>
                    <div data-testid="training-damage" className="grid h-12 min-w-[80px] place-items-center rounded-lg border border-ember/70 bg-panel px-2 font-mono text-2xl font-black text-[#FFC15E]">
                      {hud.trainingDamage ?? 0}
                    </div>
                    <span className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dust">
                      <Target className="h-3 w-3" /> Damage
                    </span>
                  </>
                ) : (
                  <>
                    <div data-testid="hud-timer" className="grid h-12 w-16 place-items-center rounded-lg border border-ember/70 bg-panel font-mono text-3xl font-black text-[#FFC15E]">
                      {hud.timer}
                    </div>
                    <span data-testid="hud-round" className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">
                      {mode === "tower" ? `Rung ${rung + 1}/${TOWER_LENGTH}` : `Round ${hud.round}`}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-1 flex-col items-end gap-1.5">
                <HealthBar side={hud.p2} align="right" testId="hud-p2-health" />
                {!isTraining && <Pips won={hud.p2Rounds} need={hud.roundsToWin} align="right" />}
              </div>
            </>
          ) : (
            <div className="h-12 flex-1" />
          )}
          {isTraining ? (
            <button
              type="button"
              data-testid="training-reset-button"
              onClick={restart}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge bg-panel text-dust transition-colors duration-200 hover:text-sand"
              aria-label="Reset dummy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="fight-pause-button"
              onClick={() => gameRef.current?.togglePause()}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge bg-panel text-dust transition-colors duration-200 hover:text-sand"
              aria-label="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Arena */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-3 lg:px-8">
        <div className="relative aspect-video max-h-full w-full max-w-[1600px] overflow-hidden rounded-2xl border border-edge shadow-[0_30px_80px_-30px_rgba(232,137,44,0.35)]">
          <canvas
            key={matchKey}
            ref={canvasRef}
            data-testid="fight-canvas"
            className="block h-full w-full"
            onPointerDown={() => press("light")}
          />
          {hud && hud.worm !== "none" && !result && (
            <div
              data-testid="sandworm-warning"
              data-phase={hud.worm}
              className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 animate-pulse rounded-full border border-ember/70 bg-[#1A0E07]/85 px-5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-ember backdrop-blur"
            >
              {hud.worm === "warn" ? "Sandworm rising — jump inside the ring to ride it!" : hud.worm === "ride" ? "Worm rider — trample!" : "Sandworm strike!"}
            </div>
          )}
          {hud?.paused && !result && (
            <div data-testid="pause-overlay" className="absolute inset-0 grid place-items-center">
              <div className="w-72 rounded-2xl border border-edge bg-panel/95 p-6 text-center backdrop-blur-xl">
                <p className="font-heading text-2xl font-black uppercase tracking-[0.2em] text-sand">Paused</p>
                <button
                  type="button"
                  data-testid="pause-resume-button"
                  onClick={() => gameRef.current?.togglePause()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ember py-3 font-bold uppercase tracking-widest text-[#0D0907]"
                >
                  <Play className="h-4 w-4" /> Resume
                </button>
                <Link to={backTarget} data-testid="pause-quit-link" className="mt-2 block rounded-xl border border-edge py-3 text-sm font-semibold uppercase tracking-widest text-dust hover:text-sand">
                  Quit
                </Link>
              </div>
            </div>
          )}
          {result?.kind === "normal" && (
            <MatchResultModal
              won={result.match.won}
              p1Rounds={result.match.p1Rounds}
              p2Rounds={result.match.p2Rounds}
              reward={result.reward}
              fighter={me}
              opponent={opponent}
              level={levelFromXp(progress.xp[me.id] ?? 0)}
              signedIn={auth.signedIn}
              authAvailable={auth.available}
              onRematch={restart}
            />
          )}
          {result?.kind === "tower" && (
            <TowerResultModal
              won={result.match.won}
              rung={result.rung}
              total={TOWER_LENGTH}
              completed={result.completed}
              bonus={result.bonus}
              reward={result.reward}
              fighter={me}
              opponent={opponent}
              onNext={nextRung}
              onRetry={retryTower}
            />
          )}
        </div>
      </div>

      {/* Control tray */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-4 lg:px-8">
        <div className="flex items-stretch gap-3">
          <div className="flex w-56 flex-col justify-center gap-1.5 rounded-xl border border-edge bg-panel px-4 py-2">
            <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.25em]">
              <span className="flex items-center gap-1 text-spice">
                <Sparkles className="h-3 w-3" /> Spice
              </span>
              <span data-testid="hud-p1-meter" className="text-sand">{Math.floor(p1?.meter ?? 0)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-obsidian">
              <div
                className={cn("h-full rounded-full bg-spice transition-[width] duration-150", meterFull && "shadow-[0_0_14px_#2CD4F5]")}
                style={{ width: `${p1?.meter ?? 0}%` }}
              />
            </div>
          </div>
          <PadButton testId="pad-left" label="◀" hint="A" onDown={() => hold("left", true)} onUp={() => hold("left", false)} className="w-14" />
          <PadButton testId="pad-right" label="▶" hint="D" onDown={() => hold("right", true)} onUp={() => hold("right", false)} className="w-14" />
          <PadButton testId="pad-strike" label="Strike" hint="J" onDown={() => press("light")} className="flex-1 border-ember/50" />
          <PadButton testId="pad-heavy" label="Heavy" hint="I" onDown={() => press("heavy")} className="flex-1" />
          <PadButton testId="pad-sweep" label="Sweep" hint="M" onDown={() => press("sweep")} className="flex-1" />
          <PadButton testId="pad-grab" label="Grab" hint="L" onDown={() => press("grab")} className="flex-1" />
          <PadButton testId="pad-parry" label="Parry" hint="K hold" onDown={() => hold("parry", true)} onUp={() => hold("parry", false)} className="flex-1" />
          <PadButton testId="pad-jump" label="Jump" hint="Space" onDown={() => press("jump")} className="flex-1" />
          <PadButton
            testId="pad-ability"
            label={me.ability.name}
            hint="E"
            onDown={() => press("ability")}
            className={cn("flex-[1.4]", abilityReady ? "border-[#C084FC]/60" : "opacity-60")}
          />
          <PadButton
            testId="pad-super"
            label="Super"
            hint="Q"
            onDown={() => press("super")}
            className={cn("flex-1", meterFull ? "border-spice text-spice shadow-[0_0_20px_-4px_#2CD4F5]" : "opacity-60")}
          />
          <PadButton testId="pad-taunt" label="Taunt" hint="T" onDown={() => press("taunt")} className="w-20" />
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-dust/80">
          <Zap className="h-3 w-3 text-ember" />
          {isTraining
            ? "Training — the dummy never dies. Chain combos and watch the damage counter · Esc to pause"
            : "Perfect parry: press K just before a hit · Grabs beat parries · Jump as the sandworm erupts to ride it · Esc to pause"}
        </p>
      </div>
    </div>
  );
}
