
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { RotateCcw, Sparkles, Swords, Trophy, Unlock, Home } from "lucide-react";
import FighterPortrait from "@/components/game/FighterPortrait";
import {
  MAX_LEVEL,
  fighterById,
  levelFromXp,
  xpForLevel,
  type FighterDef,
} from "@/lib/fighters";
import { skillTier, type RewardSummary } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface Props {
  won: boolean;
  p1Rounds: number;
  p2Rounds: number;
  reward: RewardSummary;
  fighter: FighterDef;
  opponent: FighterDef;
  level: number;
  signedIn: boolean;
  authAvailable: boolean;
  onRematch: () => void;
}

export default function MatchResultModal({
  won,
  p1Rounds,
  p2Rounds,
  reward,
  fighter,
  opponent,
  level,
  signedIn,
  authAvailable,
  onRematch,
}: Props) {
  const navigate = useNavigate();
  const lvlBefore = levelFromXp(reward.xpBefore);
  const leveledUp = level > lvlBefore;
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  const maxed = level >= MAX_LEVEL;
  const pct = maxed ? 100 : Math.min(100, ((reward.xpAfter - lo) / (hi - lo)) * 100);
  const skillChange = reward.skillAfter - reward.skillBefore;
  const unlock = reward.newUnlock ? fighterById(reward.newUnlock) : null;

  return (
    <div data-testid="match-result-modal" className="absolute inset-0 z-20 grid place-items-center bg-[#080504]/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-[min(680px,92%)] overflow-hidden rounded-2xl border border-edge bg-panel shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        <div className={cn("relative px-8 pb-5 pt-7", won ? "bg-[linear-gradient(135deg,#5A2A0E,#1A120E_70%)]" : "bg-[linear-gradient(135deg,#3A0E12,#1A120E_70%)]")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-dust">
            {fighter.short} vs {opponent.short} · {p1Rounds}–{p2Rounds}
          </p>
          <motion.h2
            data-testid="result-title"
            initial={{ letterSpacing: "0.6em", opacity: 0 }}
            animate={{ letterSpacing: "0.14em", opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={cn("mt-1 font-heading text-6xl font-black uppercase", won ? "text-ember" : "text-[#EF4444]")}
          >
            {won ? "Victory" : "Defeat"}
          </motion.h2>
          <div className="pointer-events-none absolute -bottom-2 right-6 hidden sm:block">
            <FighterPortrait def={won ? fighter : opponent} width={130} height={150} scale={0.62} facing={-1} />
          </div>
        </div>

        <div className="grid gap-5 px-8 py-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-obsidian/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dust">Match</p>
              <p className="mt-1 font-mono text-xl font-bold text-sand">+{reward.spiceBase}</p>
            </div>
            <div className="rounded-xl border border-edge bg-obsidian/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dust">Bonus</p>
              <p className="mt-1 font-mono text-xl font-bold text-sand">+{reward.spiceBonus}</p>
            </div>
            <div className="rounded-xl border border-spice/40 bg-[#05161E]/70 p-3">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-spice">
                <Sparkles className="h-3 w-3" /> Spice
              </p>
              <p data-testid="result-spice-total" className="mt-1 font-mono text-xl font-bold text-spice">+{reward.spiceTotal}</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
              <span className="text-dust">
                <span data-testid="result-level">{fighter.short} · LV {level}{maxed && " (MAX)"}</span>
                {leveledUp && (
                  <span data-testid="result-level-up" className="ml-2 rounded bg-ember px-1.5 py-0.5 text-[10px] font-bold text-[#0D0907]">
                    Level up! +3% HP · +2% DMG
                  </span>
                )}
              </span>
              <span data-testid="result-xp-gained" className="text-sand">{reward.xpGained > 0 ? `+${reward.xpGained} XP` : "XP is earned by winning"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-obsidian">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.3 }} className="h-full rounded-full bg-ember" />
            </div>
            <p data-testid="result-skill-change" className="mt-2 font-mono text-[11px] uppercase tracking-widest text-dust">
              AI rating {reward.skillBefore} → <span className="text-sand">{reward.skillAfter}</span>{" "}
              <span className={skillChange >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"}>({skillChange >= 0 ? "+" : ""}{skillChange})</span> ·{" "}
              {skillTier(reward.skillAfter)} {skillChange >= 0 ? "· opponents get tougher" : "· opponents ease off"}
            </p>
          </div>

          {unlock ? (
            <motion.div
              data-testid="result-new-unlock"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 rounded-xl border border-ember/60 bg-accent p-3"
            >
              <FighterPortrait def={unlock} width={64} height={80} scale={0.34} animate />
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
                  <Unlock className="h-3 w-3" /> New fighter unlocked
                </p>
                <p className="font-heading text-xl font-black text-sand">{unlock.name}</p>
                <p className="text-xs text-dust">{unlock.title}</p>
              </div>
            </motion.div>
          ) : (
            reward.winsToNext !== null && (
              <p data-testid="result-next-unlock" className="font-mono text-xs text-dust">
                Next fighter unlocks in {reward.winsToNext} win{reward.winsToNext === 1 ? "" : "s"}.
              </p>
            )
          )}

          {!signedIn && authAvailable && (
            <p data-testid="result-guest-note" className="rounded-lg border border-edge bg-obsidian/60 px-3 py-2 text-xs text-dust">
              Progress saved on this device only.{" "}
              <Link to="/sign-up" className="font-semibold text-ember hover:underline" data-testid="result-sign-up-link">
                Create an account
              </Link>{" "}
              to keep it and climb the leaderboard.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" data-testid="result-rematch-button" onClick={onRematch} className="flex items-center justify-center gap-1.5 rounded-xl bg-ember py-3 text-sm font-bold uppercase tracking-widest text-[#0D0907] transition-transform duration-200 hover:-translate-y-0.5">
              <RotateCcw className="h-4 w-4" /> Rematch
            </button>
            <button type="button" data-testid="result-choose-fighter-button" onClick={() => navigate("/select")} className="flex items-center justify-center gap-1.5 rounded-xl border border-edge py-3 text-sm font-semibold uppercase tracking-widest text-sand transition-colors duration-200 hover:border-ember/60">
              <Swords className="h-4 w-4" /> Fighters
            </button>
            <button type="button" data-testid="result-leaderboard-button" onClick={() => navigate("/leaderboard")} className="flex items-center justify-center gap-1.5 rounded-xl border border-edge py-3 text-sm font-semibold uppercase tracking-widest text-sand transition-colors duration-200 hover:border-ember/60">
              <Trophy className="h-4 w-4" /> Ranks
            </button>
            <button type="button" data-testid="result-menu-button" onClick={() => navigate("/")} className="flex items-center justify-center gap-1.5 rounded-xl border border-edge py-3 text-sm font-semibold uppercase tracking-widest text-sand transition-colors duration-200 hover:border-ember/60">
              <Home className="h-4 w-4" /> Menu
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
