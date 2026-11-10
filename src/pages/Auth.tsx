import { Navigate } from "react-router-dom";
import { Show, SignIn, SignUp } from "@clerk/react";
import GameNav from "@/components/game/GameNav";
import FighterPortrait from "@/components/game/FighterPortrait";
import { useAuthState } from "../lib/auth";
import { fighterById } from "@/lib/fighters";

function AuthShell({ children, mode }: { children: React.ReactNode; mode: "in" | "up" }) {
  return (
    <div className="min-h-screen bg-obsidian">
      <GameNav />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] grid-cols-1 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-end lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#FFA83466_0%,transparent_40%),linear-gradient(180deg,#5A1F10_0%,#9C4424_45%,#0E0A08_100%)]" />
          <div className="absolute bottom-40 left-16">
            <FighterPortrait def={fighterById(mode === "in" ? "stilgar" : "chani")} width={260} height={360} scale={1.3} animate />
          </div>
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#FFC48A]">{mode === "in" ? "Guild terminal" : "Guild registry"}</p>
            <h1 className="mt-2 font-heading text-5xl font-black uppercase tracking-[0.08em] text-sand">
              {mode === "in" ? "Return to the arena" : "Join the championship"}
            </h1>
            <p className="mt-3 max-w-md text-sand/75">
              Your wins, spice and unlocked fighters sync to your account and earn you a place on the leaderboard.
            </p>
          </div>
        </section>
        <section className="flex items-center justify-center px-4 py-10">{children}</section>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <div data-testid="auth-unavailable" className="max-w-sm rounded-2xl border border-edge bg-panel p-6 text-center text-sm text-dust">
      Sign-in is unavailable while offline. You can keep playing as a guest — progress is saved on this device.
    </div>
  );
}

export function SignInPage() {
  const auth = useAuthState();
  return (
    <AuthShell mode="in">
      {auth.available ? (
        <div data-testid="sign-in-form">
          <Show when="signed-out">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
          </Show>
          <Show when="signed-in">
            <Navigate to="/" replace />
          </Show>
        </div>
      ) : (
        <Unavailable />
      )}
    </AuthShell>
  );
}

export function SignUpPage() {
  const auth = useAuthState();
  return (
    <AuthShell mode="up">
      {auth.available ? (
        <div data-testid="sign-up-form">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </div>
      ) : (
        <Unavailable />
      )}
    </AuthShell>
  );
}
