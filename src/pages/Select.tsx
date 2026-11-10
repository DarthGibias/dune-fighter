import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Swords, Zap, Shield, Wind, Heart, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import GameNav from "@/components/game/GameNav";
import FighterPortrait from "@/components/game/FighterPortrait";
import { FIGHTERS, fighterById, isRare, levelBoost, levelFromXp, MAX_LEVEL, type FighterDef } from "@/lib/fighters";
import { buyFighter, skillTier, updateSettings, useProgress, useSettings, winsToNextUnlock } from "../lib/progress";
import { sfx } from "../lib/audio";
import { cn } from "../lib/utils";

const STATS: { key: "health" | "power" | "speed" | "defense"; label: string; max: number; icon: typeof Heart }[] = [
  { key: "health", label: "Health", max: 150, icon: Heart },
  { key: "power", label: "Power", max: 10, icon: Swords },
  { key: "speed", label: "Speed", max: 10, icon: Wind },
  { key: "defense", label: "Defense", max: 10, icon: Shield },
];

function Card({ f, unlocked, selected, level, onPick }: { f: FighterDef; unlocked: boolean; selected: boolean; level: number; onPick: () => void }) {
  return (
    <button
      type="button"
      data-testid={`fighter-card-${f.id}`}
      data-locked={unlocked ? undefined : ""}
      data-selected={selected ? "" : undefined}
      onClick={onPick}
      className={cn(
        "group relative flex h-[168px] flex-col items-center justify-end overflow-hidden rounded-xl border pb-2 transition-[transform,border-color,box-shadow,background-color] duration-200",
        unlocked ? "bg-[#1E140F] hover:-translate-y-1" : "bg-[#140E0B]",
        selected
          ? "border-ember bg-[#2D180B] shadow-[0_0_0_1px_#E8892C,0_12px_40px_-12px_rgba(232,137,44,0.7)]"
          : "border-edge hover:border-ember/50",
      )}
    >
      {unlocked && (
        <span className="absolute left-2 top-2 rounded-md bg-obsidian/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sand">LV {level}</span>
      )}
      {f.rare && (
        <span data-testid={`fighter-card-${f.id}-rare`} className="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-[#F8C630] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#1A0F05]">
          <Crown className="h-2.5 w-2.5" /> Rare
        </span>
      )}
      <FighterPortrait def={f} width={120} height={124} scale={0.5} silhouette={!unlocked && !f.rare} />
      {!unlocked && !f.rare && (
        <span className="absolute top-[42%] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-obsidian/90">
          <Lock className="h-4 w-4 text-sand" />
        </span>
      )}
      <span className={cn("mt-1 font-heading text-sm font-bold", unlocked ? "text-sand" : "text-[#5C4638]")}>
        {unlocked || f.rare ? f.short : "???"}
      </span>
    </button>
  );
}

