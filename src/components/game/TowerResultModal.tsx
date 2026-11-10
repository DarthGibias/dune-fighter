
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Crown, Home, RotateCcw, Sparkles, Skull } from "lucide-react";
import FighterPortrait from "@/components/game/FighterPortrait";
import type { FighterDef } from "@/lib/fighters";
import type { RewardSummary } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface Props {
  won: boolean;
  rung: number;
  total: number;
  completed: boolean;
  bonus: number;
  reward: RewardSummary;
  fighter: FighterDef;
  opponent: FighterDef;
  onNext: () => void;
  onRetry: () => void;
}

export default function TowerResultModal({
  won,
  rung,
  total,
  completed,
  bonus,
  reward,
  fighter,
  opponent,
  onNext,
  onRetry,
}: Props) {
  const navigate = useNavigate();
  const hasNext = won && !completed;
  const title = completed ? "Tower Cleared" : won ? "Rung Cleared" : "You Fell";

  return (
    <div
      data-testid="tower-result-modal"
      className="absolute inset-0 z-20 grid place-items-center bg-[#080504]/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-[min(640px,92%)] overflow-hidden rounded-2xl border border-edge bg-panel shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        <div
          className={cn(
            "relative px-8 pb-5 pt-7",
            completed
              ? "bg-[linear-gradient(135deg,#6B4A0E,#1A120E_70%)]"
              : won
                ? "bg-[linear-gradient(135deg,#5A2A0E,#1A120E_70%)]"
                : "bg-[linear-gradient(135deg,#3A0E12,#1A120E_70%)]"
          )}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-dust">
            Tower · Rung {rung + 1} / {total}
          </p>

          <motion.h2
            data-testid="tower-result-title"
            initial={{ letterSpacing: "0.5em", opacity: 0 }}
            animate={{ letterSpacing: "0.12em", opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={cn(
              "mt-1 flex items-center gap-3 font-heading text-5xl font-black uppercase",
              completed ? "text-[#FFC15E]" : won ? "text-ember" : "text-[#EF4444]"
            )}
          >
            {completed ? <Crown className="h-10 w-10" /> : !won && <Skull className="h-9 w-9" />}
            {title}
          </motion.h2>

          <div className="pointer-events-none absolute -bottom-2 right-6 hidden sm:block">
            <FighterPortrait
              def={won ? fighter : opponent}
              width={120}
              height={140}
              scale={0.58}
              facing={won ? 1 : -1}
            />
          </div>
        </div>

        <div className="grid gap-5 px-8 py-6">
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                data-testid={`tower-pip-${i}`}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-md border font-mono text-xs font-bold",
                  i < rung || (won && i === rung)
                    ? "border-ember bg-accent text-ember"
                    : i === rung
                      ? "border-[#EF4444] bg-[#2A0E0A] text-[#EF4444]"
                      : "border-edge text-dust"
                )}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-spice/40 bg-[#05161E]/70 p-3">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-spice">
                <Sparkles className="h-3 w-3" /> Spice
              </p>
              <p
                data-testid="tower-result-spice"
                className="mt-1 font-mono text-xl font-bold text-spice"
              >
                +{reward.spiceTotal}
              </p>
            </div>

            <div className="rounded-xl border border-edge bg-obsidian/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dust">XP</p>
              <p className="mt-1 font-mono text-xl font-bold text-sand">
                +{reward.xpGained}
              </p>
            </div>

            {bonus > 0 && (
              <div
                data-testid="tower-completion-bonus"
                className="rounded-xl border border-ember/60 bg-accent p-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-ember">
                  Clear bonus
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-ember">
                  +{bonus}
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-dust">
            {completed
              ? "You conquered every rung of the Tower of Arrakis. The dunes are yours."
              : won
                ? `Next rival grows stronger. Rung ${rung + 2} awaits.`
                : `${opponent.short} stopped your climb. Try the tower again from the bottom.`}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {hasNext ? (
              <button
                type="button"
                data-testid="tower-next-button"
                onClick={onNext}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-ember py-3 text-sm font-bold uppercase tracking-widest text-[#0D0907] transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-2"
              >
                Next rung <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="tower-retry-button"
                onClick={onRetry}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-ember py-3 text-sm font-bold uppercase tracking-widest text-[#0D0907] transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-2"
              >
                <RotateCcw className="h-4 w-4" /> {completed ? "Climb again" : "Retry tower"}
              </button>
            )}

            <button
              type="button"
              data-testid="tower-exit-button"
              onClick={() => navigate("/tower")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-edge py-3 text-sm font-semibold uppercase tracking-widest text-sand transition-colors duration-200 hover:border-ember/60"
            >
              <Home className="h-4 w-4" /> Tower
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
