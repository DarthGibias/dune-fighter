import { useState } from "react";
import { Check, Lock, RotateCcw, RotateCw, Shirt, Sparkles, Swords } from "lucide-react";
import { toast } from "sonner";
import GameNav from "@/components/game/GameNav";
import FighterPortrait from "@/components/game/FighterPortrait";
import { fighterById } from "@/lib/fighters";
import { BLADES, CLOAKS, bladeById, cloakById, resolveSkin, type BladeSkin, type CloakSkin } from "../lib/cosmetics";
import { buyCosmetic, equipCosmetic, getEquipped, ownsCosmetic, updateSettings, useProgress, useSettings, type CosmeticSlot } from "../lib/progress";
import { sfx } from "../lib/audio";
import { cn } from "../lib/utils";

interface Fitting {
  fid: string;
  cloak: string;
  blade: string;
}

function SwatchDot({ color, kind }: { color: string; kind: CosmeticSlot }) {
  if (!color) {
    return <span className="grid h-7 w-7 place-items-center rounded-full border border-edge bg-obsidian font-mono text-[9px] text-dust">STD</span>;
  }
  return kind === "cloak" ? (
    <span className="h-7 w-7 rounded-full border border-black/40" style={{ backgroundColor: color }} />
  ) : (
    <span className="grid h-7 w-7 place-items-center rounded-full border border-edge bg-obsidian">
      <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
}

export default function Armory() {
  const progress = useProgress();
  const settings = useSettings();
  const [fid, setFid] = useState(settings.selected);
  const [spin, setSpin] = useState(true);
  const champ = fighterById(fid);
  const equipped = getEquipped(fid);
  const equippedCloak = equipped.cloak ?? "default";
  const equippedBlade = equipped.blade ?? "default";
  const [fitting, setFitting] = useState<Fitting | null>(null);
  // The fitting room resets whenever you switch fighters.
  const fit: Fitting = fitting && fitting.fid === fid ? fitting : { fid, cloak: equippedCloak, blade: equippedBlade };
  const previewSkin = resolveSkin({ cloak: fit.cloak, blade: fit.blade });

  const tryOn = (slot: CosmeticSlot, id: string) => {
    sfx.click();
    setFitting({ ...fit, [slot]: id });
  };
  const resetFitting = () => {
    sfx.click();
    setFitting(null);
  };

  const buy = (slot: CosmeticSlot, item: CloakSkin | BladeSkin) => {
    if (progress.spice < item.cost) {
      toast.error(`Need ${item.cost - progress.spice} more spice`);
      return;
    }
    if (buyCosmetic(item.id, item.cost)) {
      sfx.ability();
      equipCosmetic(fid, slot, item.id);
      toast.success(`${item.name} purchased & equipped`);
    }
  };
  const equip = (slot: CosmeticSlot, item: CloakSkin | BladeSkin) => {
    sfx.click();
    equipCosmetic(fid, slot, item.id);
    toast.success(`${item.name} equipped`);
  };

  const pending: { slot: CosmeticSlot; item: CloakSkin | BladeSkin }[] = [];
  if (fit.cloak !== equippedCloak) pending.push({ slot: "cloak", item: cloakById(fit.cloak) });
  if (fit.blade !== equippedBlade) pending.push({ slot: "blade", item: bladeById(fit.blade) });

  const renderRow = (slot: CosmeticSlot, items: (CloakSkin | BladeSkin)[]) => {
    const current = slot === "cloak" ? equippedCloak : equippedBlade;
    const trying = fit[slot];
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map((item) => {
          const owned = ownsCosmetic(item.id);
          const active = current === item.id;
          const isTrying = trying === item.id && !active;
          const affordable = progress.spice >= item.cost;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`armory-${slot}-${item.id}`}
              data-state={active ? "equipped" : isTrying ? "trying" : owned ? "owned" : "locked"}
              onClick={() => tryOn(slot, item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5",
                active ? "border-ember bg-accent" : isTrying ? "border-spice bg-[#05161E]/80" : "border-edge bg-obsidian/60 hover:border-ember/50",
              )}
            >
              <SwatchDot color={item.color} kind={slot} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold text-sand">{item.name}</p>
                {active ? (
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ember">
                    <Check className="h-3 w-3" /> Equipped
                  </span>
                ) : isTrying ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-spice">Trying on</span>
                ) : owned ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-dust">Owned · try on</span>
                ) : (
                  <span className={cn("flex items-center gap-1 font-mono text-[11px] font-bold", affordable ? "text-spice" : "text-[#EF4444]")}>
                    {affordable ? <Sparkles className="h-3 w-3" /> : <Lock className="h-3 w-3" />} {item.cost}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-edge bg-panel" data-testid="fitting-room">
            <div className="relative h-72 bg-[radial-gradient(circle_at_70%_25%,#FFA83466_0%,transparent_45%),linear-gradient(180deg,#9C4424_0%,#3A1A0C_75%,#1A120E_100%)]">
              <p className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFC48A]">Fitting room</p>
              <div className="absolute right-3 top-3 z-10 flex gap-1.5">
                <button
                  type="button"
                  data-testid="fitting-spin-toggle"
                  aria-pressed={spin}
                  onClick={() => setSpin((s) => !s)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur transition-colors duration-150",
                    spin ? "border-spice/70 bg-[#05161E]/70 text-spice" : "border-edge bg-obsidian/60 text-dust hover:text-sand",
                  )}
                >
                  <RotateCw className={cn("h-3 w-3", spin && "animate-spin [animation-duration:2.5s]")} /> Spin
                </button>
                <button
                  type="button"
                  data-testid="fitting-reset-button"
                  onClick={resetFitting}
                  disabled={pending.length === 0}
                  className="flex items-center gap-1 rounded-full border border-edge bg-obsidian/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-dust backdrop-blur transition-colors duration-150 hover:text-sand disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
              {/* turntable shadow */}
              <div className="absolute bottom-3 left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-black/40 blur-sm" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
                <FighterPortrait
                  def={champ}
                  width={260}
                  height={270}
                  scale={1.08}
                  animate
                  spin={spin}
                  testId="armory-preview-portrait"
                  cloakColor={previewSkin.cloakColor}
                  bladeColor={previewSkin.bladeColor}
                />
              </div>
            </div>
            <div className="p-5">
              <h2 data-testid="armory-fighter-name" className="font-heading text-2xl font-black text-sand">{champ.name}</h2>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-spice/40 bg-[#05161E]/70 px-3 py-2">
                <Sparkles className="h-4 w-4 text-spice" />
                <span data-testid="armory-spice-balance" className="font-mono text-lg font-bold text-spice">{progress.spice.toLocaleString()}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-dust">spice</span>
              </div>

              <div className="mt-4 space-y-2" data-testid="fitting-pending">
                {pending.length === 0 ? (
                  <p className="text-xs text-dust">Tap any cloak or blade to try it on. Nothing is spent until you buy.</p>
                ) : (
                  pending.map(({ slot, item }) => {
                    const owned = ownsCosmetic(item.id);
                    const affordable = progress.spice >= item.cost;
                    return (
                      <div key={slot} className="flex items-center gap-3 rounded-xl border border-spice/40 bg-[#05161E]/60 px-3 py-2.5">
                        <SwatchDot color={item.color} kind={slot} />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-dust">{slot}</p>
                          <p className="truncate text-sm font-semibold text-sand">{item.name}</p>
                        </div>
                        {owned ? (
                          <button
                            type="button"
                            data-testid={`fitting-equip-${slot}`}
                            onClick={() => equip(slot, item)}
                            className="rounded-lg bg-ember px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#0D0907] transition-transform duration-150 hover:-translate-y-0.5"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`fitting-buy-${slot}`}
                            onClick={() => buy(slot, item)}
                            disabled={!affordable}
                            className="flex items-center gap-1 rounded-lg bg-spice px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#04161D] transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-edge disabled:text-dust"
                          >
                            {affordable ? <Sparkles className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Buy · {item.cost}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-widest text-dust">Dress another fighter</p>
              <div className="flex flex-wrap gap-2">
                {progress.unlocked.map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`armory-pick-${id}`}
                    onClick={() => {
                      sfx.click();
                      setFid(id);
                      updateSettings({ selected: id });
                    }}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors duration-150",
                      fid === id ? "border-ember bg-accent text-ember" : "border-edge text-dust hover:text-sand",
                    )}
                  >
                    {fighterById(id).short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ember">Quartermaster</p>
          <h1 data-testid="armory-title" className="font-heading text-4xl font-black uppercase tracking-[0.1em] text-sand">Armory</h1>
          <p className="mt-2 max-w-xl text-sm text-dust">
            Try on cloak colours and blade finishes in the fitting room, then buy the ones you like with spice. Cosmetics are account-wide; equip them per fighter.
          </p>

          <h3 className="mb-3 mt-7 flex items-center gap-2 font-heading text-lg font-bold uppercase tracking-widest text-sand">
            <Shirt className="h-4 w-4 text-ember" /> Cloaks
          </h3>
          {renderRow("cloak", CLOAKS)}

          <h3 className="mb-3 mt-8 flex items-center gap-2 font-heading text-lg font-bold uppercase tracking-widest text-sand">
            <Swords className="h-4 w-4 text-ember" /> Blades
          </h3>
          {renderRow("blade", BLADES)}
        </section>
      </main>
    </div>
  );
}
