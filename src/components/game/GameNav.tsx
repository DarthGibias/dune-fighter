import { Link, NavLink } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";
import { CloudOff, Sparkles, Trophy, Users, Volume2, VolumeX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuthState } from "../../lib/auth";
import { FIGHTERS } from "@/lib/fighters";
import { updateSettings, useProgress, useSettings } from "../../lib/progress";
import { cn } from "../../lib/utils";

const navCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 py-1.5 rounded-md font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-200",
    isActive ? "text-ember bg-accent" : "text-dust hover:text-sand",
  );

export default function GameNav() {
  const auth = useAuthState();
  const progress = useProgress();
  const settings = useSettings();

  return (
    <header
      data-testid="game-nav"
      className="sticky top-0 z-40 border-b border-edge/70 bg-obsidian/75 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-5 lg:px-8">
        <Link to="/" data-testid="nav-brand-link" className="group flex items-center gap-2.5">
          <span className="relative block h-7 w-9">
            <span className="absolute left-0 top-0 h-6 w-6 rounded-full bg-[#FFA834] shadow-[0_0_18px_#FFA834] transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#E8452C] shadow-[0_0_12px_#E8452C] transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
          <span className="font-heading text-lg font-black uppercase tracking-[0.18em] text-sand">Dune Masters</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navCls} data-testid="nav-home-link">Arena</NavLink>
          <NavLink to="/select" className={navCls} data-testid="nav-fighters-link">Fighters</NavLink>
          <NavLink to="/tower" className={navCls} data-testid="nav-tower-link">Tower</NavLink>
          <NavLink to="/armory" className={navCls} data-testid="nav-armory-link">Armory</NavLink>
          <NavLink to="/leaderboard" className={navCls} data-testid="nav-leaderboard-link">Leaderboard</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span data-testid="nav-fighters-badge" className="hidden items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[11px] font-semibold text-sand lg:flex">
            <Users className="h-3.5 w-3.5 text-ember" /> {progress.unlocked.length}/{FIGHTERS.length}
          </span>
          <span data-testid="nav-spice-badge" className="flex items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[11px] font-semibold text-sand">
            <Sparkles className="h-3.5 w-3.5 text-spice" /> {progress.spice.toLocaleString()}
          </span>
          <span data-testid="nav-record-badge" className="hidden items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[11px] font-semibold text-sand sm:flex">
            <Trophy className="h-3.5 w-3.5 text-ember" /> {progress.wins}W · {progress.losses}L
          </span>
          <button
            type="button"
            data-testid="nav-mute-toggle"
            aria-label={settings.muted ? "Unmute" : "Mute"}
            onClick={() => updateSettings({ muted: !settings.muted })}
            className="grid h-8 w-8 place-items-center rounded-full border border-edge bg-panel text-dust transition-colors duration-200 hover:text-sand"
          >
            {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {!auth.available ? (
            <span data-testid="nav-offline-badge" className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-dust">
              <CloudOff className="h-3.5 w-3.5" /> Offline
            </span>
          ) : (
            <>
              <Show when="signed-out">
                <Link to="/sign-in" data-testid="nav-sign-in-button" className={cn(buttonVariants({ size: "sm" }), "font-mono text-[11px] uppercase tracking-widest")}>
                  Sign in
                </Link>
              </Show>
              <Show when="signed-in">
                <span data-testid="nav-user-name" className="hidden font-mono text-[11px] uppercase tracking-widest text-dust lg:block">
                  {auth.name}
                </span>
                <span data-testid="nav-user-button" className="flex">
                  <UserButton />
                </span>
              </Show>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
