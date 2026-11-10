import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth, useUser } from "@clerk/react";
import { dark } from "@clerk/ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPost, setTokenGetter } from "../../lib/api";
import { AuthContext, OFFLINE_AUTH, type AuthState } from "../../lib/auth";
import {
  clearGuestProgress,
  getProgress,
  mergeProgress,
  readGuestProgress,
  replaceProgress,
  switchOwner,
  type Progress,
} from "../../lib/progress";

const appearance = {
  theme: dark,
  captcha: { theme: "dark" as const },
  variables: {
    colorPrimary: "#E8892C",
    colorPrimaryForeground: "#0D0907",
    colorBackground: "#1A120E",
    colorForeground: "#F5EBE1",
    colorInput: "#140E0B",
    colorInputForeground: "#F5EBE1",
    colorBorder: "#3D2A1D",
    fontFamily: "'DM Sans Variable', sans-serif",
    borderRadius: "0.6rem",
  },
};

interface ClerkConfig {
  enabled: boolean;
  publishable_key: string;
  proxy_url: string;
}

/** Pushes the signed-in user's progress to the server (merge) and adopts the result. */
export async function syncProgress(displayName: string | null) {
  const p = getProgress();
  const merged = await apiPost<Progress>("/progress/sync", { ...p, display_name: displayName || p.display_name });
  replaceProgress(merged);
  return merged;
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const qc = useQueryClient();
  const syncedFor = useRef<string | null>(null);
  const name =
    user?.username || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || null;

  useEffect(() => {
    setTokenGetter(isSignedIn ? () => getToken() : null);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId) {
      if (syncedFor.current === userId) return;
      syncedFor.current = userId;
      const guest = readGuestProgress();
      switchOwner(userId);
      const hadGuest = guest.wins + guest.losses > 0;
      if (hadGuest) replaceProgress(mergeProgress(getProgress(), guest));
      syncProgress(name)
        .then(() => {
          if (hadGuest) {
            clearGuestProgress();
            toast.success("Guest progress saved to your account");
          }
          void qc.invalidateQueries({ queryKey: ["leaderboard"] });
        })
        .catch(() => toast.error("Could not reach the server — progress will sync later"));
    } else if (!isSignedIn) {
      syncedFor.current = null;
      switchOwner(null);
    }
  }, [isLoaded, isSignedIn, userId, name, qc]);

  const value: AuthState = { available: true, signedIn: !!isSignedIn, userId: userId ?? null, name };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Starts Clerk from the backend's runtime config. Falls back to guest/offline mode
 *  when the backend is unreachable, so the game always plays. */
export default function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ClerkConfig | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = (await (await fetch("/api/clerk/config")).json()) as ClerkConfig;
        if (cfg.enabled) {
          if (!cancelled) setConfig(cfg);
          return;
        }
      } catch {
        /* backend offline */
      }
      if (cancelled) return;
      if (attempt === 0) setOffline(true);
      if (attempt >= 20) return;
      setTimeout(() => load(attempt + 1), 3000);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config) {
    if (!offline) return null;
    return <AuthContext.Provider value={OFFLINE_AUTH}>{children}</AuthContext.Provider>;
  }
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}
