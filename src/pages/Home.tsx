import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Castle, GraduationCap, Keyboard, Shirt, Sparkles, Trophy, Users } from "lucide-react";
import GameNav from "@/components/game/GameNav";
import FighterPortrait from "@/components/game/FighterPortrait";
import { useAuthState } from "../lib/auth";
import { FIGHTERS, fighterById } from "@/lib/fighters";
import { getEquipped, skillTier, updateSettings, useProgress, useSettings, winsToNextUnlock, type MatchMode } from "../lib/progress";
import { resolveSkin } from "../lib/cosmetics";
import { sfx } from "../lib/audio";
import { cn } from "../lib/utils";

const MODES: { v: MatchMode; label: string }[] = [
  { v: "single", label: "Single Round" },
  { v: "bo3", label: "Best of 3" },
];

const KEYS: [string, string][] = [
  ["A / D", "Move"],
  ["Space", "Jump"],
  ["J", "Strike"],
  ["I", "Heavy"],
  ["M", "Sweep"],
  ["L", "Grab"],
  ["K", "Parry (hold)"],
  ["E", "Ability"],
  ["Q", "Super"],
  ["T", "Taunt"],
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
  testPrefix,
}: {
  options: { v: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  testPrefix: string;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-edge bg-obsidian/70 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          data-testid={`${testPrefix}-${o.v}`}
          data-selected={value === o.v ? "" : undefined}
          onClick={() => {
            sfx.click();
            onChange(o.v);
          }}
          className={cn(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200",
            value === o.v
              ? "bg-accent text-sand shadow-[inset_0_0_0_1px_rgba(232,137,44,0.7)]"
              : "text-dust hover:text-sand",
          )}
        >
          {o.label}
          {o.hint && <span className="ml-2 font-mono text-[10px] text-dust/80">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const progress = useProgress();
  const settings = useSettings();
  const auth = useAuthState();
  const next = winsToNextUnlock(progress.wins, progress.unlocked);
  const hero = fighterById(settings.selected);
  const rival = fighterById(hero.id === "feyd" ? "paul" : "feyd");
  const heroSkin = resolveSkin(getEquipped(hero.id));

  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="relative overflow-hidden">
        {/* sunset backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_18%,#FFA83455_0%,transparent_42%),radial-gradient(circle_at_88%_34%,#E8452C44_0%,transparent_22%),linear-gradient(180deg,#5A1F10_0%,#9C4424_38%,#3A1A0C_72%,#0E0A08_100%)]" />
        <div className="pointer-events-none absolute right-[18%] top-[9%] h-40 w-40 rounded-full bg-[#FFF1D0] opacity-90 shadow-[0_0_120px_40px_#FFA83488]" />
        <div className="pointer-events-none absolute right-[9%] top-[27%] h-16 w-16 rounded-full bg-[#FFD8A8] shadow-[0_0_70px_20px_#E8452C88]" />
        <svg className="pointer-events-none absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: "46%" }}>
          <path d="M0 160 C 240 90 420 200 720 150 C 980 105 1200 190 1440 130 L1440 320 L0 320Z" fill="#7A3A1C" opacity="0.75" />
          <path d="M0 220 C 300 170 520 260 860 210 C 1100 175 1300 240 1440 210 L1440 320 L0 320Z" fill="#3E1C0D" />
          <path d="M0 270 C 360 250 700 300 1440 260 L1440 320 L0 320Z" fill="#0E0A08" />
        </svg>
        <div className="grain relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-8">
          {/* left column */}
          <section className="relative z-10 max-w-2xl animate-rise">
            <p data-testid="home-eyebrow" className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-[#FFC48A]">
              Arrakis Fighting Championship
            </p>
            <h1 data-testid="home-title" className="mt-3 font-heading text-6xl font-black uppercase leading-[0.88] tracking-[0.08em] text-sand drop-shadow-[0_6px_30px_rgba(232,137,44,0.45)] sm:text-7xl xl:text-8xl">
              Dune
              <br />
              Masters
            </h1>
            <p className="mt-5 max-w-lg text-base text-sand/80">
              Duel across the dunes with knives, voices and Holtzman shields. Win fights to earn spice, level your
              fighters and unlock all {FIGHTERS.length} champions of Arrakis.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span data-testid="home-fighters-badge" className="flex items-center gap-2 rounded-full border border-edge bg-obsidian/70 px-3.5 py-1.5 font-mono text-xs font-semibold text-sand backdrop-blur">
                <Users className="h-3.5 w-3.5 text-ember" /> {progress.unlocked.length}/{FIGHTERS.length} FIGHTERS
              </span>
              <span data-testid="home-spice-badge" className="flex items-center gap-2 rounded-full border border-edge bg-obsidian/70 px-3.5 py-1.5 font-mono text-xs font-semibold text-sand backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-spice" /> {progress.spice.toLocaleString()} SPICE
              </span>
              <span data-testid="home-record-badge" className="flex items-center gap-2 rounded-full border border-edge bg-obsidian/70 px-3.5 py-1.5 font-mono text-xs font-semibold text-sand backdrop-blur">
                <Trophy className="h-3.5 w-3.5 text-ember" /> {progress.wins}W · {progress.losses}L
              </span>
              {next !== null && (
                <span data-testid="home-next-unlock" className="rounded-full border border-ember/40 bg-accent/60 px-3.5 py-1.5 font-mono text-xs text-[#FFC48A]">
                  Next unlock in {next} win{next === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <button
              type="button"
              data-testid="home-choose-fighter-button"
              onClick={() => {
                sfx.click();
                navigate("/select");
              }}
              className="group mt-8 flex w-full max-w-xl items-center justify-center gap-3 rounded-xl bg-ember px-8 py-5 font-heading text-lg font-bold uppercase tracking-[0.2em] text-[#0D0907] animate-ember-pulse transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Choose your fighter
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <div className="mt-3 grid max-w-xl grid-cols-3 gap-3">
              <button
                type="button"
                data-testid="home-tower-mode-button"
                onClick={() => {
                  sfx.click();
                  navigate("/tower");
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-obsidian/60 px-4 py-3.5 text-sm font-semibold uppercase tracking-widest text-sand backdrop-blur transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-ember/60"
              >
                <Castle className="h-4 w-4 text-ember" /> Tower
              </button>
              <button
                type="button"
                data-testid="home-training-button"
                onClick={() => {
                  sfx.click();
                  navigate("/fight", { state: { mode: "training" } });
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-obsidian/60 px-4 py-3.5 text-sm font-semibold uppercase tracking-widest text-sand backdrop-blur transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-ember/60"
              >
                <GraduationCap className="h-4 w-4 text-ember" /> Training
              </button>
              <button
                type="button"
                data-testid="home-armory-button"
                onClick={() => {
                  sfx.click();
                  navigate("/armory");
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-obsidian/60 px-4 py-3.5 text-sm font-semibold uppercase tracking-widest text-sand backdrop-blur transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-ember/60"
              >
                <Shirt className="h-4 w-4 text-spice" /> Armory
              </button>
            </div>

            <div className="mt-7 grid max-w-xl gap-4">
              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-dust">Mode</p>
                <Segmented options={MODES} value={settings.mode} onChange={(mode) => updateSettings({ mode })} testPrefix="home-mode" />
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-dust">Opponent skill · adapts to you</p>
                <div data-testid="home-skill-meter" data-skill={progress.skill} className="rounded-xl border border-edge bg-obsidian/60 p-3 backdrop-blur">
                  <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
                    <span data-testid="home-skill-tier" className="font-bold text-sand">{skillTier(progress.skill)}</span>
                    <span className="text-dust">{progress.skill}/100 · ×{(1 + progress.skill / 50).toFixed(1)} spice</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2A1A12]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#E8892C] to-[#EF4444] transition-[width] duration-700" style={{ width: `${Math.max(3, progress.skill)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-dust">Win and rivals get sharper; lose and they ease off.</p>
                </div>
              </div>
            </div>

            {!auth.signedIn && (
              <p data-testid="home-guest-note" className="mt-5 max-w-xl text-sm text-dust">
                {auth.available ? (
                  <>
                    Playing as guest — progress stays on this device.{" "}
                    <Link to="/sign-up" data-testid="home-create-account-link" className="font-semibold text-ember underline-offset-4 hover:underline">
                      Create an account
                    </Link>{" "}
                    to save it and join the leaderboard.
                  </>
                ) : (
                  <>Offline mode — matches and unlocks are saved on this device.</>
                )}
              </p>
            )}
          </section>

          {/* right column: clash stage */}
          <section className="relative z-10 hidden h-full min-h-[520px] lg:block" aria-hidden>
            <div className="absolute bottom-[14%] left-[6%]">
              <FighterPortrait def={hero} width={300} height={440} scale={1.55} facing={1} animate testId="home-hero-fighter" cloakColor={heroSkin.cloakColor} bladeColor={heroSkin.bladeColor} />
            </div>
            <div className="absolute bottom-[14%] right-[4%]">
              <FighterPortrait def={rival} width={300} height={440} scale={1.55} facing={-1} animate testId="home-rival-fighter" />
            </div>
            <div className="absolute bottom-[8%] left-1/2 w-[85%] -translate-x-1/2 rounded-2xl border border-edge/70 bg-obsidian/70 p-4 backdrop-blur-xl">
              <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-dust">
                <Keyboard className="h-3.5 w-3.5 text-ember" /> Controls
              </p>
              <div className="grid grid-cols-5 gap-x-3 gap-y-1.5">
                {KEYS.map(([k, label]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px] text-sand/80">
                    <kbd className="rounded border border-edge bg-panel px-1.5 py-0.5 font-mono text-[10px] text-ember">{k}</kbd>
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
