import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Castle, Check, ChevronRight, Lock, Sparkles, Swords } from "lucide-react";
import GameNav from "@/components/game/GameNav";
import FighterPortrait from "@/components/game/FighterPortrait";
import { fighterById, levelFromXp } from "@/lib/fighters";
import { TOWER_BONUS, TOWER_IDS, TOWER_LENGTH, towerOpponent } from "@/lib/tower";
import { getEquipped, skillTier, updateSettings, useProgress, useSettings } from "../lib/progress";
import { resolveSkin } from "../lib/cosmetics";
import { sfx } from "../lib/audio";
import { cn } from "../lib/utils";

export default function Tower() {
  const navigate = useNavigate();
  const progress = useProgress();
  const settings = useSettings();
  const [picked, setPicked] = useState(settings.selected);
  const champ = fighterById(picked);
  const skin = resolveSkin(getEquipped(champ.id));
  const best = progress.tower_best;
  const fullyCleared = best >= TOWER_LENGTH;

  const begin = () => {
    sfx.click();
    updateSettings({ selected: champ.id });
    navigate("/fight", { state: { mode: "tower", towerRung: 0 } });
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8">
        <section>
          <div className="mb-6">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-ember">
              <Castle className="h-4 w-4" /> Gauntlet
            </p>
            <h1 data-testid="tower-title" className="font-heading text-4xl font-black uppercase tracking-[0.1em] text-sand">Tower of Arrakis</h1>
            <p className="mt-2 max-w-xl text-sm text-dust">
              Climb {TOWER_LENGTH} rivals, each stronger than the last — one life, no breaks. Clear the summit for a
              <span className="font-semibold text-spice"> +{TOWER_BONUS.toLocaleString()} spice</span> bounty.
            </p>
            <p data-testid="tower-progress" className="mt-2 font-mono text-xs text-dust">
              Best climb: {best}/{TOWER_LENGTH} rungs{fullyCleared && " · CONQUERED"}
            </p>
          </div>

          <ol className="space-y-2.5">
            {TOWER_IDS.map((id, i) => {
              const opp = towerOpponent(i);
              const cleared = best > i;
              const isNext = best === i || (fullyCleared && false);
              return (
                <li
                  key={`${id}-${i}`}
                  data-testid={`tower-rung-${i}`}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors duration-200",
                    cleared ? "border-ember/40 bg-accent/40" : isNext ? "border-ember bg-[#2A1810]" : "border-edge bg-panel",
                  )}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md border font-mono text-sm font-bold", cleared ? "border-ember bg-ember text-[#0D0907]" : "border-edge text-dust")}>
                    {cleared ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-obsidian/60">
                    <FighterPortrait def={opp} width={56} height={56} scale={0.24} facing={-1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-base font-bold text-sand">{fighterById(id).name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-dust">
                      HP {opp.health} · PWR {opp.power} · DEF {opp.defense}
                    </p>
                  </div>
                  {i === TOWER_LENGTH - 1 && <span className="rounded-full border border-ember/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ember">Summit</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
            <div className="relative h-56 bg-[radial-gradient(circle_at_70%_25%,#FFA83466_0%,transparent_45%),linear-gradient(180deg,#9C4424_0%,#3A1A0C_75%,#1A120E_100%)]">
              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <FighterPortrait def={champ} width={220} height={230} scale={0.95} animate testId="tower-champion-portrait" cloakColor={skin.cloakColor} bladeColor={skin.bladeColor} />
              </div>
            </div>
            <div className="p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-spice">Your champion · LV {levelFromXp(progress.xp[champ.id] ?? 0)}</p>
              <h2 data-testid="tower-champion-name" className="mt-1 font-heading text-2xl font-black text-sand">{champ.name}</h2>

              <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-widest text-dust">Pick champion</p>
              <div className="flex flex-wrap gap-2">
                {progress.unlocked.map((id) => {
                  const f = fighterById(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`tower-pick-${id}`}
                      onClick={() => {
                        sfx.click();
                        setPicked(id);
                      }}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors duration-150",
                        picked === id ? "border-ember bg-accent text-ember" : "border-edge text-dust hover:text-sand",
                      )}
                    >
                      {f.short}
                    </button>
                  );
                })}
                {progress.unlocked.length === 0 && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-dust">
                    <Lock className="h-3 w-3" /> Win a fight to unlock a champion
                  </span>
                )}
              </div>

              <button
                type="button"
                data-testid="tower-begin-button"
                onClick={begin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ember py-4 font-heading text-base font-bold uppercase tracking-[0.2em] text-[#0D0907] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Swords className="h-5 w-5" /> Begin climb <ChevronRight className="h-4 w-4" />
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-dust">
                <Sparkles className="h-3 w-3 text-spice" /> AI: {skillTier(progress.skill)} · best of 1 per rung
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