export default function Select() {
  const navigate = useNavigate();
  const progress = useProgress();
  const settings = useSettings();
  const [viewId, setViewId] = useState(settings.selected);
  const view = fighterById(viewId);
  const viewUnlocked = progress.unlocked.includes(view.id);
  const xp = progress.xp[view.id] ?? 0;
  const next = winsToNextUnlock(progress.wins, progress.unlocked);
  const viewRare = isRare(view.id);
  const showInfo = viewUnlocked || viewRare;
  const lvl = levelFromXp(xp);
  const boost = levelBoost(lvl);

  const buyRare = () => {
    if (buyFighter(view.id)) {
      sfx.click();
      updateSettings({ selected: view.id });
      toast.success(`${view.name} joins your roster!`);
    } else {
      toast.error(`You need ${(view.price ?? 0).toLocaleString()} spice — win matches to earn more.`);
    }
  };

  const fight = () => {
    if (!viewUnlocked) return;
    sfx.click();
    updateSettings({ selected: view.id });
    navigate("/fight");
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ember">Roster</p>
              <h1 data-testid="select-title" className="font-heading text-4xl font-black uppercase tracking-[0.1em] text-sand">Choose your fighter</h1>
            </div>
            <p data-testid="select-unlock-status" className="font-mono text-xs text-dust">
              {progress.unlocked.length}/{FIGHTERS.length} unlocked
              {next !== null && ` · next unlock in ${next} win${next === 1 ? "" : "s"}`} · AI: {skillTier(progress.skill)} ({progress.skill})
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {FIGHTERS.map(({ id }) => {
              const f = fighterById(id);
              const unlocked = progress.unlocked.includes(id);
              return (
                <Card
                  key={id}
                  f={f}
                  unlocked={unlocked}
                  selected={viewId === id}
                  level={levelFromXp(progress.xp[id] ?? 0)}
                  onPick={() => {
                    sfx.click();
                    setViewId(id);
                  }}
                />
              );
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div data-testid="fighter-detail-panel" className="relative overflow-hidden rounded-2xl border border-edge bg-panel">
            <div className="relative h-64 bg-[radial-gradient(circle_at_70%_25%,#FFA83466_0%,transparent_45%),linear-gradient(180deg,#9C4424_0%,#3A1A0C_75%,#1A120E_100%)]">
              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <FighterPortrait def={view} width={240} height={250} scale={1.0} silhouette={!showInfo} animate={showInfo} testId="detail-fighter-portrait" />
              </div>
            </div>
            <div className="p-6">
              <p data-testid="detail-fighter-title" className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-spice">
                {viewUnlocked ? `${view.title} · LV ${lvl}${lvl >= MAX_LEVEL ? " (MAX)" : ""}` : viewRare ? `Rare · ${view.title}` : "Locked"}
              </p>
              <h2 data-testid="detail-fighter-name" className="mt-1 font-heading text-3xl font-black text-sand">
                {showInfo ? view.name : "???"}
              </h2>
              {viewUnlocked ? (
                <div className="mt-3 space-y-1.5 text-sm text-dust">
                  <p data-testid="detail-fighter-ability">
                    <Zap className="mr-1.5 inline h-3.5 w-3.5 text-ember" />
                    <span className="font-semibold text-sand">{view.ability.name}</span> — {view.ability.desc}
                  </p>
                  <p data-testid="detail-fighter-super">
                    <Zap className="mr-1.5 inline h-3.5 w-3.5 text-spice" />
                    Super: <span className="font-semibold text-sand">{view.superName}</span> · {xp} XP
                  </p>
                  <p data-testid="detail-level-bonus" className="font-mono text-[11px] uppercase tracking-widest text-ember">
                    Level bonus: +{Math.round((boost.hp - 1) * 100)}% HP · +{Math.round((boost.dmg - 1) * 100)}% DMG
                  </p>
                </div>
              ) : viewRare ? (
                <div className="mt-3 space-y-3 text-sm text-dust">
                  <p data-testid="detail-rare-hint">
                    <Zap className="mr-1.5 inline h-3.5 w-3.5 text-ember" />
                    <span className="font-semibold text-sand">{view.ability.name}</span> — {view.ability.desc}. Rare fighters can't be won — buy her with spice.
                  </p>
                  <button
                    type="button"
                    data-testid="detail-buy-rare-button"
                    onClick={buyRare}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F8C630] py-3 font-heading text-sm font-black uppercase tracking-[0.2em] text-[#1A0F05] transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" /> Buy · {(view.price ?? 0).toLocaleString()} spice
                  </button>
                  <p data-testid="detail-rare-balance" className="text-center font-mono text-[11px] uppercase tracking-widest">
                    You have {progress.spice.toLocaleString()} spice
                  </p>
                </div>
              ) : (
                <p data-testid="detail-locked-hint" className="mt-3 text-sm text-dust">
                  Locked. Fighters unlock one by one as you win — next unlock in {next ?? 0} win(s).
                </p>
              )}
              <div className="mt-5 space-y-2.5">
                {STATS.map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-20 font-mono text-[11px] font-semibold uppercase tracking-widest text-dust">{s.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-obsidian">
                      <div
                        className="h-full rounded-full bg-ember transition-[width] duration-500"
                        style={{ width: showInfo ? `${(view[s.key] / s.max) * 100}%` : "0%" }}
                      />
                    </div>
                    <span data-testid={`detail-stat-${s.key}`} className="w-8 text-right font-mono text-sm font-bold text-sand">
                      {showInfo ? view[s.key] : "?"}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                data-testid="start-fight-btn"
                disabled={!viewUnlocked}
                onClick={fight}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ember py-4 font-heading text-base font-bold uppercase tracking-[0.22em] text-[#0D0907] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <Swords className="h-5 w-5" /> Fight
              </button>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-dust">
                {settings.mode === "bo3" ? "Best of 3" : "Single round"} · AI {skillTier(progress.skill)}
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
