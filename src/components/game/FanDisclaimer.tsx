import { useLocation } from "react-router-dom";
import { Film } from "lucide-react";

const LEGAL =
  "Dune Masters is an unofficial, non-commercial fan-made game. It is not affiliated with, endorsed or sponsored by Legendary Pictures, Warner Bros., the Herbert estate or DC. Dune and Supergirl names and characters belong to their respective owners.";

/** Site-wide fan-made notice; compact corner tag during fights so it never covers the arena. */
export default function FanDisclaimer() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/fight")) {
    return (
      <p
        data-testid="fan-disclaimer-compact"
        title={LEGAL}
        className="pointer-events-none fixed bottom-1.5 right-3 z-30 font-mono text-[10px] uppercase tracking-widest text-sand/45"
      >
        Unofficial fan-made game · Support Dune: Part Three in theaters
      </p>
    );
  }
  return (
    <footer data-testid="fan-disclaimer" className="border-t border-edge bg-[#0B0806] px-5 py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p data-testid="fan-disclaimer-text" className="max-w-3xl text-xs leading-relaxed text-dust">
          <span className="mr-1.5 rounded border border-ember/50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ember">
            Unofficial · Fan-made
          </span>
          {LEGAL}
        </p>
        <p
          data-testid="fan-disclaimer-support"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-spice/40 bg-[#05161E]/70 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-spice"
        >
          <Film className="h-4 w-4" /> Support the films: see Dune: Part Three in theaters
        </p>
      </div>
    </footer>
  );
}
