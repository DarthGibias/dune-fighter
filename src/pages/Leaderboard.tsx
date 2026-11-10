import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown, Sparkles, Trophy } from "lucide-react";
import GameNav from "@/components/game/GameNav";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "../lib/api";
import { useAuthState } from "../lib/auth";
import { fighterById } from "@/lib/fighters";
import { useProgress } from "../lib/progress";
import { cn } from "../lib/utils";

/** Mirrors backend models/progress.py LeaderboardEntry. */
interface LeaderboardEntry {
  rank: number;
  display_name: string;
  wins: number;
  losses: number;
  spice: number;
  win_rate: number;
  best_streak: number;
  highest_combo: number;
  hard_wins: number;
  favorite_fighter: string | null;
  is_me: boolean;
}

type Sort = "wins" | "spice" | "hard";

export default function Leaderboard() {
  const [sort, setSort] = useState<Sort>("wins");
  const auth = useAuthState();
  const progress = useProgress();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", sort, auth.userId],
    queryFn: () => apiGet<LeaderboardEntry[]>(`/leaderboard?sort=${sort}`),
    retry: 1,
  });
  const rows = !isError && data ? data : [];
  const total = progress.wins + progress.losses;

  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ember">Championship</p>
            <h1 data-testid="leaderboard-title" className="font-heading text-4xl font-black uppercase tracking-[0.1em] text-sand">Leaderboard</h1>
          </div>
          <div data-testid="my-record-card" className="rounded-2xl border border-edge bg-panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-dust">{auth.signedIn ? auth.name : "Your record (guest)"}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-2xl font-bold text-sand" data-testid="my-record-wins">{progress.wins}</p>
                <p className="text-xs text-dust">Wins</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-sand">{total ? Math.round((progress.wins / total) * 100) : 0}%</p>
                <p className="text-xs text-dust">Win rate</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-spice">{progress.spice.toLocaleString()}</p>
                <p className="text-xs text-dust">Spice</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-sand">{progress.best_streak}</p>
                <p className="text-xs text-dust">Best streak</p>
              </div>
            </div>
            {!auth.signedIn && (
              <p className="mt-4 text-xs text-dust">
                {auth.available ? (
                  <>
                    <Link to="/sign-up" data-testid="leaderboard-sign-up-link" className="font-semibold text-ember hover:underline">
                      Create an account
                    </Link>{" "}
                    to put your name on the board.
                  </>
                ) : (
                  "Offline — the global board is unavailable right now."
                )}
              </p>
            )}
          </div>
        </aside>

        <section>
          <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <TabsList data-testid="leaderboard-tabs">
              <TabsTrigger value="wins" data-testid="leaderboard-tab-wins">
                <Trophy className="h-3.5 w-3.5" /> Most wins
              </TabsTrigger>
              <TabsTrigger value="spice" data-testid="leaderboard-tab-spice">
                <Sparkles className="h-3.5 w-3.5" /> Spice hoard
              </TabsTrigger>
              <TabsTrigger value="hard" data-testid="leaderboard-tab-hard">
                <Crown className="h-3.5 w-3.5" /> Hard AI slayers
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4 overflow-hidden rounded-2xl border border-edge bg-panel">
            <Table data-testid="leaderboard-table">
              <TableHeader>
                <TableRow className="border-edge hover:bg-transparent">
                  <TableHead className="w-16 font-mono text-[10px] uppercase tracking-widest text-dust">Rank</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-dust">Champion</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-dust">Favorite</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-dust">Wins</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-dust">Win %</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-dust">Spice</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-dust">Hard wins</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-dust">Best combo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={`${r.rank}-${r.display_name}`}
                    data-testid={`leaderboard-row-${r.rank}`}
                    className={cn("border-edge/60", r.is_me && "bg-accent/70 hover:bg-accent")}
                  >
                    <TableCell className="font-mono font-bold">
                      <span className={cn(r.rank === 1 ? "text-[#FFC15E]" : r.rank <= 3 ? "text-ember" : "text-dust")}>#{r.rank}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-sand">
                      {r.display_name}
                      {r.is_me && <span className="ml-2 rounded bg-ember px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#0D0907]">You</span>}
                    </TableCell>
                    <TableCell className="text-dust">{r.favorite_fighter ? fighterById(r.favorite_fighter).short : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sand">{r.wins}</TableCell>
                    <TableCell className="text-right font-mono text-dust">{r.win_rate}%</TableCell>
                    <TableCell className="text-right font-mono text-spice">{r.spice.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-dust">{r.hard_wins}</TableCell>
                    <TableCell className="text-right font-mono text-dust">{r.highest_combo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 && (
              <p data-testid="leaderboard-empty" className="px-6 py-12 text-center text-sm text-dust">
                {isLoading ? "Summoning the champions…" : isError ? "Leaderboard unavailable offline." : "No champions yet — be the first to claim the dunes."}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
